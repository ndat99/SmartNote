// ═══════════════════════════════════════
//  NOTE FORM (tạo ghi chú thường)
// ═══════════════════════════════════════
function expandForm() {
    document.getElementById('noteCollapsed').style.display    = 'none';
    document.getElementById('checklistExpanded').style.display = 'none';
    document.getElementById('noteExpanded').style.display     = 'block';
    document.querySelector('#noteExpanded input[name="title"]').focus();
}

// ═══════════════════════════════════════
//  CHECKLIST FORM (tạo checklist mới)
// ═══════════════════════════════════════
window._checklistColor = '';

function expandChecklistForm() {
    document.getElementById('noteCollapsed').style.display     = 'none';
    document.getElementById('noteExpanded').style.display      = 'none';
    document.getElementById('checklistExpanded').style.display = 'block';
    if (!document.querySelector('#checklistItemList .checklist-input-row')) {
        addChecklistInputItem();
    }
    document.getElementById('checklistTitle').focus();
}

function collapseChecklistForm() {
    document.getElementById('checklistExpanded').style.display = 'none';
    document.getElementById('noteCollapsed').style.display     = 'flex';
    document.getElementById('checklistTitle').value = '';
    document.getElementById('checklistItemList').innerHTML = '';
    window._checklistColor = '';
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
    const row  = document.createElement('div');
    row.className = 'checklist-input-row';
    row.innerHTML = `
        <span class="checklist-row-icon"><i class="fa-regular fa-circle" style="font-size:.78rem"></i></span>
        <input type="text" class="checklist-item-input" placeholder="Thêm mục…">
        <button type="button" class="checklist-row-delete" tabindex="-1">
            <i class="fa-solid fa-xmark"></i>
        </button>`;

    const input = row.querySelector('input');
    row.querySelector('.checklist-row-delete').addEventListener('click', () => _removeRow(row));
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter')                        { e.preventDefault(); addChecklistInputItem(row); }
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
    btn.disabled    = true;

    try {
        const res  = await fetch('/checklist/create/', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': (document.querySelector('[name=csrfmiddlewaretoken]')?.value || document.cookie.match(/csrftoken=([^;]+)/)?.[1] || '') },
            body:    JSON.stringify({ title, items, color: window._checklistColor }),
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
        btn.disabled    = false;
    }
}