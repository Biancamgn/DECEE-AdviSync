const sidebar = document.getElementById('sidebar'), mainContent = document.getElementById('mainContent'), overlay = document.getElementById('sidebarOverlay'), hamburger = document.getElementById('hamburgerBtn');
const isMobile = () => window.innerWidth < 992;
sidebar.addEventListener('mouseenter', () => { if (!isMobile()) { sidebar.classList.add('expanded'); mainContent.classList.add('shifted'); } });
sidebar.addEventListener('mouseleave', () => { if (!isMobile()) { sidebar.classList.remove('expanded'); mainContent.classList.remove('shifted'); } });
hamburger.addEventListener('click', () => { sidebar.classList.toggle('expanded'); overlay.classList.toggle('active'); });
overlay.addEventListener('click', () => { sidebar.classList.remove('expanded'); overlay.classList.remove('active'); });

const clockEl = document.getElementById('topbarClock');
function updateClock() { const n = new Date(); clockEl.textContent = n.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}) + ' \u00b7 ' + String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')+':'+String(n.getSeconds()).padStart(2,'0'); }
updateClock(); setInterval(updateClock, 1000);

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        document.querySelectorAll('.checklist-row[data-status]').forEach(row => {
            if (filter === 'all' || row.dataset.status === filter) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
});
