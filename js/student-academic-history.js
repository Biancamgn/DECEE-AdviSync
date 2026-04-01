// ── Sidebar ──
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('mainContent');
const overlay = document.getElementById('sidebarOverlay');
const hamburger = document.getElementById('hamburgerBtn');
const isMobile = () => window.innerWidth < 992;

sidebar.addEventListener('mouseenter', () => { if (!isMobile()) { sidebar.classList.add('expanded'); mainContent.classList.add('shifted'); } });
sidebar.addEventListener('mouseleave', () => { if (!isMobile()) { sidebar.classList.remove('expanded'); mainContent.classList.remove('shifted'); } });
hamburger.addEventListener('click', () => { sidebar.classList.toggle('expanded'); overlay.classList.toggle('active'); });
overlay.addEventListener('click', () => { sidebar.classList.remove('expanded'); overlay.classList.remove('active'); });

// ── Profile Dropdown ──
const profileWrapper = document.getElementById('profileWrapper');
const profileToggle = document.getElementById('profileToggle');
profileToggle.addEventListener('click', (e) => { e.stopPropagation(); profileWrapper.classList.toggle('open'); });
document.addEventListener('click', (e) => { if (!profileWrapper.contains(e.target)) profileWrapper.classList.remove('open'); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') profileWrapper.classList.remove('open'); });

// ── Clock ──
const clockEl = document.getElementById('topbarClock');
function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    clockEl.textContent = `${dateStr} · ${h}:${m}:${s}`;
}
updateClock();
setInterval(updateClock, 1000);

// ── Term Card Filters ──
const filterYear = document.getElementById('filterYear');
const filterTerm = document.getElementById('filterTerm');
const resetBtn = document.getElementById('resetFilters');
const termCards = document.querySelectorAll('.term-card');

function applyFilters() {
    const year = filterYear.value;
    const term = filterTerm.value;
    termCards.forEach(card => {
        const cardYear = card.dataset.year;
        const cardTerm = card.dataset.term;
        const matchYear = year === 'all' || cardYear === year;
        const matchTerm = term === 'all' || cardTerm === term;
        card.style.display = (matchYear && matchTerm) ? '' : 'none';
    });
}

filterYear.addEventListener('change', applyFilters);
filterTerm.addEventListener('change', applyFilters);
resetBtn.addEventListener('click', () => {
    filterYear.value = 'all';
    filterTerm.value = 'all';
    applyFilters();
});
