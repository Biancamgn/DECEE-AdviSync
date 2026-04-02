async function loadAdvisees() {
    const tableBody = document.querySelector('#adviseeTable tbody');

    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--dlsu-gray-400);">Loading advisees...</td></tr>';

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) { window.location.href = 'index.html'; return; }

        const adviserId = session.user.id;

        // Step 1: get student_ids from advisees table
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

        // Step 2: get profiles for those student IDs
        const { data: profileRows, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .in('id', studentIds);

        if (profileError) {
            console.error('Error fetching profiles:', profileError);
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--dlsu-danger);">Failed to load student profiles.</td></tr>';
            return;
        }

        // Step 3: get student records for those IDs
        const { data: studentRows, error: studentError } = await supabaseClient
            .from('students')
            .select('*')
            .in('id', studentIds);

        if (studentError) {
            console.error('Error fetching student records:', studentError);
        }

        // Map student records by id for easy lookup
        const studentMap = {};
        (studentRows || []).forEach(s => { studentMap[s.id] = s; });

        tableBody.innerHTML = '';

        let totalCount   = 0;
        let clearedCount = 0;
        let pendingCount = 0;
        let riskCount    = 0;

        profileRows.forEach(profile => {
            const studentInfo = studentMap[profile.id] || {};
            const failedUnits = studentInfo.failed_units ?? 0;
            const isCleared   = studentInfo.is_cleared   ?? false;

            let status      = 'cleared';
            let statusLabel = 'Cleared';
            let failedClass = 'safe';

            if (failedUnits >= 15) {
                status      = 'at-risk';
                statusLabel = 'At-Risk';
                failedClass = failedUnits >= 24 ? 'danger' : 'warn';
                riskCount++;
            } else if (!isCleared) {
                status      = 'pending';
                statusLabel = 'Pending';
                pendingCount++;
            } else {
                clearedCount++;
            }

            totalCount++;

            const program = studentInfo.program || profile.program || '—';
            let programClass = 'cpe';
            if (program.includes('ECE'))                           programClass = 'ece';
            else if (program.includes('EE') && !program.includes('ECE')) programClass = 'ee';

            const fullName   = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
            const idNumber   = profile.school_id || '—';
            const email      = profile.email     || '—';
            const currentTerm = studentInfo.current_term || '—';

            const row = document.createElement('tr');
            row.dataset.program = programClass;
            row.dataset.status  = status;

            row.innerHTML = `
                <td>
                    <div class="student-name">${fullName}</div>
                    <div class="student-email">${email}</div>
                </td>
                <td>${idNumber}</td>
                <td><span class="program-badge ${programClass}">${program}</span></td>
                <td>${currentTerm}</td>
                <td><span class="failed-units ${failedClass}">${failedUnits} / 30</span></td>
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
    const totalEl   = document.querySelector('.chip-total');
    const clearedEl = document.querySelector('.chip-cleared');
    const pendingEl = document.querySelector('.chip-pending');
    const riskEl    = document.querySelector('.chip-risk');
    if (totalEl)   totalEl.textContent   = total;
    if (clearedEl) clearedEl.textContent = cleared;
    if (pendingEl) pendingEl.textContent = pending;
    if (riskEl)    riskEl.textContent    = risk;
}

function filterTable() {
    const search  = document.getElementById('searchInput').value.toLowerCase();
    const program = document.getElementById('filterProgram').value;
    const status  = document.getElementById('filterStatus').value;
    document.querySelectorAll('#adviseeTable tbody tr').forEach(row => {
        const text         = row.textContent.toLowerCase();
        const matchSearch  = !search || text.includes(search);
        const matchProgram = program === 'all' || row.dataset.program === program;
        const matchStatus  = status  === 'all' || row.dataset.status  === status;
        row.style.display  = (matchSearch && matchProgram && matchStatus) ? '' : 'none';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { loadAdvisees(); }, 300);
});