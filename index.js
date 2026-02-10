document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const linkGrid = document.getElementById('link-grid');
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const openModalBtn = document.getElementById('open-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const saveLinkBtn = document.getElementById('save-link');
    const linkNameInput = document.getElementById('link-name');
    const linkUrlInput = document.getElementById('link-url');
    const timeDisplay = document.getElementById('time');
    const searchInput = document.getElementById('search-input');
    const engineSelector = document.getElementById('engine-selector');
    const currentEngineIcon = document.getElementById('current-engine-icon');
    const engineDropdown = document.getElementById('engine-dropdown');

    // Sidebar Elements
    const sidebar = document.getElementById('sidebar');
    const sidebarOpenBtn = document.getElementById('sidebar-open');
    const sidebarCloseBtn = document.getElementById('sidebar-close');
    const sidebarTabs = document.querySelectorAll('.sidebar-tab');
    const sidebarSections = document.querySelectorAll('.sidebar-section');

    // Engine UI
    const engineNameInput = document.getElementById('engine-name');
    const engineUrlInput = document.getElementById('engine-url');
    const addEngineBtn = document.getElementById('add-engine');
    const cancelEditEngineBtn = document.getElementById('cancel-edit-engine');
    const engineListAdmin = document.getElementById('engine-list-admin');
    const engineIconTypeInputs = document.querySelectorAll('input[name="engine-icon-type"]');
    const engineCustomFileInput = document.getElementById('engine-custom-file-input');
    const engineIconPreview = document.getElementById('engine-icon-preview');

    // Settings Import/Export
    const settingsExportBtn = document.getElementById('settings-export');
    const settingsImportBtn = document.getElementById('settings-import-btn');
    const settingsImportFile = document.getElementById('settings-import-file');

    // Background UI
    const bgUpload = document.getElementById('bg-upload');
    const bgReset = document.getElementById('bg-reset');

    const contextMenu = document.getElementById('context-menu');
    const menuEdit = document.getElementById('menu-edit');
    const menuDelete = document.getElementById('menu-delete');

    // Weather UI
    const weatherDisplay = document.getElementById('weather-display');
    const weatherTemp = document.getElementById('weather-temp');
    const weatherMax = document.getElementById('weather-max');
    const weatherMin = document.getElementById('weather-min');
    const weatherDesc = document.getElementById('weather-desc');
    const weatherIcon = document.getElementById('weather-icon');
    const weatherLocation = document.getElementById('weather-location');
    const weatherLocationInput = document.getElementById('weather-location-input');
    const weatherLocationSearch = document.getElementById('weather-location-search');
    const weatherSearchStatus = document.getElementById('weather-search-status');

    if (weatherDisplay) {
        weatherDisplay.onclick = () => {
            if (selectedCity && selectedCity.name) {
                const query = encodeURIComponent(selectedCity.name);
                window.open(`https://www.msn.com/ja-jp/weather/forecast/in-${query}`, '_blank');
            }
        };
    }

    const iconTypeInputs = document.querySelectorAll('input[name="icon-type"]');
    const customFileInput = document.getElementById('custom-file-input');
    const iconPreview = document.getElementById('icon-preview');
    const maximizeIconCheckbox = document.getElementById('maximize-icon');

    // State
    let userLinks = JSON.parse(localStorage.getItem('userLinks')) || [];
    let searchEngines = JSON.parse(localStorage.getItem('searchEngines')) || [
        { name: 'Google', url: 'https://www.google.com/search?q=%s', iconType: 'favicon', icon: 'https://www.google.com/favicon.ico' },
        { name: 'Bing', url: 'https://www.bing.com/search?q=%s', iconType: 'favicon', icon: 'https://www.bing.com/favicon.ico' },
        { name: 'Yahoo', url: 'https://search.yahoo.co.jp/search?p=%s', iconType: 'favicon', icon: 'https://www.yahoo.co.jp/favicon.ico' },
        { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s', iconType: 'favicon', icon: 'https://duckduckgo.com/favicon.ico' }
    ];
    // Migration for old engine format
    searchEngines = searchEngines.map(e => ({
        ...e,
        iconType: e.iconType || 'favicon'
    }));

    let selectedEngineIndex = parseInt(localStorage.getItem('selectedEngineIndex')) || 0;
    if (selectedEngineIndex >= searchEngines.length) selectedEngineIndex = 0;

    let selectedCity = JSON.parse(localStorage.getItem('weatherCity')) || { name: 'Tokyo', lat: 35.6895, lon: 139.6917 };

    let editIndex = -1;
    let editEngineIndex = -1;
    let customIconData = null;
    let engineCustomIconData = null;

    // Initialization
    async function init() {
        await migrateBackgroundFromLocalStorage();
        await applyBackground();
        renderLinks();
        renderEngineDropdown();
        renderEngineAdminList();
        updateSelectedEngineUI();
        initWeatherSettings();
        updateWeather(); // Initial fetch
        initImportExport();
        updateTime();
        setInterval(updateTime, 1000);
        setInterval(updateWeather, 600000); // 10 mins
        searchInput.focus();
        updateEngineIconOptionsUI();
    }

    // IndexedDB for Background Image storage (to avoid localStorage quota issues)
    const DB_NAME = 'DashboardDB';
    const STORE_NAME = 'settings';
    const BG_IMAGE_KEY = 'backgroundImage';
    let dbInstance = null;

    async function getDB() {
        if (dbInstance) return dbInstance;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            request.onsuccess = (e) => {
                dbInstance = e.target.result;
                resolve(dbInstance);
            };
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async function setDBValue(key, value) {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(value, key);

            transaction.oncomplete = () => resolve();
            transaction.onerror = (e) => reject(e.target.error || transaction.error);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async function getDBValue(key) {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async function deleteDBValue(key) {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(key);
            transaction.oncomplete = () => resolve();
            transaction.onerror = (e) => reject(e.target.error || transaction.error);
        });
    }

    async function migrateBackgroundFromLocalStorage() {
        let oldBg = localStorage.getItem('backgroundImage');
        if (oldBg) {
            console.log('Found background image in localStorage, migrating...');
            try {
                if (typeof oldBg === 'string' && oldBg.startsWith('data:')) {
                    const blob = await dataURLToBlob(oldBg);
                    if (blob) oldBg = blob;
                }
                await setDBValue(BG_IMAGE_KEY, oldBg);
                localStorage.removeItem('backgroundImage');
                console.log('Background image migrated to IndexedDB successfully');
            } catch (err) {
                console.error('Migration failed:', err);
            }
        }
    }

    // Storage
    function saveToStorage() {
        localStorage.setItem('userLinks', JSON.stringify(userLinks));
    }

    function saveEnginesToStorage() {
        localStorage.setItem('searchEngines', JSON.stringify(searchEngines));
        localStorage.setItem('selectedEngineIndex', selectedEngineIndex);
    }

    // Weather Logic
    function initWeatherSettings() {
        if (!weatherLocationSearch) return;

        const performSearch = async () => {
            const query = weatherLocationInput.value.trim();
            if (!query) return;

            weatherSearchStatus.textContent = '検索中...';
            weatherSearchStatus.style.color = 'white';

            try {
                const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
                const data = await response.json();

                if (data.results && data.results.length > 0) {
                    const res = data.results[0];
                    selectedCity = {
                        name: res.name,
                        lat: res.latitude,
                        lon: res.longitude
                    };
                    localStorage.setItem('weatherCity', JSON.stringify(selectedCity));
                    weatherSearchStatus.textContent = `完了: ${res.name} (${res.country || ''})`;
                    weatherSearchStatus.style.color = '#34a853';
                    updateWeather();
                } else {
                    weatherSearchStatus.textContent = '都市が見つかりませんでした。';
                    weatherSearchStatus.style.color = '#ff5555';
                }
            } catch (error) {
                console.error('Geocoding error:', error);
                weatherSearchStatus.textContent = 'エラーが発生しました。';
                weatherSearchStatus.style.color = '#ff5555';
            }
        };

        weatherLocationSearch.onclick = performSearch;
        weatherLocationInput.onkeydown = (e) => {
            if (e.key === 'Enter') performSearch();
        };
    }

    // Helpers to convert between Blob and Base64
    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async function dataURLToBlob(dataURL) {
        try {
            const res = await fetch(dataURL);
            return await res.blob();
        } catch (e) {
            console.error('Failed to convert dataURL to blob', e);
            return null;
        }
    }

    // Import/Export Logic
    function initImportExport() {
        if (settingsExportBtn) {
            settingsExportBtn.onclick = async () => {
                let bgImage = await getDBValue(BG_IMAGE_KEY);
                if (bgImage instanceof Blob) {
                    try {
                        bgImage = await blobToBase64(bgImage);
                    } catch (e) {
                        console.error('Failed to convert blob to base64 for export', e);
                        bgImage = null;
                    }
                }

                const settings = {
                    userLinks: userLinks,
                    searchEngines: searchEngines,
                    selectedEngineIndex: selectedEngineIndex,
                    backgroundImage: bgImage,
                    weatherCity: JSON.parse(localStorage.getItem('weatherCity'))
                };
                const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dashboard-settings-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
            };
        }

        if (settingsImportBtn && settingsImportFile) {
            settingsImportBtn.onclick = () => settingsImportFile.click();
            settingsImportFile.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const settings = JSON.parse(event.target.result);
                        if (confirm('設定を上書きインポートしますか？現在の設定は失われます。')) {
                            if (settings.userLinks) {
                                userLinks = settings.userLinks;
                                saveToStorage();
                            }
                            if (settings.searchEngines) {
                                searchEngines = settings.searchEngines;
                            }
                            if (settings.selectedEngineIndex !== undefined) {
                                selectedEngineIndex = settings.selectedEngineIndex;
                            }
                            saveEnginesToStorage();

                            if (settings.backgroundImage) {
                                let bgData = settings.backgroundImage;
                                if (typeof bgData === 'string' && bgData.startsWith('data:')) {
                                    const blob = await dataURLToBlob(bgData);
                                    if (blob) bgData = blob;
                                }
                                await setDBValue(BG_IMAGE_KEY, bgData);
                                localStorage.removeItem('backgroundImage'); // Ensure old storage is cleared
                            } else {
                                await deleteDBValue(BG_IMAGE_KEY);
                            }

                            if (settings.weatherCity) {
                                selectedCity = settings.weatherCity;
                                localStorage.setItem('weatherCity', JSON.stringify(selectedCity));
                            }

                            // Re-initialize app to apply changes
                            init();
                            alert('設定をインポートしました。');
                        }
                    } catch (err) {
                        console.error('Import error:', err);
                        alert('インポートに失敗しました。ファイル形式が正しくありません。');
                    }
                    settingsImportFile.value = ''; // Reset input
                };
                reader.readAsText(file);
            };
        }
    }

    async function updateWeather() {
        try {
            if (weatherLocation) weatherLocation.textContent = selectedCity.name;
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${selectedCity.lat}&longitude=${selectedCity.lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
            const data = await response.json();
            const current = data.current;
            const daily = data.daily;

            if (weatherTemp) weatherTemp.textContent = `${Math.round(current.temperature_2m)}°C`;
            if (weatherMax) weatherMax.textContent = `${Math.round(daily.temperature_2m_max[0])}°`;
            if (weatherMin) weatherMin.textContent = `${Math.round(daily.temperature_2m_min[0])}°`;

            const weatherInfo = mapWeatherCode(current.weather_code);
            if (weatherDesc) weatherDesc.textContent = weatherInfo.text;
            if (weatherIcon) weatherIcon.textContent = weatherInfo.icon;
        } catch (error) {
            console.error('Weather fetch error:', error);
            if (weatherDesc) weatherDesc.textContent = '取得エラー';
        }
    }

    function mapWeatherCode(code) {
        const mapping = {
            0: { text: '快晴', icon: '☀️' },
            1: { text: '晴れ', icon: '☀️' },
            2: { text: '薄曇り', icon: '⛅' },
            3: { text: '曇り', icon: '☁️' },
            45: { text: '霧', icon: '🌫️' },
            48: { text: '霧', icon: '🌫️' },
            51: { text: '小雨', icon: '🌦️' },
            53: { text: '小雨', icon: '🌦️' },
            54: { text: '小雨', icon: '🌦️' },
            55: { text: '小雨', icon: '🌦️' },
            61: { text: '雨', icon: '🌧️' },
            63: { text: '雨', icon: '🌧️' },
            65: { text: '激しい雨', icon: '🌧️' },
            71: { text: '雪', icon: '❄️' },
            73: { text: '雪', icon: '❄️' },
            75: { text: '激しい雪', icon: '❄️' },
            95: { text: '雷雨', icon: '⛈️' }
        };
        return mapping[code] || { text: '不明', icon: '❓' };
    }

    async function updateDynamicColors(input) {
        let url = input;

        // If no input, try to get from DB
        if (!url) {
            const data = await getDBValue(BG_IMAGE_KEY);
            if (!data) {
                document.body.classList.remove('light-bg');
                return;
            }
            if (data instanceof Blob) {
                url = URL.createObjectURL(data);
                // Note: This temporary URL is not managed by applyBackground, 
                // but that's okay for a single load.
            } else {
                url = data;
            }
        }

        const img = new Image();
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 100;
            canvas.height = 100;
            ctx.drawImage(img, 0, 0, 100, 100);

            const imageData = ctx.getImageData(0, 0, 100, 100);
            const data = imageData.data;
            let r = 0, g = 0, b = 0;

            for (let i = 0; i < data.length; i += 4) {
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
            }

            const count = data.length / 4;
            r = r / count;
            g = g / count;
            b = b / count;

            // Relative luminance calculation
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;

            if (brightness > 180) { // Threshold for light background
                document.body.classList.add('light-bg');
            } else {
                document.body.classList.remove('light-bg');
            }

            // Clean up if we created a temporary URL
            if (input !== url && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        };

        // Handle gradient fallback for color updating if no image
        if (!url) {
            // Gradient is generally dark-ish, so remove light-bg
            document.body.classList.remove('light-bg');
        }
    }

    let currentBgObjectURL = null;

    async function applyBackground() {
        try {
            const data = await getDBValue(BG_IMAGE_KEY);

            // Clean up old object URL if any
            if (currentBgObjectURL) {
                URL.revokeObjectURL(currentBgObjectURL);
                currentBgObjectURL = null;
            }

            if (data) {
                let url;
                if (data instanceof Blob) {
                    currentBgObjectURL = URL.createObjectURL(data);
                    url = currentBgObjectURL;
                } else {
                    // Legacy base64 string
                    url = data;
                }

                document.body.style.setProperty('--bg-image', `url("${url}")`);
                updateDynamicColors(url);
            } else {
                // FALLBACK: Use gradient if no image is set
                document.body.style.setProperty('--bg-image', 'var(--bg-gradient)');
                updateDynamicColors(null);
            }
        } catch (err) {
            console.error('Error applying background:', err);
        }
    }

    bgUpload.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            console.log(`Uploading background: ${file.name} (${file.size} bytes)`);
            try {
                // Save the File (Blob) directly to IndexedDB - MUCH more efficient for large images
                await setDBValue(BG_IMAGE_KEY, file);
                console.log('Background image saved as Blob in IndexedDB');
                await applyBackground();
            } catch (err) {
                console.error('Failed to save image to IndexedDB:', err);
                alert('画像の保存に失敗しました。：' + (err.message || '不明なエラー'));
            }
        }
    };

    bgReset.onclick = async () => {
        if (confirm('背景をリセットしてデフォルトに戻しますか？')) {
            await deleteDBValue(BG_IMAGE_KEY);
            applyBackground();
            bgUpload.value = '';
        }
    };

    // Time
    function updateTime() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        timeDisplay.textContent = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
    }

    // Sidebar Logic
    sidebarOpenBtn.onclick = () => {
        switchSidebarTab('general'); // Default tab when opening
        sidebar.classList.add('open');
    };

    sidebarCloseBtn.onclick = () => sidebar.classList.remove('open');

    function switchSidebarTab(tabName) {
        sidebarTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        sidebarSections.forEach(section => {
            section.classList.toggle('active', section.id === `section-${tabName}`);
        });
    }

    sidebarTabs.forEach(tab => {
        tab.onclick = () => switchSidebarTab(tab.dataset.tab);
    });

    // Search Engines
    function updateSelectedEngineUI() {
        const engine = searchEngines[selectedEngineIndex];
        const iconHtml = getEngineIconHtml(engine);
        engineSelector.innerHTML = iconHtml;
        searchInput.placeholder = `${engine.name} で検索...`;
    }

    function getEngineIconHtml(engine) {
        if (engine.iconType === 'custom' && engine.customIcon) {
            return `<img src="${engine.customIcon}" alt="${engine.name}">`;
        } else if (engine.iconType === 'favicon') {
            return `<img src="${engine.icon}" alt="${engine.name}">`;
        } else {
            return `<div class="engine-icon-circle"><span class="initial">${engine.name.charAt(0).toUpperCase()}</span></div>`;
        }
    }

    function renderEngineDropdown() {
        engineDropdown.innerHTML = '';
        const totalItems = searchEngines.length + 1; // +1 for the Add button
        let columns = 3; // Default

        if (totalItems <= 8) {
            columns = totalItems;
        } else if (totalItems <= 16) {
            columns = 8;
        } else {
            columns = Math.ceil(totalItems / 2);
        }

        engineDropdown.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
        // Force a wider min-width based on columns to ensure items don't squash too much
        engineDropdown.style.width = 'max-content';
        engineDropdown.style.maxWidth = '90vw';

        searchEngines.forEach((engine, index) => {
            const div = document.createElement('div');
            div.className = 'engine-item';
            const iconHtml = getEngineIconHtml(engine);
            div.innerHTML = `${iconHtml}<span>${engine.name}</span>`;
            div.onclick = () => {
                selectedEngineIndex = index;
                saveEnginesToStorage();
                updateSelectedEngineUI();
                engineDropdown.style.display = 'none';
            };
            engineDropdown.appendChild(div);
        });

        // Add "Add Engine" shortcut
        const addDiv = document.createElement('div');
        addDiv.className = 'engine-item add-engine-shortcut';
        addDiv.innerHTML = `
            <div class="engine-icon-circle">
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
                </svg>
            </div>
            <span>追加</span>
        `;
        addDiv.onclick = (e) => {
            e.stopPropagation();
            switchSidebarTab('engines');
            sidebar.classList.add('open');
            engineDropdown.style.display = 'none';
        };
        engineDropdown.appendChild(addDiv);
    }

    function renderEngineAdminList() {
        engineListAdmin.innerHTML = '';
        searchEngines.forEach((engine, index) => {
            const div = document.createElement('div');
            div.className = 'engine-list-item';
            div.dataset.engineIndex = index;

            const iconHtml = getEngineIconHtml(engine);
            div.innerHTML = `
                <div class="drag-handle" draggable="true" title="ドラッグして並び替え">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="9" cy="5" r="1" fill="currentColor"/>
                        <circle cx="9" cy="12" r="1" fill="currentColor"/>
                        <circle cx="9" cy="19" r="1" fill="currentColor"/>
                        <circle cx="15" cy="5" r="1" fill="currentColor"/>
                        <circle cx="15" cy="12" r="1" fill="currentColor"/>
                        <circle cx="15" cy="19" r="1" fill="currentColor"/>
                    </svg>
                </div>
                ${iconHtml}
                <div class="engine-info">
                    <strong>${engine.name}</strong>
                    <span style="font-size: 0.6rem; opacity: 0.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${engine.url}</span>
                </div>
                <div class="edit-engine" title="編集">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </div>
                ${searchEngines.length > 1 ? `<div class="delete-engine" title="削除">×</div>` : ''}
            `;

            if (index === editEngineIndex) {
                div.classList.add('editing');
            }

            // Add drag and drop event listeners to the handle
            const handle = div.querySelector('.drag-handle');
            handle.addEventListener('dragstart', (e) => {
                // Pass the index from the parent div
                handleEngineListDragStart.call(div, e);
            });

            div.addEventListener('dragover', handleEngineListDragOver);
            div.addEventListener('drop', handleEngineListDrop);
            div.addEventListener('dragend', handleEngineListDragEnd);

            const editBtn = div.querySelector('.edit-engine');
            editBtn.onclick = (e) => {
                e.stopPropagation();
                editEngineIndex = index;
                engineNameInput.value = engine.name;
                engineUrlInput.value = engine.url;
                const typeEl = document.querySelector(`input[name="engine-icon-type"][value="${engine.iconType || 'favicon'}"]`);
                if (typeEl) typeEl.checked = true;
                engineCustomIconData = engine.customIcon || null;
                updateEngineIconOptionsUI();
                addEngineBtn.textContent = '検索エンジンを更新';
                cancelEditEngineBtn.style.display = 'block';
                renderEngineAdminList();
            };

            const delBtn = div.querySelector('.delete-engine');
            if (delBtn) {
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm(`「${engine.name}」を削除しますか？`)) {
                        searchEngines.splice(index, 1);
                        if (selectedEngineIndex >= index && selectedEngineIndex > 0) {
                            selectedEngineIndex--;
                        }
                        if (editEngineIndex === index) {
                            resetEngineForm();
                        } else if (editEngineIndex > index) {
                            editEngineIndex--;
                        }
                        saveEnginesToStorage();
                        renderEngineAdminList();
                        renderEngineDropdown();
                        updateSelectedEngineUI();
                    }
                };
            }
            engineListAdmin.appendChild(div);
        });
    }

    function resetEngineForm() {
        editEngineIndex = -1;
        engineNameInput.value = '';
        engineUrlInput.value = '';
        const faviconRadio = document.querySelector('input[name="engine-icon-type"][value="favicon"]');
        if (faviconRadio) faviconRadio.checked = true;
        engineCustomIconData = null;
        updateEngineIconOptionsUI();
        addEngineBtn.textContent = '検索エンジンを追加';
        cancelEditEngineBtn.style.display = 'none';
        renderEngineAdminList();
    }

    cancelEditEngineBtn.onclick = resetEngineForm;

    function updateEngineIconOptionsUI() {
        const typeEl = document.querySelector('input[name="engine-icon-type"]:checked');
        if (!typeEl) return;
        const selectedType = typeEl.value;
        engineCustomFileInput.style.display = (selectedType === 'custom') ? 'block' : 'none';
        engineIconPreview.innerHTML = '';
        if (selectedType === 'custom' && engineCustomIconData) {
            engineIconPreview.innerHTML = `<img src="${engineCustomIconData}">`;
        } else if (selectedType === 'favicon' && engineUrlInput.value.trim()) {
            let url = engineUrlInput.value.trim();
            const domain = extractDomain(url);
            const favUrl = domain ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}` : null;
            if (favUrl) engineIconPreview.innerHTML = `<img src="${favUrl}">`;
        } else if (selectedType === 'initial' && engineNameInput.value.trim()) {
            engineIconPreview.innerHTML = `<div class=\"engine-icon-circle\" style=\"width:60px; height:60px; border-radius:10px;\"><span style=\"font-size:2rem; font-weight:bold;\">${engineNameInput.value.trim().charAt(0).toUpperCase()}</span></div>`;
        }
    }

    function extractDomain(url) {
        try {
            if (!url.startsWith('http')) url = 'https://' + url;
            return new URL(url).hostname;
        } catch (e) { return null; }
    }

    engineIconTypeInputs.forEach(input => input.onchange = updateEngineIconOptionsUI);
    engineNameInput.oninput = updateEngineIconOptionsUI;
    engineUrlInput.oninput = updateEngineIconOptionsUI;

    engineCustomFileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                engineCustomIconData = event.target.result;
                updateEngineIconOptionsUI();
            };
            reader.readAsDataURL(file);
        }
    };

    engineSelector.onclick = (e) => {
        e.stopPropagation();
        engineDropdown.style.display = engineDropdown.style.display === 'grid' ? 'none' : 'grid';
    };

    document.addEventListener('click', (e) => {
        engineDropdown.style.display = 'none';
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            sidebar.classList.remove('open');
        }
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                const engine = searchEngines[selectedEngineIndex];
                window.location.href = engine.url.replace('%s', encodeURIComponent(query));
            }
        }
    });

    addEngineBtn.onclick = () => {
        const name = engineNameInput.value.trim();
        const url = engineUrlInput.value.trim();
        const typeEl = document.querySelector('input[name="engine-icon-type"]:checked');
        if (!typeEl) return;
        const iconType = typeEl.value;

        if (name && url && url.includes('%s')) {
            const domain = extractDomain(url);
            const icon = domain ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}` : '';
            const engineData = {
                name,
                url,
                iconType,
                icon,
                customIcon: (iconType === 'custom') ? engineCustomIconData : null
            };

            if (editEngineIndex > -1) {
                searchEngines[editEngineIndex] = engineData;
                resetEngineForm();
            } else {
                searchEngines.push(engineData);
                resetEngineForm();
            }
            saveEnginesToStorage();
            renderEngineAdminList();
            renderEngineDropdown();
            updateSelectedEngineUI();
        } else {
            alert('有効な名前と、%sを含むURLを入力してください。');
        }
    };

    // Links Rendering
    function getFaviconUrl(url) {
        try {
            const domain = new URL(url).hostname;
            return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
        } catch (e) { return null; }
    }

    function renderLinks() {
        const cards = document.querySelectorAll('.icon-card:not(.add-btn)');
        cards.forEach(card => card.remove());

        userLinks.forEach((link, index) => {
            const a = document.createElement('a');
            a.href = link.url;
            a.className = 'icon-card';
            a.draggable = true;
            a.dataset.index = index;

            let iconContent = '';
            if (link.iconType === 'custom' && link.customIcon) {
                iconContent = `<img src="${link.customIcon}" alt="${link.name}">`;
            } else if (link.iconType === 'favicon') {
                const favUrl = getFaviconUrl(link.url);
                iconContent = `<img src="${favUrl}" alt="${link.name}">`;
            } else {
                iconContent = `<span class="initial">${link.name.charAt(0).toUpperCase()}</span>`;
            }

            a.innerHTML = `<div class="icon-circle ${link.maximizeIcon ? 'maximize' : ''}">${iconContent}</div><span class="label">${link.name}</span>`;

            a.addEventListener('dragstart', handleDragStart);
            a.addEventListener('dragover', handleDragOver);
            a.addEventListener('drop', handleDrop);
            a.addEventListener('dragend', handleDragEnd);
            a.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showContextMenu(e.pageX, e.pageY, index);
            });

            linkGrid.insertBefore(a, openModalBtn);
        });
    }

    // Context Menu
    let selectedMenuIndex = -1;
    function showContextMenu(x, y, index) {
        selectedMenuIndex = index;
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
    }
    function hideContextMenu() {
        contextMenu.style.display = 'none';
        selectedMenuIndex = -1;
    }
    document.addEventListener('click', hideContextMenu);
    menuEdit.onclick = () => { if (selectedMenuIndex > -1) openEditModal(selectedMenuIndex); };
    menuDelete.onclick = () => {
        if (selectedMenuIndex > -1 && confirm('このリンクを削除しますか？')) {
            userLinks.splice(selectedMenuIndex, 1);
            saveToStorage();
            renderLinks();
        }
    };

    // Modal Logic
    function openEditModal(index) {
        editIndex = index;
        const link = userLinks[index];
        modalTitle.textContent = 'リンクを編集';
        linkNameInput.value = link.name;
        linkUrlInput.value = link.url;
        const typeEl = document.querySelector(`input[name="icon-type"][value="${link.iconType || 'initial'}"]`);
        if (typeEl) typeEl.checked = true;
        customIconData = link.customIcon || null;
        maximizeIconCheckbox.checked = !!link.maximizeIcon;
        updateIconOptionsUI();
        modal.style.display = 'flex';
    }

    openModalBtn.onclick = () => {
        editIndex = -1;
        modalTitle.textContent = 'リンクを追加';
        linkNameInput.value = '';
        linkUrlInput.value = '';
        const initialRadio = document.querySelector('input[name="icon-type"][value="initial"]');
        if (initialRadio) initialRadio.checked = true;
        customIconData = null;
        maximizeIconCheckbox.checked = false;
        updateIconOptionsUI();
        modal.style.display = 'flex';
    };

    closeModalBtn.onclick = () => { modal.style.display = 'none'; };

    function updateIconOptionsUI() {
        const typeEl = document.querySelector('input[name="icon-type"]:checked');
        if (!typeEl) return;
        const selectedType = typeEl.value;
        customFileInput.style.display = (selectedType === 'custom') ? 'block' : 'none';
        iconPreview.innerHTML = '';
        if (selectedType === 'custom' && customIconData) {
            iconPreview.innerHTML = `<img src="${customIconData}">`;
        } else if (selectedType === 'favicon' && linkUrlInput.value.trim()) {
            let url = linkUrlInput.value.trim();
            if (!url.startsWith('http')) url = 'https://' + url;
            const favUrl = getFaviconUrl(url);
            if (favUrl) iconPreview.innerHTML = `<img src="${favUrl}">`;
        } else if (selectedType === 'initial' && linkNameInput.value.trim()) {
            iconPreview.innerHTML = `<span style="font-size:2rem;">${linkNameInput.value.trim().charAt(0).toUpperCase()}</span>`;
        }

        if (maximizeIconCheckbox.checked) {
            iconPreview.classList.add('maximize');
        } else {
            iconPreview.classList.remove('maximize');
        }
    }

    iconTypeInputs.forEach(input => input.onchange = updateIconOptionsUI);
    maximizeIconCheckbox.onchange = updateIconOptionsUI;
    linkNameInput.oninput = updateIconOptionsUI;
    linkUrlInput.oninput = updateIconOptionsUI;

    customFileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                customIconData = event.target.result;
                updateIconOptionsUI();
            };
            reader.readAsDataURL(file);
        }
    };

    saveLinkBtn.onclick = () => {
        const name = linkNameInput.value.trim();
        let url = linkUrlInput.value.trim();
        const typeEl = document.querySelector('input[name="icon-type"]:checked');
        if (!typeEl) return;
        const iconType = typeEl.value;
        if (name && url) {
            if (!url.startsWith('http')) url = 'https://' + url;
            const linkData = { name, url, iconType, customIcon: (iconType === 'custom') ? customIconData : null, maximizeIcon: maximizeIconCheckbox.checked };
            if (editIndex > -1) userLinks[editIndex] = linkData;
            else userLinks.push(linkData);
            saveToStorage();
            renderLinks();
            modal.style.display = 'none';
        }
    };

    // Drag and Drop (Links)
    let draggedItem = null;
    function handleDragStart(e) {
        draggedItem = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.index);
    }
    function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; return false; }
    function handleDrop(e) {
        e.stopPropagation();
        const sIdx = parseInt(e.dataTransfer.getData('text/plain'));
        const tIdx = parseInt(this.dataset.index);
        if (sIdx !== tIdx) {
            const moved = userLinks.splice(sIdx, 1)[0];
            userLinks.splice(tIdx, 0, moved);
            saveToStorage();
            renderLinks();
        }
        return false;
    }
    function handleDragEnd() { this.classList.remove('dragging'); }

    // Drag and Drop (Search Engines)
    let draggedEngine = null;
    function handleEngineListDragStart(e) {
        draggedEngine = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.engineIndex);
    }
    function handleEngineListDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; return false; }
    function handleEngineListDrop(e) {
        e.stopPropagation();
        const sIdx = parseInt(e.dataTransfer.getData('text/plain'));
        const tIdx = parseInt(this.dataset.engineIndex);
        if (sIdx !== tIdx) {
            const moved = searchEngines.splice(sIdx, 1)[0];
            searchEngines.splice(tIdx, 0, moved);

            // Update selectedEngineIndex if needed
            if (selectedEngineIndex === sIdx) {
                selectedEngineIndex = tIdx;
            } else if (sIdx < selectedEngineIndex && tIdx >= selectedEngineIndex) {
                selectedEngineIndex--;
            } else if (sIdx > selectedEngineIndex && tIdx <= selectedEngineIndex) {
                selectedEngineIndex++;
            }

            // Update editEngineIndex if needed
            if (editEngineIndex === sIdx) {
                editEngineIndex = tIdx;
            } else if (sIdx < editEngineIndex && tIdx >= editEngineIndex) {
                editEngineIndex--;
            } else if (sIdx > editEngineIndex && tIdx <= editEngineIndex) {
                editEngineIndex++;
            }

            saveEnginesToStorage();
            renderEngineAdminList();
            renderEngineDropdown();
            updateSelectedEngineUI();
        }
        return false;
    }
    function handleEngineListDragEnd() { this.classList.remove('dragging'); }

    window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };

    init();
});
