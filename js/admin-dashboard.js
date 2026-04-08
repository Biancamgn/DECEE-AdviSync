/**
 * File:        admin-dashboard.js
 * Description: Admin Dashboard: renders department-level statistics, enrollment charts via Chart.js, and recent activity summary for the admin overview.
 * Author:      Renjovil Joseph V. Lascano
 * Date:        2026-04-02
 */

document.addEventListener('DOMContentLoaded', async () => {

    const currentUser = await requireAuth(['admin']);
    if (!currentUser) return;

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

    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            signOut();
        });
    }

    // =========================================================================
    // =========================================================================
    let totalStudents = 0, clearedStudents = 0, notClearedStudents = 0, atRiskStudents = 0;

    // Try dashboard_stats first (legacy support)
    try {
        const { data: stats, error } = await supabaseClient
            .from('dashboard_stats')
            .select('*')
            .single();

        if (!error && stats) {
            totalStudents = stats.total_students || 0;
            clearedStudents = stats.cleared || 0;
            notClearedStudents = stats.not_cleared || 0;
            atRiskStudents = stats.at_risk || 0;
        }
    } catch (e) {
        console.warn('Dashboard stats fetch failed, checking fallback student calculations:', e);
    }

    // If dashboard_stats is missing/zero, calculate from students table
    if (totalStudents === 0) {
        try {
            const { data: studentRows, error } = await supabaseClient
                .from('students')
                .select('id,is_cleared,failed_units');

            if (!error && studentRows) {
                totalStudents = studentRows.length;
                clearedStudents = studentRows.filter(student => student.is_cleared === true).length;
                notClearedStudents = totalStudents - clearedStudents;
                atRiskStudents = studentRows.filter(student => Number(student.failed_units || 0) >= 15).length;
            }
        } catch (e) {
            console.warn('Fallback student stats fetch failed, using current values:', e);
        }
    }

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
    // STUDENT DISTRIBUTION — Bar Chart (from Supabase)
    // =========================================================================
    let bscpeByYear = [0, 0, 0, 0];
    let bseceByYear = [0, 0, 0, 0];

    try {
        // Prefer active student profiles where possible
        const { data: activeProfiles, error: profileError } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('role', 'student')
            .eq('status', 'active');

        let profileIds = [];
        if (!profileError && activeProfiles) {
            profileIds = activeProfiles.map(p => p.id);
        }

        let { data: studentRows, error } = await supabaseClient
            .from('students')
            .select('id, program, year_level');

        if (!error && studentRows) {
            if (profileIds.length > 0) {
                studentRows = studentRows.filter(s => profileIds.includes(s.id));
            }

            studentRows.forEach(s => {
                const yr = Number(s.year_level);
                if (yr >= 1 && yr <= 4) {
                    if (s.program === 'BSCpE') bscpeByYear[yr - 1]++;
                    else if (s.program === 'BSECE') bseceByYear[yr - 1]++;
                }
            });
        }
    } catch (e) {
        console.warn('Student distribution fetch failed:', e);
    }

    const distributionCtx = document.getElementById('distributionChart').getContext('2d');
    new Chart(distributionCtx, {
        type: 'bar',
        data: {
            labels: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
            datasets: [
                {
                    label: 'BSCpE',
                    data: bscpeByYear,
                    backgroundColor: '#00703C',
                    borderRadius: 6
                },
                {
                    label: 'BSECE',
                    data: bseceByYear,
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
    const advisersList = document.getElementById('advisersList');

    async function renderAdviserWorkload(rows) {
        if (!rows || rows.length === 0) {
            advisersList.innerHTML = `<tr><td colspan="4" class="text-center py-3" style="color:var(--dlsu-gray-400); font-size:0.82rem;">No faculty data available. Seed the database to populate this table.</td></tr>`;
            return;
        }

        advisersList.innerHTML = '';

        rows.forEach(adviser => {
            const reviewed = adviser.reviewed || 0;
            const total = adviser.total || 0;
            const pct = total > 0 ? Math.round((reviewed / total) * 100) : 0;

            let fillClass = 'safe';
            if (pct === 100) fillClass = 'done';
            else if (pct < 30) fillClass = 'danger';
            else if (pct < 70) fillClass = 'warning';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="prof-name">Dr. ${adviser.first_name} ${adviser.last_name}</td>
                <td><span class="badge-program">${adviser.department || 'DECEE'}</span></td>
                <td>${reviewed} / ${total}</td>
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
    }

    try {
        const { data: workload, error } = await supabaseClient
            .from('faculty_workload')
            .select('*');

        if (!error && workload && workload.length > 0) {
            await renderAdviserWorkload(workload.map(a => ({
                first_name: a.first_name,
                last_name: a.last_name,
                department: a.department || 'DECEE',
                reviewed: a.plans_reviewed || 0,
                total: a.total_advisees || 0
            })));
        } else {
            // fallback to profiles+students calculation
            const [{ data: advisers, error: adviserError }, { data: studentRows, error: studentError }] = await Promise.all([
                supabaseClient.from('profiles').select('id,first_name,last_name,school_id').eq('role', 'adviser'),
                supabaseClient.from('students').select('adviser_id,is_cleared')
            ]);

            if (adviserError || studentError) {
                console.warn('Adviser fallback fetch error', adviserError, studentError);
                return renderAdviserWorkload([]);
            }

            const statsByAdviser = {};
            studentRows.forEach(s => {
                if (!s.adviser_id) return;
                if (!statsByAdviser[s.adviser_id]) statsByAdviser[s.adviser_id] = { total: 0, reviewed: 0 };
                statsByAdviser[s.adviser_id].total += 1;
                if (s.is_cleared) statsByAdviser[s.adviser_id].reviewed += 1;
            });

            const fallback = advisers.map(a => ({
                ...a,
                total: statsByAdviser[a.id]?.total || 0,
                reviewed: statsByAdviser[a.id]?.reviewed || 0
            }));

            await renderAdviserWorkload(fallback);
        }
    } catch (e) {
        console.warn('Faculty workload fetch failed:', e);
        advisersList.innerHTML = `<tr><td colspan="4" class="text-center py-3" style="color:var(--dlsu-gray-400); font-size:0.82rem;">Unable to load adviser data.</td></tr>`;
    }
});
