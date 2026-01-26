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
    const engineListAdmin = document.getElementById('engine-list-admin');

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

    // State
    let userLinks = JSON.parse(localStorage.getItem('userLinks')) || [];
    let searchEngines = JSON.parse(localStorage.getItem('searchEngines')) || [
        { name: 'Google', url: 'https://www.google.com/search?q=%s', icon: 'https://www.google.com/favicon.ico' },
        { name: 'Bing', url: 'https://www.bing.com/search?q=%s', icon: 'https://www.bing.com/favicon.ico' },
        { name: 'Yahoo', url: 'https://search.yahoo.co.jp/search?p=%s', icon: 'https://www.yahoo.co.jp/favicon.ico' },
        { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s', icon: 'https://duckduckgo.com/favicon.ico' }
    ];
    let selectedEngineIndex = parseInt(localStorage.getItem('selectedEngineIndex')) || 0;
    if (selectedEngineIndex >= searchEngines.length) selectedEngineIndex = 0;

    let selectedCity = JSON.parse(localStorage.getItem('weatherCity')) || { name: '東京', lat: 35.6895, lon: 139.6917 };

    let editIndex = -1;
    let customIconData = null;

    // Initialization
    function init() {
        applyBackground();
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

    // Import/Export Logic
    function initImportExport() {
        if (settingsExportBtn) {
            settingsExportBtn.onclick = () => {
                const settings = {
                    userLinks: userLinks,
                    searchEngines: searchEngines,
                    selectedEngineIndex: selectedEngineIndex,
                    backgroundImage: localStorage.getItem('backgroundImage'),
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
                reader.onload = (event) => {
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
                                localStorage.setItem('backgroundImage', settings.backgroundImage);
                            } else {
                                localStorage.removeItem('backgroundImage');
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

    // Background Logic
    function applyBackground() {
        const savedBg = localStorage.getItem('backgroundImage');
        if (savedBg) {
            document.body.style.setProperty('--bg-image', `url(${savedBg})`);
        } else {
            document.body.style.removeProperty('--bg-image');
        }
    }

    bgUpload.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                localStorage.setItem('backgroundImage', event.target.result);
                applyBackground();
            };
            reader.readAsDataURL(file);
        }
    };

    bgReset.onclick = () => {
        if (confirm('背景をリセットしてデフォルトに戻しますか？')) {
            localStorage.removeItem('backgroundImage');
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
        switchSidebarTab('engines'); // Default tab when opening
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
        currentEngineIcon.src = engine.icon;
        searchInput.placeholder = `${engine.name} で検索...`;
    }

    function renderEngineDropdown() {
        engineDropdown.innerHTML = '';
        searchEngines.forEach((engine, index) => {
            const div = document.createElement('div');
            div.className = 'engine-item';
            div.innerHTML = `<img src="${engine.icon}"><span>${engine.name}</span>`;
            div.onclick = () => {
                selectedEngineIndex = index;
                saveEnginesToStorage();
                updateSelectedEngineUI();
                engineDropdown.style.display = 'none';
            };
            engineDropdown.appendChild(div);
        });
    }

    function renderEngineAdminList() {
        engineListAdmin.innerHTML = '';
        searchEngines.forEach((engine, index) => {
            const div = document.createElement('div');
            div.className = 'engine-list-item';
            div.innerHTML = `
                <img src="${engine.icon}">
                <div class="engine-info">
                    <strong>${engine.name}</strong>
                    <span style="font-size: 0.6rem; opacity: 0.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${engine.url}</span>
                </div>
                ${searchEngines.length > 1 ? `<div class="delete-engine">×</div>` : ''}
            `;
            const delBtn = div.querySelector('.delete-engine');
            if (delBtn) {
                delBtn.onclick = () => {
                    searchEngines.splice(index, 1);
                    if (selectedEngineIndex >= index && selectedEngineIndex > 0) {
                        selectedEngineIndex--;
                    }
                    saveEnginesToStorage();
                    renderEngineAdminList();
                    renderEngineDropdown();
                    updateSelectedEngineUI();
                };
            }
            engineListAdmin.appendChild(div);
        });
    }

    engineSelector.onclick = (e) => {
        e.stopPropagation();
        engineDropdown.style.display = engineDropdown.style.display === 'block' ? 'none' : 'block';
    };

    document.addEventListener('click', (e) => {
        engineDropdown.style.display = 'none';
        if (!sidebar.contains(e.target) && !sidebarOpenBtn.contains(e.target)) {
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
        if (name && url && url.includes('%s')) {
            let domain = '';
            try { domain = new URL(url).hostname; } catch (e) { }
            const icon = `https://www.google.com/s2/favicons?sz=64&domain=${domain || name}`;
            searchEngines.push({ name, url, icon });
            saveEnginesToStorage();
            renderEngineAdminList();
            renderEngineDropdown();
            engineNameInput.value = '';
            engineUrlInput.value = '';
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

            a.innerHTML = `<div class="icon-circle">${iconContent}</div><span class="label">${link.name}</span>`;

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
    }

    iconTypeInputs.forEach(input => input.onchange = updateIconOptionsUI);
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
            const linkData = { name, url, iconType, customIcon: (iconType === 'custom') ? customIconData : null };
            if (editIndex > -1) userLinks[editIndex] = linkData;
            else userLinks.push(linkData);
            saveToStorage();
            renderLinks();
            modal.style.display = 'none';
        }
    };

    // Drag and Drop
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

    window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };

    init();
});
