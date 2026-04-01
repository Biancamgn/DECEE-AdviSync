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

