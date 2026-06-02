// ═══════════════════════════════════════════════════════
//  NOTIFICATION MODULE  — Notelygent
// ═══════════════════════════════════════════════════════

function _notificationCsrf() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value
        || document.cookie.match(/csrftoken=([^;]+)/)?.[1] || '';
}

document.addEventListener('DOMContentLoaded', () => {
    // Fetch notifications initially
    fetchNotifications();

    // Re-fetch occasionally (optional) or after reminder check
    // We can hook into _checkDueReminders if we want, but for now we poll every 60s
    setInterval(fetchNotifications, 60_000);
});

async function fetchNotifications() {
    try {
        const res = await fetch('/api/notifications/');
        if (!res.ok) return;
        const data = await res.json();
        
        renderNotifications(data.notifications, data.unread_count);
    } catch (err) {
        console.error('Error fetching notifications:', err);
    }
}

function renderNotifications(notifications, unreadCount) {
    const badge = document.getElementById('notificationBadge');
    const list = document.getElementById('notificationList');
    
    if (!badge || !list) return;

    // Update Badge
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        badge.style.setProperty('display', 'flex', 'important');
    } else {
        badge.style.setProperty('display', 'none', 'important');
    }

    // Render List
    if (notifications.length === 0) {
        list.innerHTML = `
            <li class="p-4 text-center text-muted" style="font-size: 0.9rem;">
                <i class="ph ph-bell-slash mb-2" style="font-size: 1.5rem;"></i><br>
                Chưa có thông báo nào
            </li>
        `;
        return;
    }

    list.innerHTML = notifications.map(n => `
        <li class="p-3 border-bottom notification-item" style="cursor: pointer; background: ${n.is_read ? '#fff' : '#e8eeff'};" 
            onclick="_handleNotificationClick(${n.note_id})">
            <div class="d-flex align-items-start gap-3">
                <div class="rounded-circle d-flex align-items-center justify-content-center" style="width: 36px; height: 36px; background: ${n.is_read ? '#f3f4f6' : '#4a6cf7'}; color: ${n.is_read ? '#6b7280' : '#fff'}; flex-shrink: 0;">
                    <i class="ph ph-bell"></i>
                </div>
                <div>
                    <div class="fw-medium text-dark" style="font-size: 0.95rem; line-height: 1.4;">${n.message}</div>
                    <div class="text-muted mt-1" style="font-size: 0.8rem;">
                        ${_timeAgo(n.created_at)}
                    </div>
                </div>
            </div>
        </li>
    `).join('');
}

async function markNotificationsAsRead() {
    const badge = document.getElementById('notificationBadge');
    if (badge && badge.style.display !== 'none') {
        try {
            await fetch('/api/notifications/mark-read/', {
                method: 'POST',
                headers: { 'X-CSRFToken': _notificationCsrf() }
            });
            // Ẩn badge và cập nhật UI (giả lập)
            badge.style.setProperty('display', 'none', 'important');
            const items = document.querySelectorAll('.notification-item');
            items.forEach(item => {
                item.style.background = '#fff';
                const iconBox = item.querySelector('.rounded-circle');
                if (iconBox) {
                    iconBox.style.background = '#f3f4f6';
                    iconBox.style.color = '#6b7280';
                }
            });
        } catch (err) {
            console.error('Lỗi khi mark as read:', err);
        }
    }
}

function _handleNotificationClick(noteId) {
    if (!noteId) return;
    const card = document.querySelector(`.note-card[data-note-id="${noteId}"]`);
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
            if (typeof openKeepModal === 'function') openKeepModal(card);
        }, 400);
    }
}

function _timeAgo(dateStr) {
    const date = new Date(dateStr);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return "Vừa xong";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
}
