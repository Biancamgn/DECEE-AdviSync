const sidebar = document.getElementById('sidebar'), mainContent = document.getElementById('mainContent'), overlay = document.getElementById('sidebarOverlay'), hamburger = document.getElementById('hamburgerBtn');
const isMobile = () => window.innerWidth < 992;
sidebar.addEventListener('mouseenter', () => { if (!isMobile()) { sidebar.classList.add('expanded'); mainContent.classList.add('shifted'); } });
sidebar.addEventListener('mouseleave', () => { if (!isMobile()) { sidebar.classList.remove('expanded'); mainContent.classList.remove('shifted'); } });
hamburger.addEventListener('click', () => { sidebar.classList.toggle('expanded'); overlay.classList.toggle('active'); });
overlay.addEventListener('click', () => { sidebar.classList.remove('expanded'); overlay.classList.remove('active'); });

const clockEl = document.getElementById('topbarClock');
function updateClock() { const n = new Date(); clockEl.textContent = n.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}) + ' \u00b7 ' + String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')+':'+String(n.getSeconds()).padStart(2,'0'); }
updateClock(); setInterval(updateClock, 1000);

function setTheme(el, theme) {
    document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    const dmBtn = document.getElementById('darkModeBtn');
    if (theme === 'dark') { document.body.classList.add('dark-mode'); if (dmBtn) dmBtn.querySelector('i').className = 'bi bi-sun-fill'; }
    else if (theme === 'light') { document.body.classList.remove('dark-mode'); if (dmBtn) dmBtn.querySelector('i').className = 'bi bi-moon-fill'; }
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    showToast('Theme updated!');
}

(function () {
    const dmBtn = document.getElementById('darkModeBtn');
    if (dmBtn) {
        dmBtn._dmBound = true;
        dmBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            dmBtn.querySelector('i').className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
            localStorage.setItem('darkMode', isDark);
            document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
            const cards = document.querySelectorAll('.theme-card');
            cards.forEach(c => { if (c.textContent.trim() === (isDark ? 'Dark' : 'Light')) c.classList.add('selected'); });
        });
    }
    if (document.body.classList.contains('dark-mode')) {
        document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
        document.querySelectorAll('.theme-card').forEach(c => { if (c.textContent.trim() === 'Dark') c.classList.add('selected'); });
    }
})();

function showToast(msg) {
    const t = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    t.style.display = 'flex';
    setTimeout(() => t.style.display = 'none', 3000);
}
