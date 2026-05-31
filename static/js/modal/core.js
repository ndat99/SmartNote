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
            header.innerHTML = '<h6><i class="ph ph-paperclip me-1" style="font-size:0.85rem;"></i> Được ghim</h6>';
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

    // Tags — đọc từ card data attrs (chuẩn hơn đọc innerHTML)
    const priority = cardEl.dataset.priority || '';
    const tagsData = {
        category: null,
        priority: priority,
        is_task: !!cardEl.querySelector('.tag-task-ai, .tag-task-user'),
        is_task_source: cardEl.querySelector('.tag-task-ai') ? 'AI' : cardEl.querySelector('.tag-task-user') ? 'USER' : null,
    };

    // Lấy category từ tag span
    const catIdEl = cardEl.querySelector('[data-category-id]');
    if (catIdEl) {
        tagsData.category = {
            id: parseInt(catIdEl.dataset.categoryId),
            name: catIdEl.innerText.replace(/^.*?\s/, '').trim(),
        };
    }

    mc.dataset.isTask = tagsData.is_task ? '1' : '0';
    mc.dataset.isTaskSource = tagsData.is_task_source || '';
    mc.dataset.categoryId = tagsData.category?.id || '';
    mc.dataset.categoryName = tagsData.category?.name || '';
    mc.dataset.priority = priority;

    // Cập nhật icon flag trên modal
    _updateModalPriorityIcon(priority);

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
    
    // Đóng bộ cài đặt nhắc nhở nếu đang mở
    const sharedPicker = document.getElementById('sharedReminderPickerPopup');
    if (sharedPicker) sharedPicker.style.display = 'none';

    if (_sortable) { _sortable.destroy(); _sortable = null; }
}

function _esc(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
}

