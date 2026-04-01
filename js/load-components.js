async function loadComponent(containerId, filePath) {
    const container = document.getElementById(containerId);
    if (!container) return;
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Failed to load ${filePath}`);
        const html = await response.text();
        container.innerHTML = html;
    } catch (err) {
        console.warn(`Component load failed: ${filePath}`, err);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadComponent('sidebar-container', 'components/sidebar.html');
    await loadComponent('topbar-container', 'components/topbar.html');

    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
        const linkPage = link.getAttribute('href');
        if (linkPage && linkPage !== '#' && currentPage === linkPage) {
            link.classList.add('active');
        }
    });

    const pageTitle = document.body.dataset.pageTitle;
    const pageSubtitle = document.body.dataset.pageSubtitle;

    if (pageTitle) {
        const titleEl = document.getElementById('pageTitle');
        if (titleEl) titleEl.textContent = pageTitle;
    }
    if (pageSubtitle) {
        const subtitleEl = document.getElementById('pageSubtitle');
        if (subtitleEl) subtitleEl.textContent = pageSubtitle;
    }

    initShared();

    await new Promise(resolve => setTimeout(resolve, 50));
    if (typeof window._bindNotifBtn === 'function') window._bindNotifBtn();
    await loadUserProfile();
});
