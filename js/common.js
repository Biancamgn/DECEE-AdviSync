// ══════════════════════════════════════════════
// AdviSync – Common JavaScript
// ══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {

    // ── Sidebar ──
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('hamburgerBtn');
    const isMobile = () => window.innerWidth < 992;

    if (sidebar && mainContent) {
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

    // ── Profile Dropdown Toggle ──
    const profileWrapper = document.getElementById('profileWrapper');
    const profileToggle = document.getElementById('profileToggle');

    if (profileToggle && profileWrapper) {
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
            if (e.key === 'Escape') {
                profileWrapper.classList.remove('open');
            }
        });
    }

    // ── Digital Clock + Date ──
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
            clockEl.textContent = dateStr + ' \u00B7 ' + h + ':' + m + ':' + s;
        }
        updateClock();
        setInterval(updateClock, 1000);
    }

    // ── Dark Mode Toggle ──
    const darkModeBtn = document.getElementById('darkModeBtn');
    if (darkModeBtn) {
        darkModeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const icon = darkModeBtn.querySelector('i');
            if (document.body.classList.contains('dark-mode')) {
                icon.className = 'bi bi-sun-fill';
            } else {
                icon.className = 'bi bi-moon-fill';
            }
        });
    }

    // ── Active Nav Link Highlighting ──
    const currentPage = window.location.pathname.split('/').pop() || 'student-dashboard.html';
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

});
