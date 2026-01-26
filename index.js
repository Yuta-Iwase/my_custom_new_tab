document.addEventListener('DOMContentLoaded', () => {
    const linkGrid = document.getElementById('link-grid');
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const openModalBtn = document.getElementById('open-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const saveLinkBtn = document.getElementById('save-link');
    const linkNameInput = document.getElementById('link-name');
    const linkUrlInput = document.getElementById('link-url');
    const timeDisplay = document.getElementById('time');

    const contextMenu = document.getElementById('context-menu');
    const menuEdit = document.getElementById('menu-edit');
    const menuDelete = document.getElementById('menu-delete');

    const iconTypeInputs = document.querySelectorAll('input[name="icon-type"]');
    const customFileInput = document.getElementById('custom-file-input');
    const iconPreview = document.getElementById('icon-preview');

    let userLinks = JSON.parse(localStorage.getItem('userLinks')) || [];
    let editIndex = -1;
    let customIconData = null;

    function saveToStorage() {
        localStorage.setItem('userLinks', JSON.stringify(userLinks));
    }

    function getFaviconUrl(url) {
        try {
            const domain = new URL(url).hostname;
            return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
        } catch (e) {
            return null;
        }
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

            a.innerHTML = `
                <div class="icon-circle">
                    ${iconContent}
                </div>
                <span class="label">${link.name}</span>
            `;

            // Drag events
            a.addEventListener('dragstart', handleDragStart);
            a.addEventListener('dragover', handleDragOver);
            a.addEventListener('drop', handleDrop);
            a.addEventListener('dragend', handleDragEnd);

            // Context menu event
            a.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showContextMenu(e.pageX, e.pageY, index);
            });

            linkGrid.insertBefore(a, openModalBtn);
        });
    }

    // Context Menu Logic
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

    menuEdit.onclick = () => {
        if (selectedMenuIndex > -1) {
            openEditModal(selectedMenuIndex);
        }
    };

    menuDelete.onclick = () => {
        if (selectedMenuIndex > -1) {
            if (confirm('このリンクを削除しますか？')) {
                deleteLink(selectedMenuIndex);
            }
        }
    };

    // Modal Logic
    function openEditModal(index) {
        editIndex = index;
        const link = userLinks[index];
        modalTitle.textContent = 'リンクを編集';
        linkNameInput.value = link.name;
        linkUrlInput.value = link.url;

        // Restore icon settings
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

    // Icon Type Logic
    function updateIconOptionsUI() {
        const selectedType = document.querySelector('input[name="icon-type"]:checked').value;
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

    iconTypeInputs.forEach(input => {
        input.onchange = updateIconOptionsUI;
    });

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

            const linkData = {
                name,
                url,
                iconType,
                customIcon: (iconType === 'custom') ? customIconData : null
            };

            if (editIndex > -1) {
                userLinks[editIndex] = linkData;
            } else {
                userLinks.push(linkData);
            }

            saveToStorage();
            renderLinks();
            modal.style.display = 'none';
        }
    };

    // Drag and Drop Logic
    let draggedItem = null;

    function handleDragStart(e) {
        draggedItem = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.index);
    }

    function handleDragOver(e) {
        if (e.preventDefault) e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    function handleDrop(e) {
        if (e.stopPropagation) e.stopPropagation();

        const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const targetIndex = parseInt(this.dataset.index);

        if (sourceIndex !== targetIndex) {
            const movedItem = userLinks.splice(sourceIndex, 1)[0];
            userLinks.splice(targetIndex, 0, movedItem);
            saveToStorage();
            renderLinks();
        }
        return false;
    }

    function handleDragEnd(e) {
        this.classList.remove('dragging');
    }

    function deleteLink(index) {
        userLinks.splice(index, 1);
        saveToStorage();
        renderLinks();
    }

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

    window.onclick = (event) => {
        if (event.target == modal) modal.style.display = 'none';
    };

    const searchInput = document.getElementById('search-input');

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            }
        }
    });

    // Init
    renderLinks();
    updateTime();
    setInterval(updateTime, 1000);
    searchInput.focus();
});
