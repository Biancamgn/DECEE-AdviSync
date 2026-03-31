document.addEventListener('DOMContentLoaded', () => {

    // ── Elements ──
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('hamburgerBtn');
    const isMobile = () => window.innerWidth < 992;

    // ── Desktop: hover to expand, main content shifts ──
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

    // ── Mobile: hamburger toggle ──
    hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('expanded');
        overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
        sidebar.classList.remove('expanded');
        overlay.classList.remove('active');
    });

    // ── Profile Dropdown Toggle ──
    const profileWrapper = document.getElementById('profileWrapper');
    const profileToggle = document.getElementById('profileToggle');

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

    // ── Digital Clock + Date ──
    const clockEl = document.getElementById('topbarClock');
    function updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
        const dateStr = now.toLocaleDateString('en-US', options);
        clockEl.textContent = `${dateStr} · ${h}:${m}:${s}`;
    }
    updateClock();
    setInterval(updateClock, 1000);

    // ── Dark Mode Toggle ──
    const darkModeBtn = document.getElementById('darkModeBtn');
    darkModeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const icon = darkModeBtn.querySelector('i');
        if (document.body.classList.contains('dark-mode')) {
            icon.className = 'bi bi-sun-fill';
        } else {
            icon.className = 'bi bi-moon-fill';
        }
    });

    // =========================================================================
    // MOCK DATA — Replace with Supabase fetches later
    // =========================================================================
    const totalStudents = 1250;
    const clearedStudents = 850;
    const notClearedStudents = 400;
    const atRiskStudents = 45;

    document.getElementById('totalStudents').textContent = totalStudents.toLocaleString();
    document.getElementById('clearedStudents').textContent = clearedStudents.toLocaleString();
    document.getElementById('notClearedStudents').textContent = notClearedStudents.toLocaleString();
    document.getElementById('atRiskStudents').textContent = atRiskStudents.toLocaleString();

    // =========================================================================
    // CLEARANCE RATE — Doughnut Chart
    // =========================================================================
    const clearanceCtx = document.getElementById('clearanceChart').getContext('2d');
    new Chart(clearanceCtx, {
        type: 'doughnut',
        data: {
            labels: ['Cleared', 'Not Cleared'],
            datasets: [{
                data: [clearedStudents, notClearedStudents],
                backgroundColor: ['#00703C', '#e6a817'],
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 16,
                        font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '600' }
                    }
                }
            },
            cutout: '72%'
        }
    });

    // =========================================================================
    // STUDENT DISTRIBUTION — Bar Chart
    // =========================================================================
    const distributionCtx = document.getElementById('distributionChart').getContext('2d');
    const bscpeData = [150, 130, 120, 100];
    const bseceData = [200, 190, 180, 180];

    new Chart(distributionCtx, {
        type: 'bar',
        data: {
            labels: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
            datasets: [
                {
                    label: 'BSCpE',
                    data: bscpeData,
                    backgroundColor: '#00703C',
                    borderRadius: 6
                },
                {
                    label: 'BSECE',
                    data: bseceData,
                    backgroundColor: '#2980b9',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 16,
                        font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '600' }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { drawBorder: false, color: '#e2e8e5' },
                    ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 } }
                },
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 } }
                }
            }
        }
    });

    // =========================================================================
    // ADVISER MONITORING TABLE
    // =========================================================================
    const mockAdvisers = [
        { name: 'Dr. Jane Smith',      program: 'BSCpE',  reviewed: 45, total: 50 },
        { name: 'Engr. John Doe',      program: 'BSECE',  reviewed: 30, total: 60 },
        { name: 'Dr. Alan Turing',     program: 'BSCpE',  reviewed: 50, total: 50 },
        { name: 'Engr. Ada Lovelace',  program: 'BSECE',  reviewed: 10, total: 40 },
        { name: 'Dr. Grace Hopper',    program: 'BSCpE',  reviewed: 25, total: 50 }
    ];

    const advisersList = document.getElementById('advisersList');

    mockAdvisers.forEach(adviser => {
        const pct = Math.round((adviser.reviewed / adviser.total) * 100);

        let fillClass = 'safe';
        if (pct === 100) fillClass = 'done';
        else if (pct < 30) fillClass = 'danger';
        else if (pct < 70) fillClass = 'warning';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="prof-name">${adviser.name}</td>
            <td><span class="badge-program">${adviser.program}</span></td>
            <td>${adviser.reviewed} / ${adviser.total}</td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <span style="width:35px; font-size:0.75rem; font-weight:700; color:var(--dlsu-gray-600);">${pct}%</span>
                    <div class="progress-track flex-grow-1">
                        <div class="progress-fill ${fillClass}" style="width: ${pct}%"></div>
                    </div>
                </div>
            </td>
        `;
        advisersList.appendChild(row);
    });
});
