// ════════════════════════════════════════
//  PRIORITY PICKER
// ════════════════════════════════════════

// ── Shared picker cho card (giống shared color picker) ──
function _getSharedPriorityPicker() {
    let picker = document.getElementById('sharedPriorityPicker');
    if (!picker) {
        picker = document.createElement('div');
        picker.id = 'sharedPriorityPicker';
        picker.className = 'priority-picker-popup';
        picker.style.position = 'fixed';
        picker.style.zIndex = '9999';
        const opts = [
            { value: '',       icon: 'ph-minus-circle', label: 'Không có', color: 'var(--text-dim)' },
            { value: 'high',   icon: 'ph-flag',         label: 'High',     color: '#dc2626' },
            { value: 'medium', icon: 'ph-flag',         label: 'Medium',   color: '#b45309' },
            { value: 'low',    icon: 'ph-flag',         label: 'Low',      color: '#16a34a' },
        ];
        opts.forEach(opt => {
            const div = document.createElement('div');
            div.className = 'priority-option';
            div.dataset.value = opt.value;
            div.innerHTML = `<i class="ph ${opt.icon}" style="color:${opt.color}"></i><span>${opt.label}</span>`;
            picker.appendChild(div);
        });
        document.body.appendChild(picker);
    }
    return picker;
}

function toggleCardPriorityPicker(iconEl, event) {
    event.stopPropagation();

    // Đóng color pickers và các priority picker khác
    closeAllColorPickers();
    const existingPicker = document.getElementById('sharedPriorityPicker');
    if (existingPicker && existingPicker.classList.contains('visible') && existingPicker._anchor === iconEl) {
        existingPicker.classList.remove('visible');
        return;
    }
    if (existingPicker) existingPicker.classList.remove('visible');

    const picker = _getSharedPriorityPicker();
    const card   = iconEl.closest('.note-card');
    const noteId = card?.getAttribute('data-note-id');
    const current = (card?.dataset.priority || '').toLowerCase();

    picker.querySelectorAll('.priority-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.value === current);
        opt.onclick = (e) => {
            e.stopPropagation();
            _applyAndSavePriority(noteId, opt.dataset.value, card, null);
            picker.classList.remove('visible');
        };
    });

    picker._anchor = iconEl;
    picker.classList.add('visible');
    _positionPriorityPicker(picker, iconEl);
}

// ── Priority picker trong modal ──
function toggleModalPriorityPicker(event) {
    event.stopPropagation();
    const picker = document.getElementById('modalPriorityPicker');
    if (!picker) return;
    const isOpen = picker.style.display !== 'none';
    // Đóng tag editor nếu đang mở
    document.getElementById('modalTagEditor').style.display = 'none';
    picker.style.display = isOpen ? 'none' : 'block';

    if (!isOpen) {
        const mc = document.querySelector('.keep-modal-content');
        const current = (mc?.dataset.priority || '').toLowerCase();
        picker.querySelectorAll('.priority-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.value === current);
        });
    }
}

function applyModalPriority(priority) {
    const mc     = document.querySelector('.keep-modal-content');
    const noteId = mc?.getAttribute('data-note-id');

    mc.dataset.priority = priority;
    _updateModalPriorityIcon(priority);

    // Re-render tags trong modal
    _renderModalTags({
        category:      mc.dataset.categoryId ? { name: mc.dataset.categoryName } : null,
        priority:      priority,
        is_task:       mc.dataset.isTask === '1',
        is_task_source: mc.dataset.isTaskSource,
    });

    // Đóng picker
    document.getElementById('modalPriorityPicker').style.display = 'none';

    // Sync card + server
    _applyAndSavePriority(noteId, priority, null, mc);
}

function _updateModalPriorityIcon(priority) {
    const btn = document.getElementById('modalPriorityBtn');
    if (!btn) return;

    // Xóa class cũ, bỏ inline style (dùng class để override colors.css !important)
    btn.classList.remove('priority-flag-high', 'priority-flag-medium', 'priority-flag-low');
    btn.style.color = '';

    if (priority === 'high') {
        btn.classList.add('priority-flag-high');
        btn.classList.remove('ph'); btn.classList.add('ph-fill');
    } else if (priority === 'medium') {
        btn.classList.add('priority-flag-medium');
        btn.classList.remove('ph'); btn.classList.add('ph-fill');
    } else if (priority === 'low') {
        btn.classList.add('priority-flag-low');
        btn.classList.remove('ph'); btn.classList.add('ph-fill');
    } else {
        btn.classList.remove('ph-fill'); btn.classList.add('ph');
    }
}


// ── Apply + Save chung ──
async function _applyAndSavePriority(noteId, priority, card, modal) {
    if (card) {
        card.dataset.priority = priority;
        _updatePriorityTag(card.querySelector('.note-card-tags'), priority);
    }

    try {
        const res = await fetch(`/update-meta/${noteId}/`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': _csrf() },
            body:    JSON.stringify({ priority: priority || null }),
        });
        const data = await res.json();
        if (data.ok) {
            // Sync card nếu gọi từ modal
            if (modal) _syncCardMeta(noteId, data);
        }
    } catch (err) { console.error('[Priority] Lưu thất bại:', err); }
}

// ── Cập nhật priority tag trên card ──
function _updatePriorityTag(tagsEl, priority) {
    if (!tagsEl) return;
    tagsEl.querySelectorAll('.tag-high, .tag-medium, .tag-low').forEach(t => t.remove());
    if (!priority) return;
    const cls = priority === 'high' ? 'tag-high' : priority === 'medium' ? 'tag-medium' : priority === 'low' ? 'tag-low' : null;
    if (!cls) return;
    const span = document.createElement('span');
    span.className = `tag ${cls}`;
    span.textContent = `● ${priority.charAt(0).toUpperCase() + priority.slice(1)}`;
    // Chèn sau category tag (nếu có)
    const catTag = tagsEl.querySelector('.tag-category');
    if (catTag) catTag.insertAdjacentElement('afterend', span);
    else tagsEl.insertBefore(span, tagsEl.firstChild);
}

// ── Position picker cho card ──
function _positionPriorityPicker(picker, anchor) {
    const rect = anchor.getBoundingClientRect();
    picker.style.left   = rect.left + 'px';
    picker.style.top    = (rect.bottom + 8) + 'px';
    picker.style.bottom = 'auto';
    picker.style.right  = 'auto';
    requestAnimationFrame(() => {
        const pr = picker.getBoundingClientRect();
        if (pr.right  > window.innerWidth  - 8) picker.style.left = (window.innerWidth  - pr.width  - 8) + 'px';
        if (pr.bottom > window.innerHeight - 8) picker.style.top  = (rect.top - pr.height - 8) + 'px';
    });
}

// Đóng priority picker khi click ngoài
document.addEventListener('click', (e) => {
    const sp = document.getElementById('sharedPriorityPicker');
    if (sp && sp.classList.contains('visible') && !sp.contains(e.target)) {
        sp.classList.remove('visible');
    }
});