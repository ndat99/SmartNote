// ═══════════════════════════════════════════════════════
//  REMINDER MODULE  — SmartNote
//  Xử lý: picker UI, lưu/xóa reminder, polling, browser notification, toast
// ═══════════════════════════════════════════════════════

// ── CSRF helper (dùng chung với keep-modal.js) ──
function _reminderCsrf() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value
        || document.cookie.match(/csrftoken=([^;]+)/)?.[1] || '';
}

// ════════════════════════════════════════
//  KHỞI TẠO
// ════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    _requestNotificationPermission();
    _startReminderPolling();

    // Đóng picker khi click ra ngoài
    document.addEventListener('click', (e) => {
        // Shared reminder picker
        const sharedPicker = document.getElementById('sharedReminderPickerPopup');
        if (sharedPicker && sharedPicker.style.display !== 'none') {
            if (!sharedPicker.contains(e.target) && (!currentSharedReminderAnchor || !currentSharedReminderAnchor.contains(e.target))) {
                sharedPicker.style.display = 'none';
            }
        }
        // Form note reminder picker
        const formPicker = document.getElementById('formReminderPicker');
        if (formPicker && formPicker.style.display !== 'none') {
            if (!formPicker.contains(e.target) && e.target.id !== 'formBellBtn') {
                formPicker.style.display = 'none';
            }
        }
        // Form checklist reminder picker
        const ckPicker = document.getElementById('checklistReminderPicker');
        if (ckPicker && ckPicker.style.display !== 'none') {
            if (!ckPicker.contains(e.target) && e.target.id !== 'checklistBellBtn') {
                ckPicker.style.display = 'none';
            }
        }
    });
});


// ════════════════════════════════════════
//  REMINDER PICKER — FORM NOTE THƯỜNG
// ════════════════════════════════════════
function toggleFormReminderPicker(event) {
    event.stopPropagation();
    const picker = document.getElementById('formReminderPicker');
    picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
}

function setFormQuickReminder(minutes) {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    now.setSeconds(0, 0);
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    document.getElementById('formReminderDatetimeInput').value = local.toISOString().slice(0, 16);
}

function clearFormReminder() {
    document.getElementById('formReminderAt').value = '';
    document.getElementById('formReminderDatetimeInput').value = '';
    const btn = document.getElementById('formBellBtn');
    if (btn) { btn.className = 'ph ph-bell action-icon'; btn.style.color = ''; }
    document.getElementById('formReminderPicker').style.display = 'none';
}

function applyFormReminder() {
    const input = document.getElementById('formReminderDatetimeInput');
    if (!input.value) {
        _showReminderToast('⚠️ Vui lòng chọn ngày giờ nhắc nhở', 'warning');
        return;
    }
    const iso = new Date(input.value).toISOString();
    if (new Date(iso) <= new Date()) {
        _showReminderToast('⚠️ Thời gian nhắc nhở phải ở tương lai', 'warning');
        return;
    }
    document.getElementById('formReminderAt').value = iso;
    const btn = document.getElementById('formBellBtn');
    if (btn) { btn.className = 'ph-fill ph-bell action-icon'; btn.style.color = 'var(--accent)'; }
    document.getElementById('formReminderPicker').style.display = 'none';
    const dt = new Date(iso);
    const label = dt.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    _showReminderToast(`🔔 Sẽ nhắc lúc ${label}`, 'success');
}


// ════════════════════════════════════════
//  REMINDER PICKER — FORM CHECKLIST
// ════════════════════════════════════════
window._checklistReminderAt = null;

function toggleChecklistReminderPicker(event) {
    event.stopPropagation();
    const picker = document.getElementById('checklistReminderPicker');
    picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
}

function setChecklistQuickReminder(minutes) {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    now.setSeconds(0, 0);
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    document.getElementById('checklistReminderDatetimeInput').value = local.toISOString().slice(0, 16);
}

function clearChecklistReminder() {
    window._checklistReminderAt = null;
    document.getElementById('checklistReminderDatetimeInput').value = '';
    const btn = document.getElementById('checklistBellBtn');
    if (btn) { btn.className = 'ph ph-bell action-icon'; btn.style.color = ''; }
    document.getElementById('checklistReminderPicker').style.display = 'none';
}

function applyChecklistReminder() {
    const input = document.getElementById('checklistReminderDatetimeInput');
    if (!input.value) {
        _showReminderToast('⚠️ Vui lòng chọn ngày giờ nhắc nhở', 'warning');
        return;
    }
    const iso = new Date(input.value).toISOString();
    if (new Date(iso) <= new Date()) {
        _showReminderToast('⚠️ Thời gian nhắc nhở phải ở tương lai', 'warning');
        return;
    }
    window._checklistReminderAt = iso;
    const btn = document.getElementById('checklistBellBtn');
    if (btn) { btn.className = 'ph-fill ph-bell action-icon'; btn.style.color = 'var(--accent)'; }
    document.getElementById('checklistReminderPicker').style.display = 'none';
    const dt = new Date(iso);
    const label = dt.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    _showReminderToast(`🔔 Sẽ nhắc lúc ${label}`, 'success');
}

// ════════════════════════════════════════
//  XIN QUYỀN BROWSER NOTIFICATION
// ════════════════════════════════════════
function _requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// ════════════════════════════════════════
//  MỞ/ĐÓNG SHARED PICKER (Dùng cho cả Card và Modal)
// ════════════════════════════════════════
let currentSharedReminderAnchor = null;

function toggleSharedReminderPicker(event, anchor) {
    event.stopPropagation();
    const picker = document.getElementById('sharedReminderPickerPopup');
    if (!picker) return;

    const isOpen = picker.style.display !== 'none';
    if (isOpen && currentSharedReminderAnchor === anchor) {
        picker.style.display = 'none';
        return;
    }

    currentSharedReminderAnchor = anchor;

    // Tìm note ID và thời gian hiện tại
    const card = anchor.closest('.note-card');
    const modal = anchor.closest('.keep-modal-content');
    const currentReminder = (card || modal)?.getAttribute('data-reminder-at') || '';

    const input = document.getElementById('sharedReminderDatetimeInput');
    if (currentReminder) {
        const dt = new Date(currentReminder);
        const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000);
        input.value = local.toISOString().slice(0, 16);
    } else {
        input.value = '';
    }

    picker.style.display = 'block';

    // Tính toán vị trí hiển thị (Fixed positioning)
    const rect = anchor.getBoundingClientRect();
    const pickerHeight = picker.offsetHeight || 250;
    const spaceAbove = rect.top;

    if (spaceAbove < pickerHeight + 20) {
        picker.style.top = (rect.bottom + 8) + 'px';
    } else {
        picker.style.top = (rect.top - pickerHeight - 8) + 'px';
    }
    picker.style.left = rect.left + 'px';

    // Boundary check right
    requestAnimationFrame(() => {
        const pr = picker.getBoundingClientRect();
        if (pr.right > window.innerWidth - 8) {
            picker.style.left = (window.innerWidth - pr.width - 8) + 'px';
        }
    });
}

// ════════════════════════════════════════
//  QUICK REMINDER BUTTONS (SHARED)
// ════════════════════════════════════════
function setSharedQuickReminder(minutes) {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    now.setSeconds(0, 0);

    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    document.getElementById('sharedReminderDatetimeInput').value = local.toISOString().slice(0, 16);
}

// ════════════════════════════════════════
//  LƯU / XÓA REMINDER (SHARED)
// ════════════════════════════════════════
async function applySharedReminder(isClear = false) {
    if (!currentSharedReminderAnchor) return;

    const card = currentSharedReminderAnchor.closest('.note-card');
    const modal = currentSharedReminderAnchor.closest('.keep-modal-content');
    const noteId = (card || modal)?.getAttribute('data-note-id');
    if (!noteId) return;

    let reminderAt = null;

    if (!isClear) {
        const input = document.getElementById('sharedReminderDatetimeInput');
        if (!input.value) {
            _showReminderToast('⚠️ Vui lòng chọn ngày giờ nhắc nhở', 'warning');
            return;
        }
        reminderAt = new Date(input.value).toISOString();

        if (new Date(reminderAt) <= new Date()) {
            _showReminderToast('⚠️ Thời gian nhắc nhở phải ở tương lai', 'warning');
            return;
        }
    }

    try {
        const res = await fetch(`/reminder/${noteId}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': _reminderCsrf() },
            body: JSON.stringify({ reminder_at: reminderAt }),
        });
        const data = await res.json();

        if (data.ok) {
            const newReminder = data.reminder_at || '';

            // Cập nhật card trên trang (các card nào có noteId này)
            document.querySelectorAll(`.note-card[data-note-id="${noteId}"]`)
                    .forEach(c => c.dataset.reminderAt = newReminder);

            // Cập nhật modal content nếu đang mở
            const mc = document.querySelector('.keep-modal-content');
            if (mc && mc.getAttribute('data-note-id') === noteId) {
                mc.dataset.reminderAt = newReminder;
            }

            // Sync badge
            _syncReminderBadge(noteId, newReminder);

            // Sync icon bell
            _updateBellIcon(newReminder ? true : false, noteId);

            document.getElementById('sharedReminderPickerPopup').style.display = 'none';

            if (isClear) {
                _showReminderToast('🔕 Đã xóa nhắc nhở', 'info');
            } else {
                const dt = new Date(newReminder);
                const formatted = dt.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                _showReminderToast(`🔔 Đã đặt nhắc lúc ${formatted}`, 'success');
            }
        }
    } catch (err) {
        console.error('[Reminder] Lưu thất bại:', err);
        _showReminderToast('❌ Lỗi khi lưu nhắc nhở', 'error');
    }
}

// ════════════════════════════════════════
//  SYNC BADGE TRÊN CARD
// ════════════════════════════════════════
function _syncReminderBadge(noteId, reminderAt) {
    const card = document.querySelector(`.note-card[data-note-id="${noteId}"]`);
    if (!card) return;

    // Cập nhật data attribute
    card.dataset.reminderAt = reminderAt || '';

    const tagsEl = card.querySelector('.note-card-tags');
    if (!tagsEl) return;

    // Xóa badge cũ
    tagsEl.querySelector('.tag-reminder')?.remove();

    if (reminderAt) {
        const dt = new Date(reminderAt);
        const day = String(dt.getDate()).padStart(2, '0');
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const hours = String(dt.getHours()).padStart(2, '0');
        const mins = String(dt.getMinutes()).padStart(2, '0');
        const label = `${day}/${month} ${hours}:${mins}`;

        const span = document.createElement('span');
        span.className = 'tag tag-reminder reminder-badge';
        span.dataset.reminderAt = reminderAt;
        span.innerHTML = `<i class="ph ph-bell"></i> ${label}`;
        tagsEl.appendChild(span);

        // Cập nhật ngay lập tức trạng thái khẩn cấp/quá hạn cho badge vừa tạo
        _updateReminderUIStates();
    }
}

// ════════════════════════════════════════
//  CẬP NHẬT ICON BELL CHO CẢ CARD VÀ MODAL
// ════════════════════════════════════════
function _updateBellIcon(hasReminder, noteId) {
    // 1. Cập nhật icon trên Modal
    const modalBtn = document.getElementById('modalBellBtn');
    const mc = document.querySelector('.keep-modal-content');
    if (modalBtn && mc && mc.getAttribute('data-note-id') === String(noteId)) {
        if (hasReminder) {
            modalBtn.className = 'ph-fill ph-bell action-icon';
            modalBtn.style.color = 'var(--accent)';
            modalBtn.title = 'Nhắc nhở (đã đặt)';
        } else {
            modalBtn.className = 'ph ph-bell action-icon';
            modalBtn.style.color = '';
            modalBtn.title = 'Nhắc nhở';
        }
    }

    // 2. Cập nhật icon trên tất cả các Card có noteId này
    document.querySelectorAll(`.note-card[data-note-id="${noteId}"] i.ph-bell`).forEach(icon => {
        // Chỉ chọn icon bell trên thanh actions, không lấy icon trong badge
        if (icon.classList.contains('action-icon')) {
            if (hasReminder) {
                icon.className = 'ph-fill ph-bell action-icon';
                icon.style.color = 'var(--accent)';
                icon.title = 'Nhắc nhở (đã đặt)';
            } else {
                icon.className = 'ph ph-bell action-icon';
                icon.style.color = '';
                icon.title = 'Nhắc nhở';
            }
        }
    });
}

// Đọc reminder khi mở modal — gọi từ openKeepModal sau khi render
function syncReminderToModal(cardEl) {
    const mc = document.querySelector('.keep-modal-content');
    const reminderAt = cardEl?.dataset.reminderAt || '';
    const noteId = mc.getAttribute('data-note-id');
    mc.dataset.reminderAt = reminderAt;
    _updateBellIcon(!!reminderAt, noteId);
}

// ════════════════════════════════════════
//  POLLING — Kiểm tra reminder mỗi 60 giây
// ════════════════════════════════════════
function _startReminderPolling() {
    // Chạy ngay lần đầu
    _checkDueReminders();
    _updateReminderUIStates();

    // Chạy lần tiếp theo sau 5 giây để ổn định
    setTimeout(() => {
        _checkDueReminders();
        _updateReminderUIStates();
    }, 5000);
    
    // Sau đó mỗi 60 giây
    setInterval(() => {
        _checkDueReminders();
        _updateReminderUIStates();
    }, 60_000);
}

/**
 * Duyệt qua các card trên màn hình để cập nhật visual (urgent/overdue)
 */
function _updateReminderUIStates() {
    const now = new Date();
    const badges = document.querySelectorAll('.tag-reminder[data-reminder-at]');
    let anyUrgent = false; // Biến cờ để kiểm soát thông báo trên Menu
    
    badges.forEach(badge => {
        const reminderTimeStr = badge.dataset.reminderAt;
        if (!reminderTimeStr) return;
        
        const reminderTime = new Date(reminderTimeStr);
        const diffMs = reminderTime - now;
        
        // Chỉ kiểm tra để bật cảnh báo trên Navbar, không thay đổi class của badge từng task
        if (diffMs > 0 && diffMs <= 5 * 60 * 1000) { 
            anyUrgent = true;
        }
    });

    // Cập nhật dấu chấm than trên thanh Menu Navbar
    const navTab = document.getElementById('navTabReminder');
    if (navTab) {
        if (anyUrgent) {
            navTab.classList.add('has-urgent');
        } else {
            navTab.classList.remove('has-urgent');
        }
    }
}

async function _checkDueReminders() {
    try {
        const res = await fetch('/api/reminders/due/');
        if (!res.ok) return;
        const data = await res.json();

        if (data.reminders && data.reminders.length > 0) {
            data.reminders.forEach(note => {
                _showBrowserNotification(note);
                _showReminderToast(`🔔 Nhắc nhở: ${note.title}`, 'reminder', note.id);
            });
        }
    } catch (err) {
        // Silent fail — không làm phiền user
    }
}

// ════════════════════════════════════════
//  BROWSER NOTIFICATION
// ════════════════════════════════════════
function _showBrowserNotification(note) {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
        const notif = new Notification('⏰ SmartNote — Nhắc nhở', {
            body: note.title,
            icon: '/static/images/logo.png',
            tag: `reminder-${note.id}`,   // Gộp notification cùng note
            requireInteraction: true,        // Giữ notification đến khi user dismiss
        });

        // Click vào notification → focus tab và mở note
        notif.onclick = () => {
            window.focus();
            notif.close();
            const card = document.querySelector(`.note-card[data-note-id="${note.id}"]`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => openKeepModal(card), 400);
            }
        };
    } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(perm => {
            if (perm === 'granted') _showBrowserNotification(note);
        });
    }
}

// ════════════════════════════════════════
//  IN-APP TOAST NOTIFICATION
// ════════════════════════════════════════
function _showReminderToast(message, type = 'info', noteId = null) {
    // Tạo container nếu chưa có
    let container = document.getElementById('reminderToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'reminderToastContainer';
        container.className = 'reminder-toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `reminder-toast reminder-toast-${type}`;
    toast.innerHTML = `
        <span class="toast-msg">${message}</span>
        ${noteId ? `<button class="toast-open-btn" onclick="_openNoteFromToast(${noteId}, this.closest('.reminder-toast'))">Xem</button>` : ''}
        <button class="toast-close-btn" onclick="this.closest('.reminder-toast').remove()">
            <i class="ph ph-x"></i>
        </button>
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => toast.classList.add('show'));

    // Auto dismiss sau 6 giây (reminder type sau 10 giây)
    const delay = type === 'reminder' ? 10000 : 4000;
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 350);
    }, delay);
}

function _openNoteFromToast(noteId, toastEl) {
    toastEl?.remove();
    const card = document.querySelector(`.note-card[data-note-id="${noteId}"]`);
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => openKeepModal(card), 400);
    }
}
