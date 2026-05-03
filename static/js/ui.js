// ═══════════════════════════════════════
//  THEME (dark / light)
// ═══════════════════════════════════════
function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('sn-theme', next);
    _applyThemeIcons(next === 'dark');
    _applyAvatar(next === 'dark');
}

function _applyThemeIcons(isDark) {
    const light = document.getElementById('icon-light');
    const dark  = document.getElementById('icon-dark');
    if (light) light.style.display = isDark ? 'none' : '';
    if (dark)  dark.style.display  = isDark ? ''     : 'none';
}

function _applyAvatar(isDark) {
    const av = document.getElementById('defaultAvatar');
    if (!av) return;
    const name   = av.getAttribute('data-name');
    const params = isDark ? 'background=2e3140&color=7b9fff' : 'background=e8eeff&color=4a6cf7';
    av.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&${params}&bold=true`;
}

// Init on page load
(function () {
    const isDark = localStorage.getItem('sn-theme') === 'dark';
    _applyThemeIcons(isDark);
    _applyAvatar(isDark);
})();
// ---------------------------------------
//  LABEL MANAGER
// ---------------------------------------
function getCSRFToken() {
    let cookieValue = null;
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, 10) === ('csrftoken=')) {
            cookieValue = decodeURIComponent(cookie.substring(10));
            break;
        }
    }
    return cookieValue;
}

document.addEventListener('DOMContentLoaded', () => {
    const labelModalEl = document.getElementById('labelManagerModal');
    if (!labelModalEl) return;

    labelModalEl.addEventListener('show.bs.modal', loadLabels);

    const createForm = document.getElementById('createLabelForm');
    if (createForm) {
        createForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('newLabelInput');
            const name = input.value.trim();
            if (name) {
                createLabel(name, input);
            }
        });
    }
});

function loadLabels() {
    const listContainer = document.getElementById('labelManagerList');
    listContainer.innerHTML = '<div class="text-center text-muted py-3"><div class="spinner-border spinner-border-sm" role="status"></div></div>';

    fetch('/categories/')
        .then(res => res.json())
        .then(data => {
            listContainer.innerHTML = '';
            let allCats = [];
            if (data.system) {
                data.system.forEach(c => allCats.push({...c, isSystem: true}));
            }
            if (data.user) {
                data.user.forEach(c => allCats.push({...c, isSystem: false}));
            }

            if (allCats.length > 0) {
                allCats.forEach(cat => {
                    listContainer.appendChild(createLabelElement(cat));
                });
            } else {
                listContainer.innerHTML = '<div class="text-center text-muted py-3 small">Chưa có nhãn nào.</div>';
            }
            
            // Refresh sidebar filter tags if search.js is loaded
            if (typeof renderSidebarTags === 'function') {
                renderSidebarTags(data);
            }
        })
        .catch(err => {
            console.error('Error loading labels:', err);
            listContainer.innerHTML = '<div class="text-center text-danger py-3 small">Lỗi tải dữ liệu.</div>';
        });
}

function createLabelElement(cat) {
    const div = document.createElement('div');
    div.className = 'label-item d-flex align-items-center justify-content-between';
    div.id = `label-item-${cat.id}`;
    
    const isSystem = cat.isSystem;
    
    const inputHtml = isSystem 
        ? `<input type="text" class="label-input text-muted" value="${cat.name}" readonly title="Nhãn mặc định">`
        : `<input type="text" class="label-input" value="${cat.name}" onblur="renameLabel(${cat.id}, this)" onkeydown="if(event.key === 'Enter') this.blur();">`;
        
    const deleteHtml = isSystem
        ? `<button class="label-btn text-muted" style="cursor:not-allowed;" title="Không thể xoá nhãn mặc định" disabled><i class="ph ph-trash"></i></button>`
        : `<button class="label-btn label-btn-delete" title="Xóa nhãn" onclick="deleteLabel(${cat.id})"><i class="ph ph-trash"></i></button>`;

    div.innerHTML = `
        <div class="d-flex align-items-center flex-grow-1 me-2" style="min-width: 0;">
            <i class="ph ph-tag ${isSystem ? 'text-primary' : 'text-muted'} me-2" style="font-size: 1.1rem;"></i>
            ${inputHtml}
        </div>
        <div class="label-item-actions d-flex align-items-center">
            ${deleteHtml}
        </div>
    `;
    return div;
}

function createLabel(name, inputEl) {
    fetch('/category/create/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ name: name })
    })
    .then(res => res.json())
    .then(data => {
        if (data.ok) {
            inputEl.value = '';
            loadLabels();
        } else {
            alert(data.error || 'Lỗi khi tạo nhãn');
        }
    })
    .catch(err => console.error(err));
}

function renameLabel(id, inputEl) {
    const newName = inputEl.value.trim();
    if (!newName) {
        alert('Tên nhãn không được để trống');
        loadLabels(); // revert back
        return;
    }
    
    // Save original value to detect if actually changed (using dataset)
    if (inputEl.dataset.originalName === newName) return;
    
    fetch(`/category/update/${id}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ name: newName })
    })
    .then(res => res.json())
    .then(data => {
        if (data.ok) {
            inputEl.dataset.originalName = data.name;
            loadLabels(); // refresh to update sidebar as well
        } else {
            alert(data.error || 'Lỗi khi đổi tên nhãn');
            loadLabels(); // revert back
        }
    })
    .catch(err => console.error(err));
}

function deleteLabel(id) {
    if (!confirm('Bạn có chắc chắn muốn xoá nhãn này? Ghi chú đang dùng nhãn này sẽ không bị xoá.')) return;
    
    fetch(`/category/delete/${id}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.ok) {
            loadLabels();
        } else {
            alert(data.error || 'Lỗi khi xoá nhãn');
        }
    })
    .catch(err => console.error(err));
}
