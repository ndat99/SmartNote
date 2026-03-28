// ═══════════════════════════════════════
//  KEEP MODAL
// ═══════════════════════════════════════
let _sortable = null;
let _allCategories = [];   // cache danh sách category

// ── CSRF helper ──
function _csrf() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value
        || document.cookie.match(/csrftoken=([^;]+)/)?.[1] || '';
}

// ════════════════════════════════════════
//  AJAX DELETE NOTE
// ════════════════════════════════════════
async function deleteNote(noteId, triggerEl) {
    const card = document.querySelector(`.note-card[data-note-id="${noteId}"]`);
    const cardWrapper = card?.closest('[class*="col-"]') || card;

    // Fade out ngay lập tức (optimistic)
    if (card) {
        card.style.transition = 'opacity 0.18s, transform 0.18s';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';
    }

    try {
        const res = await fetch(`/delete/${noteId}/`, {
            method: 'POST',
            headers: { 'X-CSRFToken': _csrf() },
        });
        const data = await res.json();
        if (data.ok) {
            setTimeout(() => {
                cardWrapper?.remove();
                _cleanEmptySections();
            }, 200);
        } else {
            if (card) { card.style.opacity = ''; card.style.transform = ''; }
        }
    } catch (err) {
        console.error('[Delete] Thất bại:', err);
        if (card) { card.style.opacity = ''; card.style.transform = ''; }
    }
}

// Gọi từ nút xóa trong modal
function deleteNoteFromModal() {
    const mc = document.querySelector('.keep-modal-content');
    const noteId = mc?.getAttribute('data-note-id');
    if (!noteId) return;
    document.getElementById('keepModal').classList.remove('show');
    if (_sortable) { _sortable.destroy(); _sortable = null; }
    deleteNote(noteId, null);
}

// ════════════════════════════════════════
//  AJAX PIN NOTE
// ════════════════════════════════════════
async function pinNote(noteId, btnEl) {
    const isPinned = btnEl.classList.contains('pinned');
    const next = !isPinned;

    // Optimistic UI
    btnEl.classList.toggle('pinned', next);
    btnEl.title = next ? 'Bỏ ghim' : 'Ghim';

    try {
        const res = await fetch(`/pin/${noteId}/`, {
            method: 'POST',
            headers: { 'X-CSRFToken': _csrf() },
        });
        const data = await res.json();
        if (data.ok) {
            const card = document.querySelector(`.note-card[data-note-id="${noteId}"]`);
            _movePinnedCard(card, data.is_pinned);
        } else {
            // Revert
            btnEl.classList.toggle('pinned', isPinned);
            btnEl.title = isPinned ? 'Bỏ ghim' : 'Ghim';
        }
    } catch (err) {
        console.error('[Pin] Thất bại:', err);
        btnEl.classList.toggle('pinned', isPinned);
        btnEl.title = isPinned ? 'Bỏ ghim' : 'Ghim';
    }
}

function _movePinnedCard(card, isPinned) {
    const cardWrapper = card?.closest('[class*="col-"]') || card;
    if (!cardWrapper) return;

    if (isPinned) {
        let pinnedGrid = document.getElementById('pinned-grid');
        if (!pinnedGrid) {
            // Tạo section ghim nếu chưa có
            const formWrapper = document.getElementById('formWrapper');
            const header = document.createElement('div');
            header.id = 'pinned-header';
            header.className = 'notes-section-header';
            header.innerHTML = '<h6><i class="ph-fill ph-push-pin me-1" style="font-size:0.85rem;"></i> Được ghim</h6>';
            pinnedGrid = document.createElement('div');
            pinnedGrid.id = 'pinned-grid';
            pinnedGrid.className = 'row g-3 mb-2';
            formWrapper.insertAdjacentElement('afterend', header);
            header.insertAdjacentElement('afterend', pinnedGrid);
        }
        pinnedGrid.prepend(cardWrapper);

        // Cập nhật label section "Khác"
        const notesHeader = document.getElementById('notes-header');
        if (notesHeader) notesHeader.querySelector('h6').textContent = 'Khác';
    } else {
        const notesGrid = document.getElementById('notes-grid');
        if (notesGrid) notesGrid.prepend(cardWrapper);
        _cleanEmptySections();

        // Nếu không còn note ghim → section "Ghi chú của bạn"
        const pinnedGrid = document.getElementById('pinned-grid');
        if (!pinnedGrid || !pinnedGrid.querySelector('.note-card')) {
            const notesHeader = document.getElementById('notes-header');
            if (notesHeader) notesHeader.querySelector('h6').textContent = 'Ghi chú của bạn';
        }
    }
}

function _cleanEmptySections() {
    const pinnedGrid = document.getElementById('pinned-grid');
    if (pinnedGrid && !pinnedGrid.querySelector('.note-card')) {
        document.getElementById('pinned-header')?.remove();
        pinnedGrid.remove();
    }
}

// ════════════════════════════════════════
//  OPEN / CLOSE
// ════════════════════════════════════════
function openKeepModal(cardEl) {
    const noteType = cardEl.getAttribute('data-note-type') || 'note';
    const noteId = cardEl.getAttribute('data-note-id') || '';
    const color = cardEl.getAttribute('data-color') || '';

    const titleEl = cardEl.querySelector('.note-card-title');
    const contentEl = cardEl.querySelector('.note-card-body');

    document.getElementById('modalTitle').value = titleEl ? titleEl.innerText : '';

    const mc = document.querySelector('.keep-modal-content');
    mc.setAttribute('data-note-id', noteId);
    mc.setAttribute('data-note-type', noteType);
    color ? mc.setAttribute('data-color', color) : mc.removeAttribute('data-color');

    document.getElementById('modalDeleteBtn').href = `/delete/${noteId}/`;

    // Body
    if (noteType === 'checklist') {
        document.getElementById('modalContent').style.display = 'none';
        document.getElementById('modalChecklist').style.display = 'block';
        const script = cardEl.querySelector('.note-checklist-data');
        const items = script ? JSON.parse(script.textContent.trim()) : [];
        _renderChecklist(noteId, items);
    } else {
        document.getElementById('modalContent').style.display = '';
        document.getElementById('modalChecklist').style.display = 'none';
        document.getElementById('modalContent').value = contentEl ? contentEl.innerText : '';
    }

    // Tags — đọc từ card
    const tagEls = cardEl.querySelectorAll('.note-card-tags .tag');
    const tagsData = {
        category: cardEl.querySelector('.tag-category') ? { name: cardEl.querySelector('.tag-category').innerText.replace(/^.*? /, '') } : null,
        priority: cardEl.querySelector('.tag-high, .tag-medium, .tag-low')?.innerText || null,
        is_task: !!cardEl.querySelector('.tag-task-ai, .tag-task-user'),
        is_task_source: cardEl.querySelector('.tag-task-ai') ? 'AI' : cardEl.querySelector('.tag-task-user') ? 'USER' : null,
    };

    // Lấy category id từ data attribute nếu có
    const catIdEl = cardEl.querySelector('[data-category-id]');
    if (catIdEl) tagsData.category = { id: parseInt(catIdEl.dataset.categoryId), name: tagsData.category?.name };

    mc.dataset.isTask = tagsData.is_task ? '1' : '0';
    mc.dataset.isTaskSource = tagsData.is_task_source || '';
    mc.dataset.categoryId = tagsData.category?.id || '';
    mc.dataset.categoryName = tagsData.category?.name || '';
    mc.dataset.priority = tagsData.priority || '';

    // Render image slider
    const imgScript = cardEl.querySelector('.note-image-data');
    let imagesData = [];
    try {
        if (imgScript) imagesData = JSON.parse(imgScript.textContent);
    } catch(e){}
    _renderModalImages(imagesData);

    _renderModalTags(tagsData);
    _updateTaskBtn(tagsData.is_task);

    // Ẩn tag editor
    document.getElementById('modalTagEditor').style.display = 'none';
    document.getElementById('tagSearchInput').value = '';

    document.getElementById('keepModal').classList.add('show');
}

function closeKeepModal() {
    const mc = document.querySelector('.keep-modal-content');
    const noteId = mc.getAttribute('data-note-id');
    const title = document.getElementById('modalTitle').value.trim();
    const type = mc.getAttribute('data-note-type');

    // Optimistic update card title
    const card = document.querySelector(`.note-card[data-note-id="${noteId}"]`);
    if (card) {
        let titleEl = card.querySelector('.note-card-title');
        if (title) {
            if (!titleEl) {
                titleEl = document.createElement('div');
                titleEl.className = 'note-card-title';
                card.insertBefore(titleEl, card.querySelector('.note-card-date'));
            }
            titleEl.innerText = title;
        } else if (titleEl) {
            titleEl.remove();
        }
    }

    const body = { title };
    if (type !== 'checklist') {
        const content = document.getElementById('modalContent').value.trim();
        body.content = content;
        if (card) {
            const bodyEl = card.querySelector('.note-card-body');
            if (bodyEl) bodyEl.innerText = content;
        }
    }

    fetch(`/update/${noteId}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': _csrf() },
        body: JSON.stringify(body),
    }).catch(err => console.error('[Modal] Lưu thất bại:', err));

    document.getElementById('keepModal').classList.remove('show');
    document.getElementById('modalTagEditor').style.display = 'none';
    if (_sortable) { _sortable.destroy(); _sortable = null; }
}

// ════════════════════════════════════════
//  TAGS DISPLAY
// ════════════════════════════════════════
function _renderModalTags(data) {
    const row = document.getElementById('modalTags');
    row.innerHTML = '';

    if (data.category) {
        const s = document.createElement('span');
        s.className = 'tag tag-category';
        s.innerHTML = `<i class="ph ph-tag"></i> ${_esc(data.category.name)}`;
        row.appendChild(s);
    }

    if (data.priority) {
        const p = data.priority.toLowerCase().trim().replace('● ', '');
        const cls = p === 'high' ? 'tag-high' : p === 'medium' ? 'tag-medium' : 'tag-low';
        const s = document.createElement('span');
        s.className = `tag ${cls}`;
        s.textContent = `● ${p.charAt(0).toUpperCase() + p.slice(1)}`;
        row.appendChild(s);
    }

    if (data.is_task) {
        const s = document.createElement('span');
        s.className = data.is_task_source === 'AI' ? 'tag tag-task-ai' : 'tag tag-task-user';
        s.innerHTML = data.is_task_source === 'AI'
            ? '<i class="ph-fill ph-robot"></i> Task'
            : '<i class="ph-fill ph-user"></i> Task';
        row.appendChild(s);
    }
}

// ════════════════════════════════════════
//  IS_TASK TOGGLE
// ════════════════════════════════════════
function _updateTaskBtn(isTask) {
    const btn = document.getElementById('modalTaskBtn');
    if (isTask) {
        btn.className = 'ph-fill ph-check-circle action-icon';
        btn.style.color = 'var(--accent)';
        btn.title = 'Bỏ đánh dấu nhiệm vụ';
    } else {
        btn.className = 'ph ph-check-circle action-icon';
        btn.style.color = '';
        btn.title = 'Đánh dấu là nhiệm vụ';
    }
}

async function toggleModalTask() {
    const mc = document.querySelector('.keep-modal-content');
    const noteId = mc.getAttribute('data-note-id');
    const isTask = mc.dataset.isTask === '1';
    const next = !isTask;

    mc.dataset.isTask = next ? '1' : '0';
    mc.dataset.isTaskSource = 'USER';
    _updateTaskBtn(next);

    // Re-render tags (giữ lại priority hiện tại)
    _renderModalTags({
        category: mc.dataset.categoryId ? { name: mc.dataset.categoryName } : null,
        priority: mc.dataset.priority || null,
        is_task: next,
        is_task_source: 'USER',
    });

    try {
        const res = await fetch(`/update-meta/${noteId}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': _csrf() },
            body: JSON.stringify({ is_task: next }),
        });
        const data = await res.json();
        if (data.ok) _syncCardMeta(noteId, data);
    } catch (err) { console.error('[Modal] Toggle task thất bại:', err); }
}

// ════════════════════════════════════════
//  TAG EDITOR
// ════════════════════════════════════════
async function toggleTagEditor() {
    const editor = document.getElementById('modalTagEditor');
    const isOpen = editor.style.display !== 'none';

    if (isOpen) {
        editor.style.display = 'none';
        return;
    }

    // Load categories nếu chưa có
    if (_allCategories.length === 0) {
        try {
            const res = await fetch('/categories/');
            const data = await res.json();
            _allCategories = [
                ...data.system.map(c => ({ ...c, type: 'system' })),
                ...data.user.map(c => ({ ...c, type: 'user' })),
            ];
        } catch (err) { console.error('[Tags] Load thất bại:', err); return; }
    }

    document.getElementById('tagSearchInput').value = '';
    filterCategories('');
    editor.style.display = 'block';
    document.getElementById('tagSearchInput').focus();
}

function filterCategories(query) {
    const q = query.trim().toLowerCase();
    const list = document.getElementById('tagCategoryList');
    const newRow = document.getElementById('tagNewRow');
    const mc = document.querySelector('.keep-modal-content');
    const current = parseInt(mc.dataset.categoryId) || null;

    const filtered = q
        ? _allCategories.filter(c => c.name.toLowerCase().includes(q))
        : _allCategories;

    list.innerHTML = '';
    filtered.forEach(cat => {
        const div = document.createElement('div');
        div.className = `tag-category-item${cat.id === current ? ' active' : ''}`;
        div.innerHTML = `
            <i class="ph ph-tag" style="font-size:1.05rem; opacity:0.5;"></i>
            <span>${_esc(cat.name)}</span>
            ${cat.id === current ? '<i class="ph ph-check ms-auto" style="font-size:0.95rem; color:var(--accent);"></i>' : ''}
        `;
        div.onclick = () => applyCategory(cat.id, cat.name);
        list.appendChild(div);
    });

    // Hiện "Tạo mới" nếu có query và không match chính xác
    const exactMatch = _allCategories.some(c => c.name.toLowerCase() === q);
    if (q && !exactMatch) {
        document.getElementById('tagNewLabel').textContent = `Tạo "${query}"`;
        newRow.style.display = 'flex';
        newRow.dataset.name = query;
    } else {
        newRow.style.display = 'none';
    }

    // Thêm option "Không có nhãn" ở đầu
    const noneDiv = document.createElement('div');
    noneDiv.className = `tag-category-item${current === null ? ' active' : ''}`;
    noneDiv.innerHTML = `
        <i class="ph ph-x" style="font-size:1.05rem; opacity:0.5;"></i>
        <span>Không có nhãn</span>
        ${current === null ? '<i class="ph ph-check ms-auto" style="font-size:0.95rem; color:var(--accent);"></i>' : ''}
    `;
    noneDiv.onclick = () => applyCategory(null, null);
    list.insertBefore(noneDiv, list.firstChild);
}

async function applyCategory(catId, catName) {
    const mc = document.querySelector('.keep-modal-content');
    const noteId = mc.getAttribute('data-note-id');

    mc.dataset.categoryId = catId || '';
    mc.dataset.categoryName = catName || '';

    // Re-render tags
    _renderModalTags({
        category: catId ? { name: catName } : null,
        priority: null,
        is_task: mc.dataset.isTask === '1',
        is_task_source: mc.dataset.isTaskSource,
    });

    // Đóng editor
    document.getElementById('modalTagEditor').style.display = 'none';

    try {
        const res = await fetch(`/update-meta/${noteId}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': _csrf() },
            body: JSON.stringify({ category_id: catId }),
        });
        const data = await res.json();
        if (data.ok) {
            _syncCardMeta(noteId, data);
            // Nếu tạo category mới, thêm vào cache
            if (data.category && !_allCategories.find(c => c.id === data.category.id)) {
                _allCategories.push({ ...data.category, type: 'user' });
            }
        }
    } catch (err) { console.error('[Tags] Lưu category thất bại:', err); }
}

async function createAndApplyCategory() {
    const name = document.getElementById('tagNewRow').dataset.name?.trim();
    if (!name) return;

    const mc = document.querySelector('.keep-modal-content');
    const noteId = mc.getAttribute('data-note-id');

    try {
        const res = await fetch(`/update-meta/${noteId}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': _csrf() },
            body: JSON.stringify({ new_category: name }),
        });
        const data = await res.json();
        if (data.ok && data.category) {
            mc.dataset.categoryId = data.category.id;
            mc.dataset.categoryName = data.category.name;
            _renderModalTags({
                category: data.category,
                priority: null,
                is_task: mc.dataset.isTask === '1',
                is_task_source: mc.dataset.isTaskSource,
            });
            if (!_allCategories.find(c => c.id === data.category.id)) {
                _allCategories.push({ ...data.category, type: 'user' });
            }
            _syncCardMeta(noteId, data);
        }
    } catch (err) { console.error('[Tags] Tạo category thất bại:', err); }

    document.getElementById('modalTagEditor').style.display = 'none';
}

// Sync tags trên card ngoài trang
function _syncCardMeta(noteId, data) {
    const card = document.querySelector(`.note-card[data-note-id="${noteId}"]`);
    if (!card) return;

    const tagsEl = card.querySelector('.note-card-tags');
    if (!tagsEl) return;

    // Xóa tag category cũ, task cũ rồi build lại
    tagsEl.querySelectorAll('.tag-category, .tag-task-ai, .tag-task-user').forEach(t => t.remove());

    if (data.category) {
        const s = document.createElement('span');
        s.className = 'tag tag-category';
        s.dataset.categoryId = data.category.id;
        s.innerHTML = `<i class="ph ph-tag"></i> ${_esc(data.category.name)}`;
        tagsEl.insertBefore(s, tagsEl.firstChild);
    }

    if (data.is_task) {
        const s = document.createElement('span');
        s.className = data.is_task_source === 'AI' ? 'tag tag-task-ai' : 'tag tag-task-user';
        s.innerHTML = data.is_task_source === 'AI'
            ? '<i class="ph-fill ph-robot"></i> Task'
            : '<i class="ph-fill ph-user"></i> Task';
        tagsEl.appendChild(s);
    }
}

// ════════════════════════════════════════
//  CHECKLIST (giữ nguyên)
// ════════════════════════════════════════
function _renderChecklist(noteId, items) {
    const container = document.getElementById('modalChecklistItems');
    container.innerHTML = '';
    container.setAttribute('data-note-id', noteId);

    [...items].sort((a, b) => a.is_checked - b.is_checked)
        .forEach(item => container.appendChild(_makeItemEl(item)));

    if (_sortable) _sortable.destroy();
    _sortable = Sortable.create(container, {
        handle: '.checklist-drag-handle', animation: 160, ghostClass: 'sortable-ghost',
        onEnd() {
            const order = [...container.querySelectorAll('.modal-checklist-item')]
                .map(el => el.getAttribute('data-item-id'));
            _reorder(noteId, order);
        },
    });
}

function _makeItemEl(item) {
    const div = document.createElement('div');
    div.className = `modal-checklist-item${item.is_checked ? ' item-checked' : ''}`;
    div.setAttribute('data-item-id', item.id);
    div.innerHTML = `
        <i class="ph ph-dots-six-vertical checklist-drag-handle" style="font-size: 1.2rem;"></i>
        <span class="checklist-checkbox">
            <i class="${item.is_checked ? 'ph-fill ph-check-circle' : 'ph ph-circle'}"></i>
        </span>
        <span class="modal-item-text${item.is_checked ? ' checked-text' : ''}">${_esc(item.content)}</span>
        <button class="checklist-item-delete" title="Xóa mục"><i class="ph ph-x"></i></button>`;

    div.querySelector('.checklist-checkbox').addEventListener('click', () => _toggleItem(item.id, div));
    div.querySelector('.checklist-item-delete').addEventListener('click', e => {
        e.stopPropagation(); _deleteItem(item.id, div);
    });
    return div;
}

async function _toggleItem(itemId, div) {
    const checked = !div.classList.contains('item-checked');
    div.classList.toggle('item-checked', checked);
    div.querySelector('.checklist-checkbox i').className =
        `${checked ? 'ph-fill ph-check-circle' : 'ph ph-circle'}`;
    div.querySelector('.modal-item-text').classList.toggle('checked-text', checked);

    const noteId = document.getElementById('modalChecklistItems').getAttribute('data-note-id');
    _syncCard(noteId, itemId, 'toggle', checked);

    await fetch(`/checklist/item/toggle/${itemId}/`, {
        method: 'POST', headers: { 'X-CSRFToken': _csrf() },
    }).catch(err => console.error('[Modal] Toggle thất bại:', err));
}

async function _deleteItem(itemId, div) {
    div.style.opacity = '0.4';
    try {
        const res = await fetch(`/checklist/item/delete/${itemId}/`, {
            method: 'POST', headers: { 'X-CSRFToken': _csrf() },
        });
        const data = await res.json();
        if (data.ok) {
            const noteId = document.getElementById('modalChecklistItems').getAttribute('data-note-id');
            div.remove();
            _syncCard(noteId, itemId, 'remove');
        } else { div.style.opacity = ''; }
    } catch (err) { div.style.opacity = ''; }
}

function addModalChecklistItem() {
    const container = document.getElementById('modalChecklistItems');
    const noteId = container.getAttribute('data-note-id');
    const div = document.createElement('div');
    div.className = 'modal-checklist-item';
    div.innerHTML = `
        <i class="ph ph-dots-six-vertical checklist-drag-handle" style="opacity:0; font-size:1.2rem;"></i>
        <span class="checklist-checkbox" style="pointer-events:none;opacity:.35">
            <i class="ph ph-circle"></i>
        </span>
        <input type="text" class="modal-item-input" placeholder="Thêm mục mới…">
        <button class="checklist-item-delete" style="opacity:.6"><i class="ph ph-x"></i></button>`;
    container.appendChild(div);

    const input = div.querySelector('input');
    div.querySelector('.checklist-item-delete').addEventListener('click', () => div.remove());

    let done = false;
    async function commit() {
        if (done) return;
        const content = input.value.trim();
        if (!content) { div.remove(); return; }
        done = true;
        try {
            const res = await fetch(`/checklist/item/add/${noteId}/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': _csrf() },
                body: JSON.stringify({ content }),
            });
            const data = await res.json();
            if (data.ok) {
                const newItem = { id: data.item_id, content, is_checked: false };
                div.replaceWith(_makeItemEl(newItem));
                _syncCard(noteId, newItem, 'add');
            } else { div.remove(); }
        } catch (err) { div.remove(); }
    }
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') div.remove();
    });
    input.addEventListener('blur', () => setTimeout(commit, 150));
    input.focus();
}

async function _reorder(noteId, order) {
    await fetch(`/checklist/item/reorder/${noteId}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': _csrf() },
        body: JSON.stringify({ order }),
    }).catch(() => { });
}

function _syncCard(noteId, payload, action, value) {
    const card = document.querySelector(`.note-card[data-note-id="${noteId}"]`);
    const script = card?.querySelector('.note-checklist-data');
    if (!script) return;
    let items = JSON.parse(script.textContent.trim());
    if (action === 'toggle') { const i = items.find(i => i.id == payload); if (i) i.is_checked = value; }
    else if (action === 'remove') { items = items.filter(i => i.id != payload); }
    else if (action === 'add') { items.push(payload); }
    script.textContent = JSON.stringify(items);
}

function _esc(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
}

// ════════════════════════════════════════
//  TOGGLE TASK TRỰC TIẾP TRÊN CARD
// ════════════════════════════════════════
async function toggleCardTask(iconEl, noteId, event) {
    event.stopPropagation();
    const isTask = iconEl.classList.contains('ph-fill');
    const next = !isTask;

    // Cập nhật icon ngay lập tức
    iconEl.className = `${next ? 'ph-fill' : 'ph'} ph-check-circle action-icon card-task-btn${next ? ' task-active' : ''}`;
    iconEl.title = next ? 'Bỏ đánh dấu nhiệm vụ' : 'Đánh dấu là nhiệm vụ';

    // Cập nhật tag trên card
    const card = iconEl.closest('.note-card');
    const tagRow = card?.querySelector('.note-card-tags');
    if (tagRow) {
        tagRow.querySelectorAll('.tag-task-ai, .tag-task-user').forEach(t => t.remove());
        if (next) {
            const span = document.createElement('span');
            span.className = 'tag tag-task-user';
            span.innerHTML = '<i class="ph-fill ph-user"></i> Task';
            tagRow.appendChild(span);
        }
    }

    try {
        await fetch(`/update-meta/${noteId}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': _csrf() },
            body: JSON.stringify({ is_task: next }),
        });
    } catch (err) { console.error('[Card] Toggle task thất bại:', err); }
}

// ════════════════════════════════════════
//  IMAGE UPLOAD & RENDER IN MODAL
// ════════════════════════════════════════
function _renderModalImages(images) {
    const container = document.getElementById('modalImageSlider');
    container.innerHTML = '';
    
    // Lưu lại dataset
    container.dataset.images = JSON.stringify(images);

    if (!images || images.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    if (images.length <= 2) {
        container.classList.remove('slider-mode');
        container.classList.add('grid-mode');
        images.forEach(img => {
            const div = document.createElement('div');
            div.className = 'modal-img-wrap';
            div.innerHTML = `
                <img src="${img.url}">
                <button class="delete-img-btn" onclick="deleteModalImage(${img.id}, event)"><i class="ph ph-trash"></i></button>
            `;
            container.appendChild(div);
        });
    } else {
        container.classList.remove('grid-mode');
        container.classList.add('slider-mode');
        
        images.forEach(img => {
            const div = document.createElement('div');
            div.className = 'modal-img-slide';
            div.innerHTML = `
                <img src="${img.url}">
                <button class="delete-img-btn" onclick="deleteModalImage(${img.id}, event)"><i class="ph ph-trash"></i></button>
            `;
            container.appendChild(div);
        });
    }
}

async function uploadModalImages(input) {
    const files = input.files;
    if (!files || files.length === 0) return;
    
    const noteId = document.querySelector('.keep-modal-content').getAttribute('data-note-id');
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
    }
    
    try {
        const res = await fetch(`/image/add/${noteId}/`, {
            method: 'POST',
            body: formData,
            headers: { 'X-CSRFToken': _csrf() }
        });
        const data = await res.json();
        if (data.ok) {
            const container = document.getElementById('modalImageSlider');
            let images = JSON.parse(container.dataset.images || '[]');
            images = images.concat(data.images);
            _renderModalImages(images);
            _syncCardImages(noteId, images);
        }
    } catch (e) {
        console.error('Lỗi upload ảnh', e);
    }
    input.value = ''; // Reset
}

async function deleteModalImage(imageId, event) {
    event.stopPropagation();
    event.preventDefault();
    if (!confirm('Bạn có chắc muốn xóa ảnh này?')) return;
    
    try {
        const res = await fetch(`/image/delete/${imageId}/`, {
            method: 'POST',
            headers: { 'X-CSRFToken': _csrf() }
        });
        const data = await res.json();
        if (data.ok) {
            const noteId = document.querySelector('.keep-modal-content').getAttribute('data-note-id');
            const container = document.getElementById('modalImageSlider');
            let images = JSON.parse(container.dataset.images || '[]');
            images = images.filter(img => img.id !== imageId);
            _renderModalImages(images);
            _syncCardImages(noteId, images);
        }
    } catch (e) {
        console.error('Lỗi xóa ảnh', e);
    }
}

function _syncCardImages(noteId, images) {
    const card = document.querySelector(`.note-card[data-note-id="${noteId}"]`);
    if (!card) return;
    
    let imgContainer = card.querySelector('.note-card-images');
    let scriptEl = card.querySelector('.note-image-data');
    
    if (!images || images.length === 0) {
        if (imgContainer) imgContainer.remove();
        if (scriptEl) scriptEl.remove();
        return;
    }
    
    // Update data script
    if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.type = 'application/json';
        scriptEl.className = 'note-image-data';
        const titleEl = card.querySelector('.note-card-title');
        if (titleEl) {
            card.insertBefore(scriptEl, titleEl);
        } else {
            card.appendChild(scriptEl);
        }
    }
    scriptEl.textContent = JSON.stringify(images);
    
    // Update visual stamps
    if (!imgContainer) {
        imgContainer = document.createElement('div');
        imgContainer.className = `note-card-images`;
        card.insertBefore(imgContainer, scriptEl);
    }
    
    imgContainer.className = `note-card-images len-${images.length}`;
    imgContainer.innerHTML = '';
    
    const limit = Math.min(images.length, 3);
    for (let i = 0; i < limit; i++) {
        const wrap = document.createElement('div');
        wrap.className = 'note-card-img-wrap';
        if (i === 2 && images.length > 3) {
            wrap.classList.add('extra-images');
            wrap.innerHTML = `<img src="${images[i].url}" alt="Note Image">
                              <div class="extra-images-overlay">+${images.length - 2}</div>`;
        } else {
            wrap.innerHTML = `<img src="${images[i].url}" alt="Note Image">`;
        }
        imgContainer.appendChild(wrap);
    }
}