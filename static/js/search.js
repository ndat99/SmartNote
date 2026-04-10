const _filters = {
    types:      new Set(),   // 'note' | 'checklist' | 'image'
    colors:     new Set(),   // 'red' | 'blue' | ...
    priorities: new Set(),   // 'high' | 'medium' | 'low'
    categories: new Set(),   // category id (string)
    task:       false,
};

// ────────────────────────────────────────
//  TAG SECTION — populate from DOM (chạy khi load trang)
// ────────────────────────────────────────
function _populateTagSection() {
    var list = document.getElementById('filterTagList');
    if (!list) return;

    var cats = new Map();
    document.querySelectorAll('.note-card').forEach(function (card) {
        var id = card.dataset.categoryId;
        if (!id) return;
        // Tìm span .tag-category trong phần tags của card
        var tagSpan = card.querySelector('.tag-category[data-category-id]');
        if (!tagSpan) return;
        // Lấy text thuần — duyệt text nodes để bỏ qua icon
        var name = '';
        tagSpan.childNodes.forEach(function(node) {
            if (node.nodeType === Node.TEXT_NODE) name += node.textContent;
        });
        name = name.trim();
        if (!name) name = tagSpan.innerText.replace(/^\S+\s+/, '').trim();
        if (id && name) cats.set(id, name);
    });

    var section = document.getElementById('filterTagSection');
    if (cats.size === 0) {
        if (section) section.style.display = 'none';
        return;
    }
    if (section) section.style.display = '';

    list.innerHTML = '';
    cats.forEach(function (name, id) {
        var chip = document.createElement('div');
        chip.className = 'filter-chip' + (_filters.categories.has(id) ? ' active' : '');
        chip.dataset.catId = id;
        chip.innerHTML = '<i class="ph ph-tag"></i> ' + _escHtml(name);
        chip.addEventListener('click', function () { _toggleFilter('categories', id, chip); });
        list.appendChild(chip);
    });
}

// ────────────────────────────────────────
//  X BUTTON — hiện khi có filter hoặc có text
// ────────────────────────────────────────
function _updateClearBtn() {
    var hasFilter =
        _filters.types.size > 0 ||
        _filters.colors.size > 0 ||
        _filters.priorities.size > 0 ||
        _filters.categories.size > 0 ||
        _filters.task;
    var hasText = ((document.getElementById('globalSearch') || {}).value || '').trim().length > 0;
    var shouldShow = hasFilter || hasText;

    // Cập nhật class wrapper
    var wrap = document.querySelector('.filter-search-wrap');
    if (wrap) wrap.classList.toggle('has-filter', shouldShow);

    // Force inline style — đảm bảo hoạt động kể cả trình duyệt không hỗ trợ :has()
    var btn = document.getElementById('btnClearFilters');
    if (btn) {
        btn.style.opacity = shouldShow ? '1' : '0';
        btn.style.pointerEvents = shouldShow ? 'all' : 'none';
    }
}

// ────────────────────────────────────────
//  FILTER TOGGLES (gọi từ HTML onclick)
// ────────────────────────────────────────
function _toggleTypeFilter(el, type) {
    _toggleFilter('types', type, el);
}

function _toggleColorFilter(el, color) {
    _toggleFilter('colors', color, el);
}

function _togglePriorityFilter(el, priority) {
    _toggleFilter('priorities', priority, el);
}

function _toggleTaskFilter(el) {
    _filters.task = !_filters.task;
    el.classList.toggle('active', _filters.task);
    _applyFilters();
    _updateClearBtn();
}

function _toggleFilter(group, value, el) {
    if (_filters[group].has(value)) {
        _filters[group].delete(value);
        if (el) el.classList.remove('active');
    } else {
        _filters[group].add(value);
        if (el) el.classList.add('active');
    }
    _applyFilters();
    _updateClearBtn();
}

// ────────────────────────────────────────
//  APPLY FILTERS
//  Logic: OR trong cùng nhóm, AND giữa các nhóm
// ────────────────────────────────────────
function _applyFilters() {
    var query = ((document.getElementById('globalSearch') || {}).value || '').trim().toLowerCase();

    var hasFilters =
        _filters.types.size > 0 ||
        _filters.colors.size > 0 ||
        _filters.priorities.size > 0 ||
        _filters.categories.size > 0 ||
        _filters.task;

    var hasQuery = query.length > 0;

    document.querySelectorAll('.note-card').forEach(function (card) {
        var wrapper = card.closest('[class*="col-"]') || card;

        if (!hasFilters && !hasQuery) {
            wrapper.style.display = '';
            return;
        }

        var visible = true;

        // Nhóm Loại (OR trong nhóm)
        if (_filters.types.size > 0) {
            var noteType  = card.dataset.noteType || 'note';
            var hasImages = !!card.querySelector('.note-card-images');
            var typeMatch = false;
            if (_filters.types.has('note')      && noteType === 'note')       typeMatch = true;
            if (_filters.types.has('checklist') && noteType === 'checklist')  typeMatch = true;
            if (_filters.types.has('image')     && hasImages)                  typeMatch = true;
            if (!typeMatch) visible = false;
        }

        // Nhóm Màu nền (OR trong nhóm)
        if (visible && _filters.colors.size > 0) {
            var color = card.dataset.color || '';
            if (!_filters.colors.has(color)) visible = false;
        }

        // Nhóm Priority (OR trong nhóm)
        if (visible && _filters.priorities.size > 0) {
            var p = (card.dataset.priority || '').toLowerCase();
            if (!_filters.priorities.has(p)) visible = false;
        }

        // Nhóm Nhãn / Category (OR trong nhóm)
        if (visible && _filters.categories.size > 0) {
            var catId = card.dataset.categoryId || '';
            if (!_filters.categories.has(catId)) visible = false;
        }

        // Nhóm Task
        if (visible && _filters.task) {
            if (!card.querySelector('.tag-task-ai, .tag-task-user')) visible = false;
        }

        // Text query (AND với tất cả filter)
        if (visible && hasQuery) {
            var title  = ((card.querySelector('.note-card-title')  || {}).innerText  || '').toLowerCase();
            var body   = ((card.querySelector('.note-card-body')   || {}).innerText   || '').toLowerCase();
            var checkItems = card.querySelectorAll('.checklist-preview-item span');
            var checks = Array.prototype.map.call(checkItems, function(el){ return el.innerText.toLowerCase(); }).join(' ');
            if (!title.includes(query) && !body.includes(query) && !checks.includes(query)) {
                visible = false;
            }
        }

        wrapper.style.display = visible ? '' : 'none';
    });

    _updateEmptyState();
}

// ────────────────────────────────────────
//  EMPTY STATE
// ────────────────────────────────────────
function _updateEmptyState() {
    var allWrappers = document.querySelectorAll('#notes-grid > [class*="col-"], #pinned-grid > [class*="col-"]');
    var noResults   = allWrappers.length > 0 && Array.prototype.every.call(allWrappers, function(w){ return w.style.display === 'none'; });
    var msg = document.getElementById('searchNoResults');
    if (noResults) {
        if (!msg) {
            msg = document.createElement('div');
            msg.id = 'searchNoResults';
            msg.className = 'col-12';
            msg.innerHTML = '<div class="empty-state"><i class="ph ph-magnifying-glass empty-state-icon"></i><h5>Không tìm thấy ghi chú nào</h5><p style="font-size:0.85rem;color:var(--text-dim);">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p></div>';
            var grid = document.getElementById('notes-grid');
            if (grid) grid.appendChild(msg);
        }
    } else {
        if (msg) msg.remove();
    }
}

// ────────────────────────────────────────
//  CLEAR
// ────────────────────────────────────────
function clearSearchFilters() {
    _filters.types.clear();
    _filters.colors.clear();
    _filters.priorities.clear();
    _filters.categories.clear();
    _filters.task = false;

    // Reset active class trên filter panel
    var panel = document.getElementById('filterPanel');
    if (panel) {
        panel.querySelectorAll('.active').forEach(function(el){ el.classList.remove('active'); });
    }

    var input = document.getElementById('globalSearch');
    if (input) input.value = '';

    _applyFilters();
    _updateClearBtn();
}

// ────────────────────────────────────────
//  INIT
// ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('globalSearch');
    if (input) {
        input.addEventListener('input', function() {
            _applyFilters();
            _updateClearBtn();
        });
    }
    _populateTagSection();
});

function _escHtml(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
}
