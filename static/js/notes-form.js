// ═══════════════════════════════════════
//  NOTE FORM (tạo ghi chú thường)
// ═══════════════════════════════════════
function expandForm() {
    document.getElementById('noteCollapsed').style.display = 'none';
    document.getElementById('checklistExpanded').style.display = 'none';
    document.getElementById('noteExpanded').style.display = 'block';
    document.querySelector('#noteExpanded input[name="title"]').focus();
}

// ═══════════════════════════════════════
//  CHECKLIST FORM (tạo checklist mới)
// ═══════════════════════════════════════
window._checklistColor = '';

function expandChecklistForm() {
    document.getElementById('noteCollapsed').style.display = 'none';
    document.getElementById('noteExpanded').style.display = 'none';
    document.getElementById('checklistExpanded').style.display = 'block';
    if (!document.querySelector('#checklistItemList .checklist-input-row')) {
        addChecklistInputItem();
    }
    document.getElementById('checklistTitle').focus();
}

function collapseChecklistForm() {
    document.getElementById('checklistExpanded').style.display = 'none';
    document.getElementById('noteCollapsed').style.display = 'flex';
    document.getElementById('checklistTitle').value = '';
    document.getElementById('checklistItemList').innerHTML = '';
    
    // Clear images
    if (window._checklistImageDT) window._checklistImageDT = new DataTransfer();
    const ckImgInput = document.getElementById('checklistImageInput');
    if (ckImgInput) ckImgInput.value = '';
    handleChecklistImages(ckImgInput);
    
    window._checklistColor = '';
    window._checklistReminderAt = null;
    const fw = document.getElementById('formWrapper');
    fw ? fw.removeAttribute('data-color') : null;
    const none = document.querySelector('#checklistColorPicker .swatch-none');
    if (none) {
        document.querySelectorAll('#checklistColorPicker .color-swatch')
            .forEach(s => s.classList.remove('active'));
        none.classList.add('active');
    }
}

function focusFirstChecklistItem() {
    const first = document.querySelector('#checklistItemList .checklist-item-input');
    first ? first.focus() : addChecklistInputItem();
}

function addChecklistInputItem(afterRow) {
    const list = document.getElementById('checklistItemList');
    const row = document.createElement('div');
    row.className = 'checklist-input-row';
    row.innerHTML = `
        <span class="checklist-row-icon"><i class="ph ph-circle" style="font-size:.78rem"></i></span>
        <input type="text" class="checklist-item-input" placeholder="Thêm mục…">
        <button type="button" class="checklist-row-delete" tabindex="-1">
            <i class="ph ph-x"></i>
        </button>`;

    const input = row.querySelector('input');
    row.querySelector('.checklist-row-delete').addEventListener('click', () => _removeRow(row));
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); addChecklistInputItem(row); }
        else if (e.key === 'Backspace' && !input.value) { e.preventDefault(); _removeRow(row); }
    });

    afterRow ? afterRow.insertAdjacentElement('afterend', row) : list.appendChild(row);
    input.focus();
}

function _removeRow(row) {
    const rows = [...document.querySelectorAll('#checklistItemList .checklist-input-row')];
    if (rows.length <= 1) { row.querySelector('input').value = ''; return; }
    const i = rows.indexOf(row);
    rows[i > 0 ? i - 1 : 1].querySelector('input').focus();
    row.remove();
}

async function submitChecklist() {
    const title = document.getElementById('checklistTitle').value.trim();
    const items = [...document.querySelectorAll('#checklistItemList .checklist-item-input')]
        .map(i => i.value.trim()).filter(Boolean);

    if (!title && !items.length) { collapseChecklistForm(); return; }

    const btn = document.querySelector('#checklistExpanded .btn-close-note');
    btn.textContent = 'Đang lưu…';
    btn.disabled = true;

    try {
        const res = await fetch('/checklist/create/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': (document.querySelector('[name=csrfmiddlewaretoken]')?.value || document.cookie.match(/csrftoken=([^;]+)/)?.[1] || '') },
            body: JSON.stringify({ title, items, color: window._checklistColor, reminder_at: window._checklistReminderAt || null }),
        });
        const data = await res.json();
        if (data.ok && !data.skipped) {
            collapseChecklistForm();
            // Inject card vào DOM, không cần reload trang
            if (data.card_html) {
                const grid = document.getElementById('notes-grid');
                if (grid) {
                    const col = document.createElement('div');
                    col.className = 'col-12 col-sm-6 col-md-4 col-lg-3';
                    col.innerHTML = data.card_html;
                    grid.prepend(col);
                    // Khởi tạo progress bar và animation cho card mới
                    const card = col.querySelector('.note-card');
                    if (card) {
                        card.style.animationDelay = '0ms';
                        const fill = card.querySelector('.checklist-progress-fill[data-progress]');
                        if (fill) fill.style.width = fill.dataset.progress + '%';
                    }
                    // Xóa empty state nếu có
                    document.getElementById('empty-state-col')?.remove();
                }
            }
        } else {
            collapseChecklistForm();
        }
    } catch (err) {
        console.error('[Checklist] Tạo thất bại:', err);
        btn.textContent = 'Lưu & Đóng';
        btn.disabled = false;
    }
}

// ═══════════════════════════════════════
//  IMAGE PREVIEW
// ═══════════════════════════════════════

window._formImageDT = new DataTransfer();
window._checklistImageDT = new DataTransfer();

function handleFormImages(input) {
    _mergeFiles(input, window._formImageDT);
    _renderImagePreview(input, document.getElementById('formImagePreview'));
}

function handleChecklistImages(input) {
    _mergeFiles(input, window._checklistImageDT);
    _renderImagePreview(input, document.getElementById('checklistImagePreview'));
}

function _mergeFiles(input, dt) {
    if (input.files.length > 0) {
        for (let file of input.files) {
            let exists = false;
            for(let old of dt.files) {
                if(old.name === file.name && old.size === file.size) exists = true;
            }
            if (!exists) dt.items.add(file);
        }
    }
    input.files = dt.files;
}

function _renderImagePreview(input, container) {
    container.innerHTML = '';
    const files = input.files;
    if (!files || files.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    container.style.flexWrap = 'nowrap';
    container.style.overflowX = 'auto';
    container.style.gap = '8px';
    container.style.padding = '12px 16px 0';
    
    // Đọc URL tạm cho các ảnh
    Array.from(files).forEach((file, index) => {
        const url = URL.createObjectURL(file);
        const imgWrap = document.createElement('div');
        imgWrap.className = 'modal-img-wrap'; // tận dụng css hover
        imgWrap.style.position = 'relative';
        imgWrap.style.flex = '0 0 auto';
        imgWrap.style.width = files.length === 1 ? '100%' : (files.length === 2 ? 'calc(50% - 4px)' : '100px');
        imgWrap.style.height = files.length === 1 ? '200px' : (files.length === 2 ? '150px' : '100px');
        imgWrap.style.borderRadius = '8px';
        imgWrap.style.overflow = 'hidden';
        
        imgWrap.innerHTML = `
            <img src="${url}" style="width:100%; height:100%; object-fit:cover; display:block;">
            <button type="button" class="delete-img-btn" style="top:5px; right:5px; width:26px; height:26px; font-size:0.85rem;" onclick="removeDraftImage('${input.id}', ${index}, event)"><i class="ph ph-trash"></i></button>
        `;
        container.appendChild(imgWrap);
    });
}

function removeDraftImage(inputId, index, event) {
    event.stopPropagation();
    event.preventDefault();
    const input = document.getElementById(inputId);
    if (!input) return;
    
    // DataTransfer API allows mutating FileList
    const dt = new DataTransfer();
    const files = input.files;
    for (let i = 0; i < files.length; i++) {
        if (i !== index) {
            dt.items.add(files[i]);
        }
    }
    input.files = dt.files; // Reset inner files
    
    // Update global state
    if (inputId === 'formImageInput') {
        window._formImageDT = dt;
        handleFormImages(input);
    }
    else if (inputId === 'checklistImageInput') {
        window._checklistImageDT = dt;
        handleChecklistImages(input);
    }
}