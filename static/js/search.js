/**
 * search.js — API-based search + client-side filter state
 *
 * Thay thế DOM-filtering cũ bằng real API call tới /api/search/
 * Debounce 300ms, hỗ trợ pagination động.
 *
 * Flow:
 *  1. User gõ hoặc chọn filter → _scheduleSearch()
 *  2. Sau 300ms debounce → _fetchSearch(page=1)
 *  3. GET /api/search/?q=...&type=...&page=N&context=...
 *  4. Nhận JSON { html, pinned_html, page, total_pages, ... }
 *  5. Inject HTML vào #notes-grid và #pinned-grid
 *  6. Render pagination controls mới vào #pagination-container
 */

'use strict';

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
const _filters = {
    types:      new Set(),   // 'note' | 'checklist' | 'image'
    colors:     new Set(),   // 'berry' | 'red' | ...
    priorities: new Set(),   // 'high' | 'medium' | 'low'
    categories: new Set(),   // category id (string)
    task:       false,
    calendarDate: null,
};

let _currentPage  = 1;
let _totalPages   = 1;
let _searchTimer  = null;
let _lastQuery    = null;   // para stringify để tránh duplicate request
let _isSearchMode = false;  // true khi đang có filter/query active

/* ══════════════════════════════════════════
   CONTEXT (home | archive | trash)
══════════════════════════════════════════ */
function _getContext() {
    var meta = document.getElementById('search-meta');
    return (meta && meta.dataset.context) || 'home';
}

/* ══════════════════════════════════════════
   DEBOUNCED SEARCH TRIGGER
══════════════════════════════════════════ */
function _scheduleSearch(resetPage) {
    if (resetPage) _currentPage = 1;
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(_doSearch, 300);
}

/* ══════════════════════════════════════════
   BUILD QUERY PARAMS
══════════════════════════════════════════ */
function _buildParams(page) {
    var q   = ((document.getElementById('globalSearch') || {}).value || '').trim();
    var ctx = _getContext();

    var params = new URLSearchParams();
    params.set('context', ctx);
    params.set('page', page || _currentPage);

    if (q) params.set('q', q);
    
    if (_filters.calendarDate) params.set('date', _filters.calendarDate);

    _filters.types.forEach(function(t)      { params.append('type',     t); });
    _filters.colors.forEach(function(c)     { params.append('color',    c); });
    _filters.priorities.forEach(function(p) { params.append('priority', p); });
    _filters.categories.forEach(function(c) { params.append('category', c); });
    if (_filters.task) params.set('task', '1');

    return params;
}

/* ══════════════════════════════════════════
   CHECK: có filter/query nào active không
══════════════════════════════════════════ */
function _hasActiveSearch() {
    var q = ((document.getElementById('globalSearch') || {}).value || '').trim();
    return q.length > 0 ||
        _filters.types.size > 0 ||
        _filters.colors.size > 0 ||
        _filters.priorities.size > 0 ||
        _filters.categories.size > 0 ||
        _filters.task ||
        _filters.calendarDate !== null;
}

/* ══════════════════════════════════════════
   MAIN SEARCH
══════════════════════════════════════════ */
function _doSearch() {
    if (!_hasActiveSearch()) {
        // Không có gì → khôi phục server-rendered content
        _restoreServerContent();
        return;
    }

    var params  = _buildParams(_currentPage);
    var paramStr = params.toString();

    // Tránh gọi API 2 lần với cùng params
    if (paramStr === _lastQuery) return;
    _lastQuery = paramStr;

    var grid   = document.getElementById('notes-grid');
    var paged  = document.getElementById('pagination-container');

    // Loading state
    if (grid) {
        grid.style.opacity = '0.5';
        grid.style.pointerEvents = 'none';
    }

    var url = '/api/search/?' + paramStr;

    fetch(url, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin',
    })
    .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
    })
    .then(function(data) {
        _isSearchMode = true;
        _currentPage  = data.page;
        _totalPages   = data.total_pages;

        // ── Inject regular notes ──
        if (grid) {
            grid.innerHTML = data.html || _emptyStateHtml();
            grid.style.opacity = '';
            grid.style.pointerEvents = '';
            _animateCards(grid);
            _initProgressBars(grid);
        }

        // ── Inject pinned notes (chỉ home) ──
        var context = _getContext();
        if (context === 'home') {
            _updatePinnedSection(data.pinned_html || '');
        }

        // Apply doodles to new cards
        if (window.applyDoodles) window.applyDoodles();

        // ── Render dynamic pagination ──
        if (paged) {
            paged.innerHTML = _renderPaginationHtml(data);
        }

        _updateClearBtn();
    })
    .catch(function(err) {
        console.error('[Search] fetch error:', err);
        if (grid) {
            grid.style.opacity = '';
            grid.style.pointerEvents = '';
        }
    });
}

/* ══════════════════════════════════════════
   RESTORE SERVER CONTENT (khi xóa search)
══════════════════════════════════════════ */
var _serverHtml        = null;
var _serverPinnedHtml  = null;
var _serverPaginHtml   = null;

function _saveServerContent() {
    var grid  = document.getElementById('notes-grid');
    var pinGrid = document.getElementById('pinned-grid');
    var paged = document.getElementById('pagination-container');

    if (grid  && _serverHtml       === null) _serverHtml       = grid.innerHTML;
    if (pinGrid && _serverPinnedHtml === null) _serverPinnedHtml = pinGrid ? pinGrid.innerHTML : '';
    if (paged && _serverPaginHtml  === null) _serverPaginHtml  = paged.innerHTML;
}

function _restoreServerContent() {
    if (!_isSearchMode) return;
    _isSearchMode = false;
    _lastQuery    = null;

    var grid   = document.getElementById('notes-grid');
    var pinGrid = document.getElementById('pinned-grid');
    var paged  = document.getElementById('pagination-container');

    if (grid   && _serverHtml      !== null) { grid.innerHTML   = _serverHtml;      _animateCards(grid); _initProgressBars(grid); }
    if (pinGrid && _serverPinnedHtml !== null) pinGrid.innerHTML = _serverPinnedHtml;
    if (paged  && _serverPaginHtml  !== null) paged.innerHTML   = _serverPaginHtml;

    // Apply doodles again (in case saved html didn't have them)
    if (window.applyDoodles) window.applyDoodles();

    // Cập nhật trạng thái pinned section header
    _updatePinnedSectionVisibility();
    _updateClearBtn();
}

/* ══════════════════════════════════════════
   PINNED SECTION UPDATE (home only)
══════════════════════════════════════════ */
function _updatePinnedSection(pinnedHtml) {
    var pinGrid  = document.getElementById('pinned-grid');
    var pinHeader = document.getElementById('pinned-header');

    if (!pinGrid) return;

    pinGrid.innerHTML = pinnedHtml;
    _animateCards(pinGrid);
    _initProgressBars(pinGrid);

    // Ẩn/hiện header
    if (pinHeader) {
        pinHeader.style.display = pinnedHtml.trim() ? '' : 'none';
    }
    _updatePinnedSectionVisibility();
}

function _updatePinnedSectionVisibility() {
    var pinGrid   = document.getElementById('pinned-grid');
    var pinHeader = document.getElementById('pinned-header');
    if (!pinGrid || !pinHeader) return;
    var hasPinned = pinGrid.querySelector('.note-card') !== null;
    pinHeader.style.display = hasPinned ? '' : 'none';
}

/* ══════════════════════════════════════════
   DYNAMIC PAGINATION HTML
══════════════════════════════════════════ */
function _renderPaginationHtml(data) {
    if (data.total_pages <= 1) return '';

    var cur   = data.page;
    var total = data.total_pages;
    var html  = '<nav class="notes-pagination" aria-label="Phân trang ghi chú">';
    html += '<div class="pagination-inner">';

    // Prev
    if (data.has_previous) {
        html += '<a class="page-btn page-btn-nav" href="#" onclick="searchGoPage(' + data.previous_page + ');return false;" aria-label="Trang trước"><i class="ph ph-caret-left"></i><span>Prev</span></a>';
    } else {
        html += '<span class="page-btn page-btn-nav disabled"><i class="ph ph-caret-left"></i><span>Prev</span></span>';
    }

    // Trang đầu
    if (cur > 3) {
        html += '<a class="page-btn" href="#" onclick="searchGoPage(1);return false;">1</a>';
        if (cur > 4) html += '<span class="page-ellipsis">…</span>';
    }

    // Trang xung quanh ±2
    for (var i = Math.max(1, cur - 2); i <= Math.min(total, cur + 2); i++) {
        if (i === cur) {
            html += '<span class="page-btn page-btn-current" aria-current="page">' + i + '</span>';
        } else {
            html += '<a class="page-btn" href="#" onclick="searchGoPage(' + i + ');return false;">' + i + '</a>';
        }
    }

    // Trang cuối
    if (cur < total - 2) {
        if (cur < total - 3) html += '<span class="page-ellipsis">…</span>';
        html += '<a class="page-btn" href="#" onclick="searchGoPage(' + total + ');return false;">' + total + '</a>';
    }

    // Next
    if (data.has_next) {
        html += '<a class="page-btn page-btn-nav" href="#" onclick="searchGoPage(' + data.next_page + ');return false;" aria-label="Trang tiếp"><span>Next</span><i class="ph ph-caret-right"></i></a>';
    } else {
        html += '<span class="page-btn page-btn-nav disabled"><span>Next</span><i class="ph ph-caret-right"></i></span>';
    }

    html += '</div>';
    html += '<div class="pagination-info">Trang ' + cur + ' / ' + total + ' <span class="pagination-total">(' + data.total_count + ' ghi chú)</span></div>';
    html += '</nav>';
    return html;
}

/* Gọi từ nút phân trang động */
function searchGoPage(page) {
    _currentPage = page;
    _lastQuery   = null;   // force re-fetch
    _doSearch();
    // Scroll lên đầu notes grid
    var grid = document.getElementById('notes-grid');
    if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ══════════════════════════════════════════
   EMPTY STATE HTML
══════════════════════════════════════════ */
function _emptyStateHtml() {
    return '<div class="col-12"><div class="empty-state">' +
        '<i class="ph ph-magnifying-glass empty-state-icon" style="font-size:3rem;margin-bottom:12px;display:block;color:var(--text-dim);"></i>' +
        '<h5>Không tìm thấy ghi chú nào</h5>' +
        '<p style="font-size:0.85rem;color:var(--text-dim);">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>' +
        '</div></div>';
}

/* ══════════════════════════════════════════
   ANIMATIONS & PROGRESS BARS
══════════════════════════════════════════ */
function _animateCards(container) {
    container.querySelectorAll('.note-card').forEach(function(card) {
        card.style.animationDelay = (parseInt(card.dataset.index || 0) * 60) + 'ms';
    });
}

function _initProgressBars(container) {
    container.querySelectorAll('.checklist-progress-fill[data-progress]').forEach(function(el) {
        el.style.width = el.dataset.progress + '%';
    });
}

/* ══════════════════════════════════════════
   TAG SECTION — populate từ server (lần đầu)
══════════════════════════════════════════ */
function _populateTagSection() {
    var list = document.getElementById('filterTagList');
    if (!list) return;

    var cats = new Map();
    document.querySelectorAll('.note-card').forEach(function(card) {
        var id = card.dataset.categoryId;
        if (!id) return;
        var tagSpan = card.querySelector('.tag-category[data-category-id]');
        if (!tagSpan) return;
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
    cats.forEach(function(name, id) {
        var chip = document.createElement('div');
        chip.className = 'filter-chip' + (_filters.categories.has(id) ? ' active' : '');
        chip.dataset.catId = id;
        chip.innerHTML = '<i class="ph ph-tag"></i> ' + _escHtml(name);
        chip.addEventListener('click', function() { _toggleFilter('categories', id, chip); });
        list.appendChild(chip);
    });
}

function _toggleTagFilter(name) {
    // Tìm id từ DOM
    var chip = document.querySelector('[data-cat-id]');
    // Sẽ được handle qua click event
}

/* ══════════════════════════════════════════
   CLEAR BUTTON STATE
══════════════════════════════════════════ */
function _updateClearBtn() {
    var shouldShow = _hasActiveSearch();
    var wrap = document.querySelector('.filter-search-wrap');
    if (wrap) wrap.classList.toggle('has-filter', shouldShow);
    var btn = document.getElementById('btnClearFilters');
    if (btn) {
        btn.style.opacity       = shouldShow ? '1' : '0';
        btn.style.pointerEvents = shouldShow ? 'all' : 'none';
    }
}

/* ══════════════════════════════════════════
   FILTER TOGGLES (gọi từ HTML onclick)
══════════════════════════════════════════ */
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
    _scheduleSearch(true);
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
    _scheduleSearch(true);
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
        _filters.task ||
        _filters.calendarDate !== null;

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

        // Nhóm Calendar Date (AND với các nhóm khác)
        if (visible && _filters.calendarDate) {
            var createdAt = card.dataset.createdAt || '';
            var reminderAt = card.dataset.reminderAt || '';
            
            // Extract YYYY-MM-DD from reminderAt (which is ISO format like 2026-05-31T08:00:00Z)
            if (reminderAt) reminderAt = reminderAt.substring(0, 10);
            
            if (createdAt !== _filters.calendarDate && reminderAt !== _filters.calendarDate) {
                visible = false;
            }
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

function clearSearchFilters() {
    _filters.types.clear();
    _filters.colors.clear();
    _filters.priorities.clear();
    _filters.categories.clear();
    _filters.task = false;
    _filters.calendarDate = null;

    // Reset active class trên calendar nếu có
    if (typeof window.clearCalendarSelection === 'function') {
        window.clearCalendarSelection();
    }

    var panel = document.getElementById('filterPanel');
    if (panel) {
        panel.querySelectorAll('.active').forEach(function(el) { el.classList.remove('active'); });
    }

    var input = document.getElementById('globalSearch');
    if (input) input.value = '';

    _restoreServerContent();
    _updateClearBtn();
}

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */
function _escHtml(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {
    // Lưu server-rendered content để restore khi xóa search
    _saveServerContent();

    // Input search
    var input = document.getElementById('globalSearch');
    if (input) {
        input.addEventListener('input', function() {
            _scheduleSearch(true);
            _updateClearBtn();
        });
    }

    // Populate tag section từ DOM
    _populateTagSection();

    // Init progress bars cho server-rendered content
    _initProgressBars(document);
});
