(function () {
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        const dmBtn = document.getElementById('darkModeBtn');
        if (dmBtn) {
            const icon = dmBtn.querySelector('i');
            if (icon) icon.className = 'bi bi-sun-fill';
        }
    }

    const css = `
    /* ── Profile Dropdown Styles (shared fallback) ── */
    .profile-wrapper { position: relative; }
    .profile-btn {
        width: 42px; height: 42px; border-radius: 50%;
        border: 2px solid var(--dlsu-gray-200, #e8ede9);
        background: var(--dlsu-green, #00703c); color: white;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; font-size: 0.8rem; font-weight: 700;
        transition: all 0.2s ease;
    }
    .profile-btn:hover { border-color: var(--dlsu-green, #00703c); box-shadow: 0 0 0 3px rgba(0,112,60,0.12); }
    .profile-chevron { color: var(--dlsu-gray-400, #94a89c); font-size: 0.75rem; cursor: pointer; transition: transform 0.2s ease; }
    .profile-wrapper.open .profile-chevron { transform: rotate(180deg); }
    .profile-dropdown {
        position: absolute; top: calc(100% + 10px); right: 0; width: 260px;
        background: white; border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
        border: 1px solid var(--dlsu-gray-200, #e8ede9);
        opacity: 0; visibility: hidden; transform: translateY(-8px);
        transition: all 0.2s ease; z-index: 200; overflow: hidden;
    }
    .profile-wrapper.open .profile-dropdown { opacity: 1; visibility: visible; transform: translateY(0); }
    .dropdown-header {
        padding: 1rem 1.15rem; background: var(--dlsu-gray-50, #f7faf8);
        border-bottom: 1px solid var(--dlsu-gray-200, #e8ede9);
        display: flex; align-items: center; gap: 0.75rem;
    }
    .dropdown-header .dropdown-avatar {
        width: 40px; height: 40px; border-radius: 50%;
        background: var(--dlsu-green, #00703c); color: white;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 0.85rem; flex-shrink: 0;
    }
    .dropdown-header .dropdown-name { font-size: 0.85rem; font-weight: 700; color: var(--dlsu-gray-800, #1a2e22); }
    .dropdown-header .dropdown-role { font-size: 0.7rem; color: var(--dlsu-green, #00703c); font-weight: 600; }
    .dropdown-info { padding: 0.75rem 1.15rem; }
    .dropdown-info-row { display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; }
    .dropdown-info-row:not(:last-child) { border-bottom: 1px solid var(--dlsu-gray-100, #f0f4f1); }
    .dropdown-info-label { font-size: 0.7rem; color: var(--dlsu-gray-400, #94a89c); font-weight: 500; text-transform: uppercase; letter-spacing: 0.03em; }
    .dropdown-info-value { font-size: 0.78rem; color: var(--dlsu-gray-800, #1a2e22); font-weight: 600; }
    .dropdown-divider { height: 1px; background: var(--dlsu-gray-200, #e8ede9); }
    .dropdown-action {
        display: flex; align-items: center; gap: 0.6rem; padding: 0.75rem 1.15rem;
        font-size: 0.8rem; font-weight: 500; color: var(--dlsu-gray-600, #5a6b60);
        cursor: pointer; transition: all 0.15s ease; text-decoration: none;
        border: none; background: none; width: 100%; text-align: left;
    }
    .dropdown-action:hover { background: var(--dlsu-gray-50, #f7faf8); color: var(--dlsu-gray-800, #1a2e22); }
    .dropdown-action.logout { color: #ef4444; }
    .dropdown-action.logout:hover { background: #fdeaea; }
    .dropdown-action i { font-size: 1rem; width: 18px; text-align: center; }
    /* Dark mode: profile dropdown */
    body.dark-mode .profile-dropdown { background: #1a1f1c; border-color: #2f3832; }
    body.dark-mode .dropdown-header { background: #141a16; border-color: #2f3832; }
    body.dark-mode .dropdown-header .dropdown-name { color: #d4ddd7; }
    body.dark-mode .dropdown-info-row { border-color: #2f3832; }
    body.dark-mode .dropdown-info-label { color: #6b7e70; }
    body.dark-mode .dropdown-info-value { color: #d4ddd7; }
    body.dark-mode .dropdown-divider { background: #2f3832; }
    body.dark-mode .dropdown-action { color: #94a89c; }
    body.dark-mode .dropdown-action:hover { background: #232a25; color: #d4ddd7; }
    body.dark-mode .dropdown-action.logout { color: #f87171; }
    body.dark-mode .dropdown-action.logout:hover { background: #2e1515; }

    /* ── Notification Panel ── */
    .notif-panel-overlay {
        display: none; position: fixed; inset: 0; z-index: 299;
    }
    .notif-panel-overlay.open { display: block; }

    .notif-panel {
        position: fixed; top: 0; right: -380px; width: 360px; max-width: 92vw;
        height: 100vh; background: white; box-shadow: -4px 0 24px rgba(0,0,0,0.12);
        z-index: 300; display: flex; flex-direction: column;
        transition: right 0.28s cubic-bezier(.4,0,.2,1);
        font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .notif-panel.open { right: 0; }

    .notif-panel-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 1.15rem 1.25rem; border-bottom: 1px solid var(--dlsu-gray-200, #e8ede9);
        flex-shrink: 0;
    }
    .notif-panel-header h3 {
        margin: 0; font-size: 1rem; font-weight: 700;
        color: var(--dlsu-gray-800, #1a2e22);
    }
    .notif-panel-header .notif-count-badge {
        background: var(--dlsu-green, #00703c); color: white;
        font-size: 0.65rem; font-weight: 700; padding: 0.15rem 0.55rem;
        border-radius: 20px; margin-left: 0.5rem;
    }
    .notif-close-btn {
        background: none; border: none; cursor: pointer;
        font-size: 1.2rem; color: var(--dlsu-gray-400, #94a89c);
        transition: color 0.15s;
    }
    .notif-close-btn:hover { color: var(--dlsu-gray-800, #1a2e22); }

    .notif-tabs {
        display: flex; border-bottom: 1px solid var(--dlsu-gray-200, #e8ede9);
        padding: 0 1.25rem; flex-shrink: 0;
    }
    .notif-tab {
        background: none; border: none; padding: 0.65rem 0; margin-right: 1.5rem;
        font-size: 0.78rem; font-weight: 600; cursor: pointer;
        color: var(--dlsu-gray-400, #94a89c);
        border-bottom: 2px solid transparent; transition: all 0.2s;
    }
    .notif-tab.active {
        color: var(--dlsu-green, #00703c);
        border-bottom-color: var(--dlsu-green, #00703c);
    }

    .notif-list {
        flex: 1; overflow-y: auto; padding: 0.5rem 0;
    }
    .notif-item {
        display: flex; gap: 0.75rem; padding: 0.85rem 1.25rem;
        cursor: pointer; transition: background 0.15s;
        border-left: 3px solid transparent;
    }
    .notif-item:hover { background: var(--dlsu-gray-50, #f7faf8); }
    .notif-item.unread {
        background: rgba(0,112,60,0.03);
        border-left-color: var(--dlsu-green, #00703c);
    }
    .notif-icon {
        width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        font-size: 0.9rem;
    }
    .notif-icon.green  { background: rgba(0,112,60,0.1); color: var(--dlsu-green, #00703c); }
    .notif-icon.blue   { background: rgba(59,130,246,0.1); color: #3b82f6; }
    .notif-icon.amber  { background: rgba(245,158,11,0.1); color: #f59e0b; }
    .notif-icon.red    { background: rgba(239,68,68,0.1); color: #ef4444; }

    .notif-body { flex: 1; min-width: 0; }
    .notif-title {
        font-size: 0.8rem; font-weight: 600;
        color: var(--dlsu-gray-800, #1a2e22);
        margin-bottom: 0.15rem;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .notif-desc {
        font-size: 0.72rem; color: var(--dlsu-gray-400, #94a89c);
        line-height: 1.4;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        overflow: hidden;
    }
    .notif-time {
        font-size: 0.65rem; color: var(--dlsu-gray-400, #94a89c);
        margin-top: 0.25rem; font-weight: 500;
    }
    .notif-dot {
        width: 8px; height: 8px; border-radius: 50%;
        background: var(--dlsu-green, #00703c); flex-shrink: 0;
        margin-top: 0.35rem;
    }
    .notif-dot.read { background: transparent; }

    .notif-empty {
        text-align: center; padding: 3rem 1.5rem;
        color: var(--dlsu-gray-400, #94a89c);
    }
    .notif-empty i { font-size: 2.5rem; margin-bottom: 0.75rem; display: block; }
    .notif-empty p { font-size: 0.82rem; font-weight: 500; }

    .notif-footer {
        border-top: 1px solid var(--dlsu-gray-200, #e8ede9);
        padding: 0.75rem 1.25rem; text-align: center; flex-shrink: 0;
    }
    .notif-footer button {
        background: none; border: none; cursor: pointer;
        font-size: 0.78rem; font-weight: 600;
        color: var(--dlsu-green, #00703c);
        transition: color 0.15s;
    }
    .notif-footer button:hover { text-decoration: underline; }

    /* Dark mode support */
    body.dark-mode .notif-panel { background: #1a1f1c; }
    body.dark-mode .notif-panel-header { border-color: #2f3832; }
    body.dark-mode .notif-panel-header h3 { color: #d4ddd7; }
    body.dark-mode .notif-tabs { border-color: #2f3832; }
    body.dark-mode .notif-tab { color: #6b7e70; }
    body.dark-mode .notif-tab.active { color: #4ade80; border-bottom-color: #4ade80; }
    body.dark-mode .notif-item:hover { background: #232a25; }
    body.dark-mode .notif-item.unread { background: rgba(0,112,60,0.08); }
    body.dark-mode .notif-title { color: #d4ddd7; }
    body.dark-mode .notif-desc { color: #6b7e70; }
    body.dark-mode .notif-time { color: #6b7e70; }
    body.dark-mode .notif-close-btn { color: #6b7e70; }
    body.dark-mode .notif-close-btn:hover { color: #d4ddd7; }
    body.dark-mode .notif-footer { border-color: #2f3832; }
    body.dark-mode .notif-footer button { color: #4ade80; }
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    const page = window.location.pathname.split('/').pop() || '';
    let notifications = [];
    let notificationsLoaded = false;

    async function loadNotificationsFromDB() {
        if (typeof supabaseClient === 'undefined') return false;
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) return false;
            const { data, error } = await supabaseClient
                .from('notifications')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false })
                .limit(20);
            if (error || !data || data.length === 0) return false;
            notifications = data.map(n => {
                const iconMap = { info: 'bi-bell', success: 'bi-check-circle', warning: 'bi-exclamation-triangle', action: 'bi-lightning' };
                const colorMap = { info: 'blue', success: 'green', warning: 'amber', action: 'red' };
                const mins = Math.floor((Date.now() - new Date(n.created_at).getTime()) / 60000);
                let timeStr = '';
                if (mins < 60) timeStr = `${mins} min ago`;
                else if (mins < 1440) timeStr = `${Math.floor(mins / 60)} hour${Math.floor(mins / 60) > 1 ? 's' : ''} ago`;
                else if (mins < 10080) timeStr = `${Math.floor(mins / 1440)} day${Math.floor(mins / 1440) > 1 ? 's' : ''} ago`;
                else timeStr = new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return {
                    id: n.id,
                    icon: iconMap[n.type] || 'bi-bell',
                    iconClass: colorMap[n.type] || 'blue',
                    title: n.title,
                    desc: n.message,
                    time: timeStr,
                    unread: !n.is_read
                };
            });
            return true;
        } catch (e) { return false; }
    }

    function loadFallbackNotifications() {
        if (page.startsWith('admin')) {
        notifications = [
            { icon: 'bi-person-plus', iconClass: 'green', title: 'New Student Registered', desc: 'Carlos Reyes (12023456) registered and is awaiting adviser assignment.', time: '10 min ago', unread: true },
            { icon: 'bi-exclamation-triangle', iconClass: 'amber', title: 'Advising Deadline Approaching', desc: 'The advising period ends on April 4, 2026. 23 students have not yet been advised.', time: '1 hour ago', unread: true },
            { icon: 'bi-shield-check', iconClass: 'blue', title: 'System Backup Complete', desc: 'Automated backup of all student records completed successfully.', time: '3 hours ago', unread: false },
            { icon: 'bi-bar-chart', iconClass: 'green', title: 'Weekly Report Ready', desc: 'The weekly advising progress report has been generated and is ready for review.', time: 'Yesterday', unread: false },
            { icon: 'bi-person-check', iconClass: 'blue', title: 'Adviser Assignment Updated', desc: 'Dr. Cruz has been assigned 3 additional advisees for the current term.', time: '2 days ago', unread: false },
        ];
    } else if (page.startsWith('adviser') || page.startsWith('academic-advising') || page.startsWith('my-advisees') || page.startsWith('advising-')) {
        notifications = [
            { icon: 'bi-calendar-check', iconClass: 'green', title: 'New Appointment Request', desc: 'Bianca Magsino requested an advising appointment for March 28.', time: '5 min ago', unread: true },
            { icon: 'bi-chat-left-text', iconClass: 'blue', title: 'New Student Concern', desc: 'Carlos Reyes submitted a concern about prerequisite overrides.', time: '30 min ago', unread: true },
            { icon: 'bi-file-earmark-check', iconClass: 'green', title: 'Advising Form Submitted', desc: 'Maria Santos submitted her advising form for Term 9 enrollment.', time: '2 hours ago', unread: true },
            { icon: 'bi-exclamation-circle', iconClass: 'red', title: 'At-Risk Student Alert', desc: 'John Dela Cruz has exceeded 24 failed units and needs immediate attention.', time: '5 hours ago', unread: false },
            { icon: 'bi-megaphone', iconClass: 'amber', title: 'Department Announcement', desc: 'New curriculum changes for BS-CpE effective AY 2026-2027.', time: 'Yesterday', unread: false },
            { icon: 'bi-clock-history', iconClass: 'blue', title: 'Advising Period Reminder', desc: 'The advising period for Term 2 AY 2025-2026 opens on March 24.', time: '2 days ago', unread: false },
            { icon: 'bi-patch-check', iconClass: 'green', title: 'Student Cleared', desc: 'Anna Reyes has been cleared for enrollment — all requirements met.', time: '3 days ago', unread: false },
        ];
    } else {
        // Student portal notifications
        notifications = [
            { icon: 'bi-calendar-check', iconClass: 'green', title: 'Appointment Confirmed', desc: 'Your advising appointment with Dr. Cruz on March 28 at 10:00 AM has been confirmed.', time: '15 min ago', unread: true },
            { icon: 'bi-file-earmark-check', iconClass: 'blue', title: 'Advising Form Approved', desc: 'Your advising form for Term 9 has been reviewed and approved by Dr. Cruz.', time: '2 hours ago', unread: true },
            { icon: 'bi-megaphone', iconClass: 'amber', title: 'Department Announcement', desc: 'New curriculum changes for BS-CpE effective AY 2026-2027. Please review your program checklist.', time: '1 day ago', unread: true },
            { icon: 'bi-patch-check', iconClass: 'green', title: 'Enrollment Cleared', desc: 'You have been cleared for enrollment for Term 9. You may now enroll through MLS.', time: '2 days ago', unread: true },
            { icon: 'bi-chat-left-dots', iconClass: 'blue', title: 'Concern Response', desc: 'Dr. Cruz responded to your concern about LBYCPEI prerequisite override.', time: '3 days ago', unread: false },
            { icon: 'bi-bell', iconClass: 'amber', title: 'Deadline Reminder', desc: 'The enrollment period closes on April 4, 2026. Make sure to finalize your schedule.', time: '4 days ago', unread: false },
        ];
    }
    }

    // Initialize synchronously with fallback data first (buttons must bind immediately)
    let renderItems;
    let updateBadges;
    loadFallbackNotifications();
    initNotifPanel();

    // Then try to load from DB and refresh the panel content if available
    loadNotificationsFromDB().then(loaded => {
        if (loaded && updateBadges) {
            const listEl = document.getElementById('notifList');
            const activeTab = document.querySelector('#notifPanel .notif-tab.active');
            if (listEl && activeTab) {
                listEl.innerHTML = renderItems(activeTab.dataset.filter);
            }
            updateBadges();
        }
    });

    function initNotifPanel() {
    const unreadCount = notifications.filter(n => n.unread).length;

    const overlay = document.createElement('div');
    overlay.className = 'notif-panel-overlay';
    overlay.id = 'notifOverlay';

    const panel = document.createElement('div');
    panel.className = 'notif-panel';
    panel.id = 'notifPanel';

    renderItems = (filter) => {
        let items = notifications;
        if (filter === 'unread') items = items.filter(n => n.unread);
        if (items.length === 0) {
            return `<div class="notif-empty"><i class="bi bi-bell-slash"></i><p>No ${filter === 'unread' ? 'unread ' : ''}notifications</p></div>`;
        }
        return items.map((n, idx) => `
            <div class="notif-item${n.unread ? ' unread' : ''}" data-notif-idx="${notifications.indexOf(n)}" style="cursor:pointer;">
                <div class="notif-icon ${n.iconClass}"><i class="bi ${n.icon}"></i></div>
                <div class="notif-body">
                    <div class="notif-title">${n.title}</div>
                    <div class="notif-desc">${n.desc}</div>
                    <div class="notif-time">${n.time}</div>
                </div>
                ${n.unread ? '<div class="notif-dot"></div>' : ''}
            </div>
        `).join('');
    };

    updateBadges = () => {
        const unread = notifications.filter(n => n.unread).length;
        const badge = panel.querySelector('.notif-count-badge');
        if (badge) badge.textContent = unread;
        const tabUnread = panel.querySelector('[data-filter="unread"]');
        if (tabUnread) tabUnread.textContent = `Unread (${unread})`;
        const topBadge = document.getElementById('notifBtn')?.querySelector('.notif-badge');
        if (topBadge) { topBadge.textContent = unread; topBadge.style.display = unread > 0 ? '' : 'none'; }
    };

    panel.innerHTML = `
        <div class="notif-panel-header">
            <h3>Notifications <span class="notif-count-badge">${unreadCount}</span></h3>
            <button class="notif-close-btn" id="notifCloseBtn"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="notif-tabs">
            <button class="notif-tab active" data-filter="all">All</button>
            <button class="notif-tab" data-filter="unread">Unread (${unreadCount})</button>
        </div>
        <div class="notif-list" id="notifList">${renderItems('all')}</div>
        <div class="notif-footer"><button id="markAllRead">Mark all as read</button></div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    function updateTopbarBadge() {
        const btn = document.getElementById('notifBtn');
        if (btn) {
            const badge = btn.querySelector('.notif-badge');
            if (badge) badge.textContent = unreadCount;
        }
    }
    updateTopbarBadge();

    function openPanel() {
        panel.classList.add('open');
        overlay.classList.add('open');
    }

    function closePanel() {
        panel.classList.remove('open');
        overlay.classList.remove('open');
    }

    // Bind bell button (may be loaded dynamically)
    function bindNotifBtn() {
        const btn = document.getElementById('notifBtn');
        if (btn && !btn._notifBound) {
            btn._notifBound = true;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (panel.classList.contains('open')) closePanel();
                else openPanel();
            });
        }
        updateTopbarBadge();
    }
    bindNotifBtn();
    // Expose for dynamically-loaded components
    window._bindNotifBtn = bindNotifBtn;

    // Close button
    document.getElementById('notifCloseBtn').addEventListener('click', closePanel);

    // Overlay click
    overlay.addEventListener('click', closePanel);

    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
    });

    // Tabs
    panel.querySelectorAll('.notif-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            panel.querySelectorAll('.notif-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('notifList').innerHTML = renderItems(tab.dataset.filter);
        });
    });

    // Click individual notification to mark as read
    document.getElementById('notifList').addEventListener('click', async (e) => {
        const item = e.target.closest('.notif-item');
        if (!item) return;
        const idx = parseInt(item.dataset.notifIdx);
        if (isNaN(idx) || !notifications[idx] || !notifications[idx].unread) return;
        notifications[idx].unread = false;
        if (typeof supabaseClient !== 'undefined' && notifications[idx].id) {
            try {
                await supabaseClient.from('notifications').update({ is_read: true }).eq('id', notifications[idx].id);
            } catch (e) { /* local only */ }
        }
        const activeFilter = panel.querySelector('.notif-tab.active').dataset.filter;
        document.getElementById('notifList').innerHTML = renderItems(activeFilter);
        updateBadges();
    });

    // Mark all as read
    document.getElementById('markAllRead').addEventListener('click', async () => {
        notifications.forEach(n => n.unread = false);
        if (typeof supabaseClient !== 'undefined') {
            try {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session) {
                    await supabaseClient
                        .from('notifications')
                        .update({ is_read: true })
                        .eq('user_id', session.user.id)
                        .eq('is_read', false);
                }
            } catch (e) { /* fallback: local only */ }
        }
        document.getElementById('notifList').innerHTML = renderItems(
            panel.querySelector('.notif-tab.active').dataset.filter
        );
        updateBadges();
    });

    const profileWrapper = document.getElementById('profileWrapper');
    const profileToggle = document.getElementById('profileToggle');
    if (profileWrapper && profileToggle && !profileWrapper._toggleBound) {
        profileWrapper._toggleBound = true;
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

    const darkBtn = document.getElementById('darkModeBtn');
    if (darkBtn && !darkBtn._dmBound) {
        darkBtn._dmBound = true;
        darkBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const icon = darkBtn.querySelector('i');
            if (icon) {
                icon.className = document.body.classList.contains('dark-mode')
                    ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
            }
            localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        });
    }

    const clockEl = document.getElementById('topbarClock');
    if (clockEl && !clockEl._clockBound) {
        clockEl._clockBound = true;
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
    } // end initNotifPanel
})();
