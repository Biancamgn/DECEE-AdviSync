function initShared() {


    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('hamburgerBtn');
    const isMobile = () => window.innerWidth < 992;

    if (sidebar && mainContent) {
        sidebar.addEventListener('mouseenter', () => {
            if (!isMobile()) { sidebar.classList.add('expanded'); mainContent.classList.add('shifted'); }
        });
        sidebar.addEventListener('mouseleave', () => {
            if (!isMobile()) { sidebar.classList.remove('expanded'); mainContent.classList.remove('shifted'); }
        });
    }

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.toggle('expanded');
            if (overlay) overlay.classList.toggle('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('expanded');
            overlay.classList.remove('active');
        });
    }

    const clockEl = document.getElementById('topbarClock');
    if (clockEl) {
        function updateClock() {
            const now = new Date();
            const h = String(now.getHours()).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            const s = String(now.getSeconds()).padStart(2, '0');
            const dateStr = now.toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
            });
            clockEl.textContent = `${dateStr} · ${h}:${m}:${s}`;
        }
        updateClock();
        setInterval(updateClock, 1000);
    }

    const profileWrapper = document.getElementById('profileWrapper');
    const profileToggle = document.getElementById('profileToggle');

    if (profileWrapper && profileToggle) {
        profileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            profileWrapper.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!profileWrapper.contains(e.target)) {
                profileWrapper.classList.remove('open');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') profileWrapper.classList.remove('open');
        });
    }

    const darkModeBtn = document.getElementById('darkModeBtn');
    if (darkModeBtn) {
        darkModeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const icon = darkModeBtn.querySelector('i');
            icon.className = document.body.classList.contains('dark-mode')
                ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
        });
    }

    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            document.querySelectorAll('.sidebar-nav .nav-link.active').forEach(a => a.classList.remove('active'));
            link.classList.add('active');
        }
    });


    // ── Logout ──
    const logoutBtn = document.querySelector('.dropdown-action.logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

}