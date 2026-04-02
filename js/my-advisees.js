/* ══ My Advisees — Page Script ══ */

async function loadAdvisees() {
    const tableBody = document.querySelector('#adviseeTable tbody');
    const totalEl = document.querySelector('.chip-total');
    const clearedEl = document.querySelector('.chip-cleared');
    const pendingEl = document.querySelector('.chip-pending');
    const riskEl = document.querySelector('.chip-risk');

    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--dlsu-gray-400);">Loading advisees...</td></tr>';

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = 'index.html';
            return;
        }

        const adviserId = session.user.id;

        const { data: adviseeRows, error: adviseeError } = await supabaseClient
            .from('advisees')
            .select('student_id')
            .eq('adviser_id', adviserId);

        if (adviseeError) {
            console.error('Error fetching advisees:', adviseeError);
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--dlsu-danger);">Failed to load advisees.</td></tr>';
            return;
        }

        if (!adviseeRows || adviseeRows.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--dlsu-gray-400);">No advisees assigned.</td></tr>';
            updateCounts(0, 0, 0, 0);
            return;
        }

        const studentIds = adviseeRows.map(r => r.student_id);

        // Fetch profiles and student records separately for reliability
        const { data: profiles, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .in('id', studentIds);

        if (profileError) {
            console.error('Error fetching profiles:', profileError);
        }

        const { data: studentRecords, error: studentRecError } = await supabaseClient
            .from('students')
            .select('*')
            .in('id', studentIds);

        if (studentRecError) {
            console.error('Error fetching student records:', studentRecError);
        }

        // Merge profiles with student records
        const studentMap = {};
        (studentRecords || []).forEach(s => { studentMap[s.id] = s; });

        const students = (profiles || []).map(p => ({
            ...p,
            students: studentMap[p.id] || {}
        }));

        if (!students.length) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--dlsu-gray-400);">No student details found.</td></tr>';
            updateCounts(0, 0, 0, 0);
            return;
        }

        tableBody.innerHTML = '';

        let totalCount = 0;
        let clearedCount = 0;
        let pendingCount = 0;
        let riskCount = 0;

        students.forEach(student => {
            const profile = student;
            const studentInfo = student.students || {};
            const failedUnits = studentInfo.failed_units || 0;
            const maxUnits = 30;
            const isCleared = studentInfo.is_cleared || false;
            let status = 'cleared';
            let statusLabel = 'Cleared';
            let failedClass = 'safe';

            if (failedUnits >= 15) {
                status = 'at-risk';
                statusLabel = 'At-Risk';
                failedClass = failedUnits >= 24 ? 'danger' : 'warn';
                riskCount++;
            } else if (!isCleared) {
                status = 'pending';
                statusLabel = 'Pending';
                pendingCount++;
            } else {
                clearedCount++;
            }

            totalCount++;

            const program = studentInfo.program || profile.program || 'BS-CpE';
            let programClass = 'cpe';
            if (program.includes('ECE')) programClass = 'ece';
            else if (program.includes('EE') && !program.includes('ECE')) programClass = 'ee';

            const row = document.createElement('tr');
            row.dataset.program = programClass;
            row.dataset.status = status;

            const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
            const idNumber = profile.school_id || profile.id || '-';
            const email = profile.email || '-';
            const currentTerm = studentInfo.current_term || '-';

            row.innerHTML = `
                <td>
                    <div class="student-name">${fullName}</div>
                    <div class="student-email">${email}</div>
                </td>
                <td>${idNumber}</td>
                <td><span class="program-badge ${programClass}">${program}</span></td>
                <td>${currentTerm}</td>
                <td><span class="failed-units ${failedClass}">${failedUnits} / ${maxUnits}</span></td>
                <td><span class="status-badge ${status}">${statusLabel}</span></td>
                <td><a href="#" class="btn-view">View</a></td>
            `;
            tableBody.appendChild(row);
        });

        updateCounts(totalCount, clearedCount, pendingCount, riskCount);

    } catch (err) {
        console.error('Unexpected error:', err);
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--dlsu-danger);">An error occurred.</td></tr>';
    }
}

function updateCounts(total, cleared, pending, risk) {
    const totalEl = document.querySelector('.chip-total');
    const clearedEl = document.querySelector('.chip-cleared');
    const pendingEl = document.querySelector('.chip-pending');
    const riskEl = document.querySelector('.chip-risk');

    if (totalEl) totalEl.textContent = total;
    if (clearedEl) clearedEl.textContent = cleared;
    if (pendingEl) pendingEl.textContent = pending;
    if (riskEl) riskEl.textContent = risk;
}

function filterTable() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const program = document.getElementById('filterProgram').value;
    const status = document.getElementById('filterStatus').value;
    document.querySelectorAll('#adviseeTable tbody tr').forEach(row => {
        const text = row.textContent.toLowerCase();
        const matchSearch = !search || text.includes(search);
        const matchProgram = program === 'all' || row.dataset.program === program;
        const matchStatus = status === 'all' || row.dataset.status === status;
        row.style.display = (matchSearch && matchProgram && matchStatus) ? '' : 'none';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        loadAdvisees();
    }, 300);
});