// ═══════════════════════════════════════
//  KEEP MODAL
// ═══════════════════════════════════════
let _sortable = null;

function openKeepModal(cardEl) {
    const noteType = cardEl.getAttribute('data-note-type') || 'note';
    const noteId   = cardEl.getAttribute('data-note-id')   || '';
    const color    = cardEl.getAttribute('data-color')     || '';

    const titleEl   = cardEl.querySelector('.note-card-title');
    const contentEl = cardEl.querySelector('.note-card-body');

    document.getElementById('modalTitle').value = titleEl ? titleEl.innerText : '';

    const mc = document.querySelector('.keep-modal-content');
    mc.setAttribute('data-note-id',   noteId);
    mc.setAttribute('data-note-type', noteType);
    color ? mc.setAttribute('data-color', color) : mc.removeAttribute('data-color');

    document.getElementById('modalDeleteBtn').href = `/delete/${noteId}/`;

    if (noteType === 'checklist') {
        document.getElementById('modalContent').style.display   = 'none';
        document.getElementById('modalChecklist').style.display = 'block';
        const script = cardEl.querySelector('.note-checklist-data');
        const items  = script ? JSON.parse(script.textContent.trim()) : [];
        _renderChecklist(noteId, items);
    } else {
        document.getElementById('modalContent').style.display   = '';
        document.getElementById('modalChecklist').style.display = 'none';
        document.getElementById('modalContent').value = contentEl ? contentEl.innerText : '';
    }

    document.getElementById('keepModal').classList.add('show');
}

// Lưu thay đổi title/content rồi đóng
function closeKeepModal() {
    const mc     = document.querySelector('.keep-modal-content');
    const noteId = mc.getAttribute('data-note-id');
    const title  = document.getElementById('modalTitle').value.trim();
    const type   = mc.getAttribute('data-note-type');

    // Cập nhật card title ngay lập tức (optimistic)
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

    // Lưu xuống server
    const body = { title };
    if (type !== 'checklist') {
        const content = document.getElementById('modalContent').value.trim();
        body.content  = content;
        // Cập nhật card body
        if (card) {
            const bodyEl = card.querySelector('.note-card-body');
            if (bodyEl) bodyEl.innerText = content;
        }
    }

    fetch(`/update/${noteId}/`, {
        method:  'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value
                        || document.cookie.match(/csrftoken=([^;]+)/)?.[1] || '',
        },
        body: JSON.stringify(body),
    }).catch(err => console.error('[Modal] Lưu thất bại:', err));

    document.getElementById('keepModal').classList.remove('show');
    if (_sortable) { _sortable.destroy(); _sortable = null; }
}

// ── Render checklist items trong modal ──
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
        <i class="fa-solid fa-grip-vertical checklist-drag-handle"></i>
        <span class="checklist-checkbox">
            <i class="fa-${item.is_checked ? 'solid fa-circle-check' : 'regular fa-circle'}"></i>
        </span>
        <span class="modal-item-text${item.is_checked ? ' checked-text' : ''}">${_esc(item.content)}</span>
        <button class="checklist-item-delete" title="Xóa mục"><i class="fa-solid fa-xmark"></i></button>`;

    div.querySelector('.checklist-checkbox').addEventListener('click', () => _toggleItem(item.id, div));
    div.querySelector('.checklist-item-delete').addEventListener('click', e => {
        e.stopPropagation(); _deleteItem(item.id, div);
    });
    return div;
}

// ── Toggle / Delete / Add ──
async function _toggleItem(itemId, div) {
    const checked = !div.classList.contains('item-checked');
    div.classList.toggle('item-checked', checked);
    div.querySelector('.checklist-checkbox i').className =
        `fa-${checked ? 'solid fa-circle-check' : 'regular fa-circle'}`;
    div.querySelector('.modal-item-text').classList.toggle('checked-text', checked);

    const noteId = document.getElementById('modalChecklistItems').getAttribute('data-note-id');
    _syncCard(noteId, itemId, 'toggle', checked);

    await fetch(`/checklist/item/toggle/${itemId}/`, {
        method: 'POST',
        headers: { 'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || '' },
    }).catch(err => console.error('[Modal] Toggle thất bại:', err));
}

async function _deleteItem(itemId, div) {
    div.style.opacity = '0.4';
    try {
        const res  = await fetch(`/checklist/item/delete/${itemId}/`, {
            method: 'POST',
            headers: { 'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || '' },
        });
        const data = await res.json();
        if (data.ok) {
            const noteId = document.getElementById('modalChecklistItems').getAttribute('data-note-id');
            div.remove();
            _syncCard(noteId, itemId, 'remove');
        } else { div.style.opacity = ''; }
    } catch (err) { div.style.opacity = ''; console.error('[Modal] Xóa thất bại:', err); }
}

function addModalChecklistItem() {
    const container = document.getElementById('modalChecklistItems');
    const noteId    = container.getAttribute('data-note-id');

    const div = document.createElement('div');
    div.className = 'modal-checklist-item';
    div.innerHTML = `
        <i class="fa-solid fa-grip-vertical checklist-drag-handle" style="opacity:0"></i>
        <span class="checklist-checkbox" style="pointer-events:none;opacity:.35">
            <i class="fa-regular fa-circle"></i>
        </span>
        <input type="text" class="modal-item-input" placeholder="Thêm mục mới…">
        <button class="checklist-item-delete" style="opacity:.6" title="Hủy">
            <i class="fa-solid fa-xmark"></i>
        </button>`;
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
            const res  = await fetch(`/checklist/item/add/${noteId}/`, {
                method:  'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || '',
                },
                body: JSON.stringify({ content }),
            });
            const data = await res.json();
            if (data.ok) {
                const newItem = { id: data.item_id, content, is_checked: false };
                div.replaceWith(_makeItemEl(newItem));
                _syncCard(noteId, newItem, 'add');
            } else { div.remove(); }
        } catch (err) { div.remove(); console.error('[Modal] Thêm mục thất bại:', err); }
    }

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter')  { e.preventDefault(); commit(); }
        if (e.key === 'Escape') div.remove();
    });
    input.addEventListener('blur', () => setTimeout(commit, 150));
    input.focus();
}

async function _reorder(noteId, order) {
    await fetch(`/checklist/item/reorder/${noteId}/`, {
        method:  'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || '',
        },
        body: JSON.stringify({ order }),
    }).catch(err => console.error('[Modal] Reorder thất bại:', err));
}

// ── Sync JSON nhúng trong card ──
function _syncCard(noteId, payload, action, value) {
    const card   = document.querySelector(`.note-card[data-note-id="${noteId}"]`);
    const script = card?.querySelector('.note-checklist-data');
    if (!script) return;
    let items = JSON.parse(script.textContent.trim());

    if      (action === 'toggle') { const i = items.find(i => i.id == payload); if (i) i.is_checked = value; }
    else if (action === 'remove') { items = items.filter(i => i.id != payload); }
    else if (action === 'add')    { items.push(payload); }

    script.textContent = JSON.stringify(items);
}

function _esc(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
}