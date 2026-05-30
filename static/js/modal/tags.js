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
        const cls = p === 'high' ? 'tag-high' : p === 'medium' ? 'tag-medium' : p === 'low' ? 'tag-low' : null;
        if (cls) {
            const s = document.createElement('span');
            s.className = `tag ${cls}`;
            s.textContent = `● ${p.charAt(0).toUpperCase() + p.slice(1)}`;
            row.appendChild(s);
        }
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

    // Xóa tags cũ rồi build lại
    tagsEl.querySelectorAll('.tag-category, .tag-task-ai, .tag-task-user').forEach(t => t.remove());

    if (data.category) {
        const s = document.createElement('span');
        s.className = 'tag tag-category';
        s.dataset.categoryId = data.category.id;
        s.innerHTML = `<i class="ph ph-tag"></i> ${_esc(data.category.name)}`;
        tagsEl.insertBefore(s, tagsEl.firstChild);
    }

    // Sync priority
    if ('priority' in data) {
        _updatePriorityTag(tagsEl, data.priority || '');
        card.dataset.priority = data.priority || '';
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

