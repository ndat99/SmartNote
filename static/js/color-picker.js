// ═══════════════════════════════════════
//  COLOR PICKER
//  Dùng cho: form tạo note, form checklist, card, modal
// ═══════════════════════════════════════

// Đóng tất cả picker đang mở
function closeAllColorPickers() {
    document.querySelectorAll('.color-picker-popup.visible')
            .forEach(p => p.classList.remove('visible'));
}

// Mở/đóng picker theo ID (dùng cho form)
function toggleColorPicker(pickerId, event) {
    event.stopPropagation();
    const picker = document.getElementById(pickerId);
    const wasOpen = picker.classList.contains('visible');
    closeAllColorPickers();
    if (!wasOpen) picker.classList.add('visible');
}

// Áp màu cho form tạo note thường
function applyFormColor(color, swatchEl) {
    document.getElementById('formBgColor').value = color;
    _activateSwatch('#formColorPicker', color);
    _setElemColor(document.getElementById('formWrapper'), color);
}

// Áp màu cho form checklist
function applyChecklistColor(color, swatchEl) {
    window._checklistColor = color;
    _activateSwatch('#checklistColorPicker', color);
    _setElemColor(document.getElementById('formWrapper'), color);
}

// Lấy hoặc tạo shared picker dùng chung cho tất cả card
function _getSharedCardPicker() {
    let picker = document.getElementById('sharedCardColorPicker');
    if (!picker) {
        picker = document.createElement('div');
        picker.id = 'sharedCardColorPicker';
        picker.className = 'color-picker-popup';
        picker.style.position = 'fixed';
        picker.style.zIndex = '9999';
        const colors = ['', 'berry', 'red', 'orange', 'yellow', 'teal', 'blue', 'indigo', 'purple', 'pink', 'brown'];
        colors.forEach(c => {
            const sw = document.createElement('div');
            sw.className = 'color-swatch' + (c === '' ? ' swatch-none' : '');
            sw.dataset.color = c;
            picker.appendChild(sw);
        });
        document.body.appendChild(picker);
    }
    return picker;
}

// Mở/đóng picker gắn vào card (shared) hoặc modal (nextElementSibling)
function toggleCardColorPicker(iconEl, event) {
    event.stopPropagation();

    const isModal = !!iconEl.closest('.keep-modal-content');

    // Modal giữ picker của chính nó (chỉ có 1 modal trong DOM)
    const picker = isModal ? iconEl.nextElementSibling : _getSharedCardPicker();
    if (!picker || !picker.classList.contains('color-picker-popup')) return;

    const wasOpen = picker.classList.contains('visible') && picker._anchor === iconEl;
    closeAllColorPickers();
    if (wasOpen) return;

    // Tìm note ID và màu hiện tại từ card hoặc modal
    const card    = iconEl.closest('.note-card');
    const modal   = iconEl.closest('.keep-modal-content');
    const noteId  = (card || modal)?.getAttribute('data-note-id');
    const current = (card || modal)?.getAttribute('data-color') || '';

    // Bind onclick cho từng swatch
    picker.querySelectorAll('.color-swatch').forEach(sw => {
        sw.onclick = (e) => {
            e.stopPropagation();
            _applyAndSaveColor(noteId, sw.dataset.color, picker, card, modal);
        };
        sw.classList.toggle('active', sw.dataset.color === current);
    });

    picker._anchor = iconEl;
    picker.classList.add('visible');
    _positionPicker(picker, iconEl, isModal);
}

// Áp màu lên DOM + gọi API lưu
function _applyAndSaveColor(noteId, color, picker, card, modal) {
    // Cập nhật card trên trang
    document.querySelectorAll(`.note-card[data-note-id="${noteId}"]`)
            .forEach(c => _setElemColor(c, color));

    // Cập nhật modal nếu đang mở
    const mc = document.querySelector('.keep-modal-content');
    if (mc && mc.getAttribute('data-note-id') === noteId) _setElemColor(mc, color);

    // Đánh dấu swatch active
    picker.querySelectorAll('.color-swatch')
          .forEach(s => s.classList.toggle('active', s.dataset.color === color));

    // Lưu xuống server
    if (noteId) {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value
                       || document.cookie.match(/csrftoken=([^;]+)/)?.[1] || '';
        fetch(`/set-color/${noteId}/`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
            body:    JSON.stringify({ color }),
        }).catch(err => console.error('[Color] Lưu thất bại:', err));
    }

    setTimeout(() => picker.classList.remove('visible'), 280);
}

// ── Helpers ──
function _setElemColor(el, color) {
    if (!el) return;
    color ? el.setAttribute('data-color', color) : el.removeAttribute('data-color');
}

function _activateSwatch(pickerSelector, color) {
    document.querySelectorAll(`${pickerSelector} .color-swatch`)
            .forEach(s => s.classList.toggle('active', s.dataset.color === color));
}

function _positionPicker(picker, anchor, useAbsolute) {
    if (useAbsolute) {
        // Modal: dùng absolute positioning như cũ
        picker.style.cssText = '';
        const rect = anchor.getBoundingClientRect();
        if (rect.top < 60) {
            picker.style.top    = 'calc(100% + 8px)';
            picker.style.bottom = 'auto';
        } else {
            picker.style.bottom = 'calc(100% + 8px)';
            picker.style.top    = 'auto';
        }
        requestAnimationFrame(() => {
            const pr = picker.getBoundingClientRect();
            if (pr.right > window.innerWidth - 8) {
                picker.style.left  = 'auto';
                picker.style.right = '0';
            }
        });
        return;
    }

    // Card: shared picker fixed positioning
    const rect = anchor.getBoundingClientRect();
    picker.style.left   = rect.left + 'px';
    picker.style.top    = (rect.bottom + 8) + 'px';
    picker.style.bottom = 'auto';
    picker.style.right  = 'auto';

    requestAnimationFrame(() => {
        const pr = picker.getBoundingClientRect();
        if (pr.right > window.innerWidth - 8) {
            picker.style.left = (window.innerWidth - pr.width - 8) + 'px';
        }
        if (pr.bottom > window.innerHeight - 8) {
            picker.style.top = (rect.top - pr.height - 8) + 'px';
        }
    });
}