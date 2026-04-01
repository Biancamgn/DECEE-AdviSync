async function loadUserProfile() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return null;

        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error || !profile) return null;

        const firstName = profile.first_name || '';
        const lastName = profile.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        const initials = (firstName[0] || '') + (lastName[0] || '');
        const schoolId = profile.school_id || '';
        const role = profile.role
            ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
            : '';

        document.querySelectorAll('.sidebar-footer .avatar').forEach(el => el.textContent = initials);
        document.querySelectorAll('.sidebar-footer .user-name').forEach(el => el.textContent = `${firstName} ${lastName[0]}.`);
        document.querySelectorAll('.sidebar-footer .user-id').forEach(el => {
            el.textContent = profile.program
                ? `${schoolId} · ${profile.program}`
                : schoolId;
        });

        document.querySelectorAll('.profile-btn').forEach(el => el.textContent = initials);


        document.querySelectorAll('.dropdown-avatar').forEach(el => el.textContent = initials);
        document.querySelectorAll('.dropdown-name').forEach(el => el.textContent = fullName);
        document.querySelectorAll('.dropdown-role').forEach(el => el.textContent = role);

        const greetingEl = document.querySelector('.welcome-banner h2');
        if (greetingEl) {
            const hour = new Date().getHours();
            let greeting = 'Good morning';
            if (hour >= 12 && hour < 18) greeting = 'Good afternoon';
            else if (hour >= 18) greeting = 'Good evening';
            greetingEl.textContent = `${greeting}, ${firstName}!`;
        }

        return profile;
    } catch (err) {
        console.error('loadUserProfile error:', err);
        return null;
    }
}

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


    const logoutBtn = document.querySelector('.dropdown-action.logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut();
        });
    }

}