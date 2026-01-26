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
    const engineNameInput = document.getElementById('engine-name');
    const engineUrlInput = document.getElementById('engine-url');
    const addEngineBtn = document.getElementById('add-engine');
    const engineListAdmin = document.getElementById('engine-list-admin');

    const contextMenu = document.getElementById('context-menu');
    const menuEdit = document.getElementById('menu-edit');
    const menuDelete = document.getElementById('menu-delete');

    const iconTypeInputs = document.querySelectorAll('input[name="icon-type"]');
    const customFileInput = document.getElementById('custom-file-input');
    const iconPreview = document.getElementById('icon-preview');

    // State
    let userLinks = JSON.parse(localStorage.getItem('userLinks')) || [];
    let searchEngines = JSON.parse(localStorage.getItem('searchEngines')) || [
        { name: 'Google', url: 'https://www.google.com/search?q=%s', icon: 'https://www.google.com/favicon.ico' },
        { name: 'Bing', url: 'https://www.bing.com/search?q=%s', icon: 'https://www.bing.com/favicon.ico' },
        { name: 'Yahoo', url: 'https://search.yahoo.co.jp/search?p=%s', icon: 'https://www.yahoo.co.jp/favicon.ico' }
    ];
    let selectedEngineIndex = parseInt(localStorage.getItem('selectedEngineIndex')) || 0;
    if (selectedEngineIndex >= searchEngines.length) selectedEngineIndex = 0;

    let editIndex = -1;
    let customIconData = null;

    // Initialization
    function init() {
        renderLinks();
        renderEngineDropdown();
        renderEngineAdminList();
        updateSelectedEngineUI();
        updateTime();
        setInterval(updateTime, 1000);
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

    // Sidebar Toggle
    sidebarOpenBtn.onclick = () => sidebar.classList.add('open');
    sidebarCloseBtn.onclick = () => sidebar.classList.remove('open');

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
                ${searchEngines.length > 1 ? `<div class="delete-engine" data-index="${index}">×</div>` : ''}
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
        // Close sidebar if clicking outside
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
        const type = link.iconType || 'initial';
        document.querySelector(`input[name="icon-type"][value="${type}"]`).checked = true;
        customIconData = link.customIcon || null;
        updateIconOptionsUI();
        modal.style.display = 'flex';
    }

    openModalBtn.onclick = () => {
        editIndex = -1;
        modalTitle.textContent = 'リンクを追加';
        linkNameInput.value = '';
        linkUrlInput.value = '';
        document.querySelector('input[name="icon-type"][value="initial"]').checked = true;
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
        const iconType = document.querySelector('input[name="icon-type"]:checked').value;
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
