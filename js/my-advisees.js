async function loadAdvisees() {
    const profile = await requireAuth(['adviser']);
    if (!profile) return;

    try {
        const { data, error } = await supabaseClient
            .from('advisees')
            .select(`
                student_id,
                profiles!advisees_student_id_fkey (
                    first_name,
                    last_name,
                    email,
                    school_id
                ),
                students!inner (
                    program,
                    year_level,
                    failed_units,
                    is_cleared
                )
            `)
            .eq('adviser_id', profile.id);

        if (error) {
            console.error('Error fetching advisees:', error);
            return;
        }

        renderAdvisees(data);

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

function renderAdvisees(advisees) {
    const tbody = document.querySelector('#adviseeTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!advisees || advisees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No advisees found.</td></tr>';
        return;
    }

    advisees.forEach(advisee => {
        const p = advisee.profiles;
        const s = advisee.students;
        const fullName = `${p.first_name} ${p.last_name}`;
        const program = s.program || '-';
        const yearLevel = s.year_level || '-';
        const failedUnits = s.failed_units ?? 0;
        const isCleared = s.is_cleared;
        const statusLabel = isCleared ? 'cleared' : 'not-cleared';
        const statusText = isCleared ? 'Cleared' : 'Not Cleared';
        const programLower = program.toLowerCase().replace('bs', '');

        const row = document.createElement('tr');
        row.dataset.program = programLower;
        row.dataset.status = statusLabel;
        row.innerHTML = `
            <td>
                <div class="student-name">${fullName}</div>
                <div class="student-email">${p.email}</div>
            </td>
            <td>${p.school_id}</td>
            <td><span class="program-badge ${programLower}">${program}</span></td>
            <td>${yearLevel}</td>
            <td><span class="failed-units ${failedUnits >= 15 ? 'warning' : 'safe'}">${failedUnits} / 30</span></td>
            <td><span class="status-badge ${statusLabel}">${statusText}</span></td>
            <td><a href="#" class="btn-view">View</a></td>
        `;
        tbody.appendChild(row);
    });
}

function filterTable() {
    const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const program = document.getElementById('filterProgram')?.value || 'all';
    const status = document.getElementById('filterStatus')?.value || 'all';

    document.querySelectorAll('#adviseeTable tbody tr').forEach(row => {
        const text = row.textContent.toLowerCase();
        const matchSearch = !search || text.includes(search);
        const matchProgram = program === 'all' || row.dataset.program === program;
        const matchStatus = status === 'all' || row.dataset.status === status;
        row.style.display = (matchSearch && matchProgram && matchStatus) ? '' : 'none';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadAdvisees();

    document.getElementById('searchInput')?.addEventListener('input', filterTable);
    document.getElementById('filterProgram')?.addEventListener('change', filterTable);
    document.getElementById('filterStatus')?.addEventListener('change', filterTable);
});