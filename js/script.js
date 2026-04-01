const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('mainContent');
const overlay = document.getElementById('sidebarOverlay');
const hamburger = document.getElementById('hamburgerBtn');
const isMobile = () => window.innerWidth < 992;

sidebar.addEventListener('mouseenter', () => {
    if (!isMobile()) {
        sidebar.classList.add('expanded');
        mainContent.classList.add('shifted');
    }
});

sidebar.addEventListener('mouseleave', () => {
    if (!isMobile()) {
        sidebar.classList.remove('expanded');
        mainContent.classList.remove('shifted');
    }
});

hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('expanded');
    overlay.classList.toggle('active');
});

overlay.addEventListener('click', () => {
    sidebar.classList.remove('expanded');
    overlay.classList.remove('active');
});

const greetingEl = document.querySelector('.welcome-banner h2');
const hour = new Date().getHours();
let greeting = 'Good morning';
if (hour >= 12 && hour < 18) greeting = 'Good afternoon';
else if (hour >= 18) greeting = 'Good evening';
if (greetingEl) greetingEl.textContent = `${greeting}, Bianca!`;
