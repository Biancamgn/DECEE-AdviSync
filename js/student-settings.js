const sidebar = document.getElementById('sidebar'), mainContent = document.getElementById('mainContent'), overlay = document.getElementById('sidebarOverlay'), hamburger = document.getElementById('hamburgerBtn');
const isMobile = () => window.innerWidth < 992;
sidebar.addEventListener('mouseenter', () => { if (!isMobile()) { sidebar.classList.add('expanded'); mainContent.classList.add('shifted'); } });
sidebar.addEventListener('mouseleave', () => { if (!isMobile()) { sidebar.classList.remove('expanded'); mainContent.classList.remove('shifted'); } });
hamburger.addEventListener('click', () => { sidebar.classList.toggle('expanded'); overlay.classList.toggle('active'); });
overlay.addEventListener('click', () => { sidebar.classList.remove('expanded'); overlay.classList.remove('active'); });

// Profile Dropdown
const profileWrapper = document.getElementById('profileWrapper');
const profileToggle = document.getElementById('profileToggle');
profileToggle.addEventListener('click', (e) => { e.stopPropagation(); profileWrapper.classList.toggle('open'); });
document.addEventListener('click', (e) => { if (!profileWrapper.contains(e.target)) profileWrapper.classList.remove('open'); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') profileWrapper.classList.remove('open'); });

const clockEl = document.getElementById('topbarClock');
function updateClock() { const n = new Date(); clockEl.textContent = n.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}) + ' \u00b7 ' + String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')+':'+String(n.getSeconds()).padStart(2,'0'); }
updateClock(); setInterval(updateClock, 1000);

const darkModeBtn = document.getElementById('darkModeBtn');
darkModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    darkModeBtn.querySelector('i').className = document.body.classList.contains('dark-mode') ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
});

function setTheme(el, theme) {
    document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    if (theme === 'dark') { document.body.classList.add('dark-mode'); darkModeBtn.querySelector('i').className = 'bi bi-sun-fill'; }
    else if (theme === 'light') { document.body.classList.remove('dark-mode'); darkModeBtn.querySelector('i').className = 'bi bi-moon-fill'; }
    showToast('Theme updated!');
}

function showToast(msg) {
    const t = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    t.style.display = 'flex';
    setTimeout(() => t.style.display = 'none', 3000);
}