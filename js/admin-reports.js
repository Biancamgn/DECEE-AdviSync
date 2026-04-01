document.addEventListener('DOMContentLoaded', async () => {

    // ═══════════════════════════════════════════════════════════════════════
    // ROUTE GUARD + SHARED UI
    // ═══════════════════════════════════════════════════════════════════════
    const currentUser = await requireAuth(['admin']);
    if (!currentUser) return;

    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('hamburgerBtn');
    const isMobile = () => window.innerWidth < 992;

    sidebar.addEventListener('mouseenter', () => { if (!isMobile()) { sidebar.classList.add('expanded'); mainContent.classList.add('shifted'); } });
    sidebar.addEventListener('mouseleave', () => { if (!isMobile()) { sidebar.classList.remove('expanded'); mainContent.classList.remove('shifted'); } });
    hamburger.addEventListener('click', () => { sidebar.classList.toggle('expanded'); overlay.classList.toggle('active'); });
    overlay.addEventListener('click', () => { sidebar.classList.remove('expanded'); overlay.classList.remove('active'); });

    const profileWrapper = document.getElementById('profileWrapper');
    const profileToggle = document.getElementById('profileToggle');
    profileToggle.addEventListener('click', (e) => { e.stopPropagation(); profileWrapper.classList.toggle('open'); });
    document.addEventListener('click', (e) => { if (!profileWrapper.contains(e.target)) profileWrapper.classList.remove('open'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') profileWrapper.classList.remove('open'); });

    const clockEl = document.getElementById('topbarClock');
    function updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
        clockEl.textContent = `${now.toLocaleDateString('en-US', options)} · ${h}:${m}:${s}`;
    }
    updateClock();
    setInterval(updateClock, 1000);

    const darkModeBtn = document.getElementById('darkModeBtn');
    darkModeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const icon = darkModeBtn.querySelector('i');
        icon.className = document.body.classList.contains('dark-mode') ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
        renderEnrollmentChart();
        renderYearDistChart();
        renderCoursePerformanceChart();
    });

    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) signOutBtn.addEventListener('click', (e) => { e.preventDefault(); signOut(); });

    // Chart.js global defaults
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
    Chart.defaults.font.size = 11;

    function isDark() { return document.body.classList.contains('dark-mode'); }
    function gridColor() { return isDark() ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'; }
    function labelColor() { return isDark() ? '#9ca3af' : '#6b7280'; }

    // ═══════════════════════════════════════════════════════════════════════
    // TAB 1: ENROLLMENT STATISTICS
    // Uses hardcoded historical data (enrollment trends are not live-tracked)
    // Year distribution is populated from Supabase
    // ═══════════════════════════════════════════════════════════════════════
    const enrollmentData = {
        years: ['2019–20', '2020–21', '2021–22', '2022–23', '2023–24', '2024–25', '2025–26'],
        bscpe: [480, 510, 530, 560, 590, 618, 650],
        bsece: [420, 430, 460, 490, 520, 534, 600],
    };

    // Fetch current year distribution from Supabase
    let yearDistData = [0, 0, 0, 0];
    try {
        const { data: studentRows, error } = await supabaseClient
            .from('students')
            .select('year_level, profiles!inner(status)')
            .eq('profiles.status', 'active');

        if (!error && studentRows) {
            studentRows.forEach(s => {
                if (s.year_level >= 1 && s.year_level <= 4) {
                    yearDistData[s.year_level - 1]++;
                }
            });
        }
    } catch (e) {
        console.warn('Year distribution fetch failed:', e);
        yearDistData = [380, 330, 300, 240]; // fallback
    }

    let enrollmentChart;
    function renderEnrollmentChart() {
        if (enrollmentChart) enrollmentChart.destroy();
        const ctx = document.getElementById('enrollmentTrendChart').getContext('2d');
        enrollmentChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: enrollmentData.years,
                datasets: [
                    {
                        label: 'BSCpE',
                        data: enrollmentData.bscpe,
                        borderColor: '#00703c',
                        backgroundColor: 'rgba(0, 112, 60, 0.08)',
                        fill: true,
                        tension: 0.35,
                        pointRadius: 4,
                        pointBackgroundColor: '#00703c',
                        borderWidth: 2.5,
                    },
                    {
                        label: 'BSECE',
                        data: enrollmentData.bsece,
                        borderColor: '#2980b9',
                        backgroundColor: 'rgba(41, 128, 185, 0.08)',
                        fill: true,
                        tension: 0.35,
                        pointRadius: 4,
                        pointBackgroundColor: '#2980b9',
                        borderWidth: 2.5,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { color: labelColor(), usePointStyle: true, pointStyle: 'circle', padding: 20, font: { weight: 600, size: 11 } } },
                    tooltip: { backgroundColor: isDark() ? '#2d323c' : '#1a1a2e', titleFont: { weight: 700 }, bodyFont: { size: 12 }, padding: 12, cornerRadius: 8 },
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: labelColor(), font: { size: 10 } } },
                    y: { grid: { color: gridColor() }, ticks: { color: labelColor(), font: { size: 10 } }, beginAtZero: false }
                }
            }
        });
    }

    let yearDistChart;
    function renderYearDistChart() {
        if (yearDistChart) yearDistChart.destroy();
        const ctx = document.getElementById('yearDistChart').getContext('2d');
        yearDistChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
                datasets: [{
                    data: yearDistData,
                    backgroundColor: ['#00703c', '#2980b9', '#e6a817', '#c0392b'],
                    borderWidth: 0,
                    hoverOffset: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: labelColor(), usePointStyle: true, pointStyle: 'circle', padding: 12, font: { size: 10, weight: 600 } }
                    }
                }
            }
        });
    }

    renderEnrollmentChart();
    renderYearDistChart();

    // ═══════════════════════════════════════════════════════════════════════
    // TAB 2: FAILED UNITS REPORT (from at_risk_students view)
    // ═══════════════════════════════════════════════════════════════════════
    let failedStudents = [];

    try {
        const { data, error } = await supabaseClient
            .from('at_risk_students')
            .select('*');

        if (!error && data) {
            failedStudents = data.map(s => ({
                id: s.student_id,
                name: s.full_name,
                program: s.program,
                year: s.year_level,
                failedUnits: s.failed_units,
                adviser: s.adviser_name || 'Unassigned'
            }));
        }
    } catch (e) {
        console.warn('At-risk students fetch failed:', e);
    }

    function getFailStatus(units) {
        if (units >= 25) return 'critical';
        if (units >= 15) return 'warning';
        return 'safe';
    }

    function renderFailedTable() {
        const q = document.getElementById('failedSearch').value.toLowerCase();
        const statusF = document.getElementById('failedStatusFilter').value;
        const progF = document.getElementById('failedProgramFilter').value;

        const filtered = failedStudents.filter(s => {
            const status = getFailStatus(s.failedUnits);
            const matchSearch = !q || s.name.toLowerCase().includes(q) || s.id.includes(q);
            const matchStatus = statusF === 'all' || status === statusF;
            const matchProg = progF === 'all' || s.program === progF;
            return matchSearch && matchStatus && matchProg;
        });

        const tbody = document.getElementById('failedBody');
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4" style="color:var(--dlsu-gray-400); font-size:0.82rem;"><i class="bi bi-check-circle fs-4 d-block mb-2" style="color:var(--dlsu-green);"></i>No students match the filter criteria</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.sort((a, b) => b.failedUnits - a.failedUnits).map(s => {
            const status = getFailStatus(s.failedUnits);
            const statusLabel = status === 'critical'
                ? `<span class="risk-status-badge critical"><i class="bi bi-exclamation-octagon me-1"></i>Critical</span>`
                : `<span class="risk-status-badge warning"><i class="bi bi-exclamation-triangle me-1"></i>Warning</span>`;
            return `
                <tr>
                    <td class="prof-name">${s.id}</td>
                    <td>${s.name}</td>
                    <td><span class="badge-program">${s.program}</span></td>
                    <td>${{ 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' }[s.year]} Year</td>
                    <td><span class="fw-bold" style="color: ${status === 'critical' ? 'var(--dlsu-danger)' : 'var(--dlsu-warning)'};">${s.failedUnits}</span></td>
                    <td>${statusLabel}</td>
                    <td style="font-size: 0.78rem;">${s.adviser}</td>
                </tr>
            `;
        }).join('');
    }

    document.getElementById('failedSearch').addEventListener('input', renderFailedTable);
    document.getElementById('failedStatusFilter').addEventListener('change', renderFailedTable);
    document.getElementById('failedProgramFilter').addEventListener('change', renderFailedTable);
    document.getElementById('failed-tab').addEventListener('shown.bs.tab', renderFailedTable);
    renderFailedTable();

    // ═══════════════════════════════════════════════════════════════════════
    // TAB 3: COURSE PERFORMANCE ANALYTICS
    // Note: Enrollment-level pass/fail data is not tracked in current schema.
    // Using mock data as placeholder until grade records are implemented.
    // ═══════════════════════════════════════════════════════════════════════
    const coursePerformanceData = {
        BSCpE: [
            { code: 'LBYCPD1', title: 'Computer Programming 1', enrolled: 120, passed: 98, failed: 22 },
            { code: 'LBYCPD2', title: 'Computer Programming 2', enrolled: 110, passed: 78, failed: 32 },
            { code: 'LBYCALC', title: 'Calculus 1',             enrolled: 125, passed: 95, failed: 30 },
            { code: 'LBYPHY1', title: 'Physics 1',              enrolled: 118, passed: 82, failed: 36 },
            { code: 'LBYCPD3', title: 'Data Structures & Algo', enrolled: 100, passed: 72, failed: 28 },
            { code: 'LBYCAL2', title: 'Calculus 2',             enrolled: 105, passed: 68, failed: 37 },
            { code: 'LBYCIRK', title: 'Circuit Analysis',       enrolled: 95,  passed: 60, failed: 35 },
            { code: 'LBYCPG2', title: 'Computer Organization',  enrolled: 88,  passed: 70, failed: 18 },
            { code: 'LBYCPOS', title: 'Operating Systems',      enrolled: 80,  passed: 68, failed: 12 },
            { code: 'LBYCPAI', title: 'Artificial Intelligence', enrolled: 75,  passed: 60, failed: 15 },
        ],
        BSECE: [
            { code: 'LBYEC20', title: 'Circuit Theory 1',     enrolled: 115, passed: 80, failed: 35 },
            { code: 'LBYEC30', title: 'Circuit Theory 2',     enrolled: 105, passed: 68, failed: 37 },
            { code: 'LBYEP01', title: 'Engineering Physics 1', enrolled: 120, passed: 85, failed: 35 },
            { code: 'LBYEP02', title: 'Engineering Physics 2', enrolled: 110, passed: 72, failed: 38 },
            { code: 'LBYEC40', title: 'Electronics 1',        enrolled: 98,  passed: 65, failed: 33 },
            { code: 'LBYSIG1', title: 'Signals & Systems',    enrolled: 90,  passed: 58, failed: 32 },
            { code: 'LBYEM01', title: 'Electromagnetics 1',   enrolled: 85,  passed: 52, failed: 33 },
            { code: 'LBYCOM1', title: 'Communications 1',     enrolled: 80,  passed: 60, failed: 20 },
            { code: 'LBYCTRL', title: 'Control Systems',      enrolled: 75,  passed: 55, failed: 20 },
            { code: 'LBYMICR', title: 'Microprocessors',      enrolled: 78,  passed: 62, failed: 16 },
        ]
    };

    let courseChart;
    function renderCoursePerformanceChart() {
        const program = document.getElementById('courseProgramFilter').value;
        const courses = coursePerformanceData[program];

        if (courseChart) courseChart.destroy();
        const ctx = document.getElementById('coursePerformanceChart').getContext('2d');
        courseChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: courses.map(c => c.code),
                datasets: [
                    {
                        label: 'Passed',
                        data: courses.map(c => c.passed),
                        backgroundColor: 'rgba(0, 112, 60, 0.75)',
                        borderRadius: 4,
                        barPercentage: 0.7,
                    },
                    {
                        label: 'Failed',
                        data: courses.map(c => c.failed),
                        backgroundColor: 'rgba(192, 57, 43, 0.75)',
                        borderRadius: 4,
                        barPercentage: 0.7,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { color: labelColor(), usePointStyle: true, pointStyle: 'rect', padding: 20, font: { weight: 600, size: 11 } } },
                    tooltip: {
                        backgroundColor: isDark() ? '#2d323c' : '#1a1a2e',
                        titleFont: { weight: 700 },
                        bodyFont: { size: 12 },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            afterBody: function(context) {
                                const idx = context[0].dataIndex;
                                const c = courses[idx];
                                const failRate = ((c.failed / c.enrolled) * 100).toFixed(1);
                                return `Fail Rate: ${failRate}%`;
                            }
                        }
                    },
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { color: labelColor(), font: { size: 9, weight: 600 } }
                    },
                    y: {
                        stacked: true,
                        grid: { color: gridColor() },
                        ticks: { color: labelColor(), font: { size: 10 } }
                    }
                }
            }
        });

        renderBottleneckCourses(program);
    }

    document.getElementById('courseProgramFilter').addEventListener('change', renderCoursePerformanceChart);
    document.getElementById('course-tab').addEventListener('shown.bs.tab', renderCoursePerformanceChart);

    function renderBottleneckCourses(program) {
        const courses = coursePerformanceData[program];
        const bottlenecks = courses
            .map(c => ({ ...c, failRate: (c.failed / c.enrolled) * 100 }))
            .filter(c => c.failRate > 20)
            .sort((a, b) => b.failRate - a.failRate);

        const grid = document.getElementById('bottleneckGrid');

        if (bottlenecks.length === 0) {
            grid.innerHTML = `<div class="col-12 text-center py-4" style="color:var(--dlsu-gray-400); font-size:0.82rem;"><i class="bi bi-check-circle fs-4 d-block mb-2" style="color:var(--dlsu-green);"></i>No bottleneck courses detected</div>`;
            return;
        }

        grid.innerHTML = bottlenecks.map(c => `
            <div class="col-sm-6 col-lg-4">
                <div class="bottleneck-card">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <div class="fw-bold" style="font-size: 0.85rem; color: var(--dlsu-green);">${c.code}</div>
                            <div style="font-size: 0.75rem; color: var(--dlsu-gray-600);">${c.title}</div>
                        </div>
                        <span class="bottleneck-rate">${c.failRate.toFixed(1)}%</span>
                    </div>
                    <div class="d-flex align-items-center gap-3 mt-2" style="font-size: 0.72rem;">
                        <span style="color: var(--dlsu-gray-400);"><strong style="color: var(--dlsu-gray-800);">${c.enrolled}</strong> enrolled</span>
                        <span style="color: var(--dlsu-green);"><strong>${c.passed}</strong> passed</span>
                        <span style="color: var(--dlsu-danger);"><strong>${c.failed}</strong> failed</span>
                    </div>
                    <div class="progress-track mt-2" style="height: 6px;">
                        <div class="progress-fill" style="width: ${100 - c.failRate}%; background: var(--dlsu-green); border-radius: 3px;"></div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderCoursePerformanceChart();

    // ═══════════════════════════════════════════════════════════════════════
    // TAB 4: PROFESSOR WORKLOAD REPORT (from faculty_workload view)
    // ═══════════════════════════════════════════════════════════════════════
    let facultyWorkload = [];

    try {
        const { data, error } = await supabaseClient
            .from('faculty_workload')
            .select('*');

        if (!error && data) {
            facultyWorkload = data.map(f => ({
                name: `${f.first_name} ${f.last_name}`,
                dept: f.department || 'DECEE',
                advisees: f.total_advisees || 0,
                reviewed: f.plans_reviewed || 0,
                pending: f.plans_pending || 0,
                initials: f.first_name[0] + f.last_name[0]
            }));
        }
    } catch (e) {
        console.warn('Faculty workload fetch failed:', e);
    }

    function renderWorkloadTable() {
        const tbody = document.getElementById('workloadBody');

        if (facultyWorkload.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4" style="color:var(--dlsu-gray-400); font-size:0.82rem;">No faculty data available.</td></tr>`;
            return;
        }

        tbody.innerHTML = facultyWorkload.map(f => {
            const total = f.reviewed + f.pending;
            const pct = total > 0 ? ((f.reviewed / total) * 100).toFixed(0) : 0;
            let statusBadge, statusClass;
            if (pct >= 90) { statusBadge = 'Complete'; statusClass = 'complete'; }
            else if (pct >= 60) { statusBadge = 'On Track'; statusClass = 'on-track'; }
            else { statusBadge = 'Behind'; statusClass = 'behind'; }

            return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <div style="width:32px;height:32px;border-radius:8px;background:var(--dlsu-green-light);color:var(--dlsu-green);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.72rem;">${f.initials}</div>
                            <span class="prof-name">${f.name}</span>
                        </div>
                    </td>
                    <td>${f.dept}</td>
                    <td>${f.advisees}</td>
                    <td><span style="color: var(--dlsu-green); font-weight: 700;">${f.reviewed}</span></td>
                    <td><span style="color: var(--dlsu-warning); font-weight: 700;">${f.pending}</span></td>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <div class="progress-track flex-grow-1" style="height: 8px;">
                                <div class="progress-fill" style="width: ${pct}%; background: ${pct >= 90 ? 'var(--dlsu-green)' : pct >= 60 ? 'var(--dlsu-warning)' : 'var(--dlsu-danger)'}; border-radius: 4px;"></div>
                            </div>
                            <span style="font-size: 0.72rem; font-weight: 700; min-width: 32px; text-align: right;">${pct}%</span>
                        </div>
                    </td>
                    <td>
                        <span class="workload-report-badge ${statusClass}">${statusBadge}</span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    document.getElementById('workload-tab').addEventListener('shown.bs.tab', renderWorkloadTable);
    renderWorkloadTable();

    // ═══════════════════════════════════════════════════════════════════════
    // EXPORT STUB
    // ═══════════════════════════════════════════════════════════════════════
    document.getElementById('exportBtn').addEventListener('click', () => {
        alert('Export feature: In the production version, this will generate a downloadable PDF/Excel report for the active tab.');
    });
});
