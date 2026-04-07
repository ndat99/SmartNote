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