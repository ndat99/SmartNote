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

