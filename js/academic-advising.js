function saveDeadline() {
    // TODO: persist to database when advising_deadlines table is created
    const t = document.getElementById('toast');
    const msg = document.getElementById('toastMsg');
    if (t && msg) {
        msg.textContent = 'Deadline updated successfully!';
        t.style.display = 'flex';
        setTimeout(() => t.style.display = 'none', 3000);
    }
}

(async function() {
    const profile = await requireAuth(['adviser']);
    if (!profile) return;

    const adviserId = profile.id;

    // Fetch advisees with their profiles and advising form status
    const { data: students, error } = await supabaseClient
        .from('students')
        .select('id, student_number, program, profiles!inner(first_name, last_name)')
        .eq('adviser_id', adviserId);

    if (error) { console.error('Error loading advisees:', error); return; }

    // Fetch advising forms submitted by these students
    const studentIds = (students || []).map(s => s.id);
    let formsMap = {};
    if (studentIds.length > 0) {
        const { data: forms } = await supabaseClient
            .from('advising_forms')
            .select('student_id, status, submitted_at')
            .in('student_id', studentIds);
        if (forms) {
            forms.forEach(f => { formsMap[f.student_id] = f; });
        }
    }

    // Build table rows
    const tbody = document.querySelector('.tracker-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let submittedCount = 0;
    const total = students ? students.length : 0;

    (students || []).forEach(s => {
        const name = (s.profiles?.first_name || '') + ' ' + (s.profiles?.last_name || '');
        const form = formsMap[s.id];
        let statusClass = 'not-submitted';
        let statusText = 'Not Submitted';
        let dateText = '—';

        if (form) {
            if (form.status === 'reviewed' || form.status === 'approved') {
                statusClass = 'reviewed';
                statusText = 'Reviewed';
            } else {
                statusClass = 'submitted';
                statusText = 'Submitted';
            }
            submittedCount++;
            if (form.submitted_at) {
                const d = new Date(form.submitted_at);
                dateText = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${name}</strong></td><td>${s.student_number || '—'}</td><td>${s.program || '—'}</td><td><span class="sub-status-badge ${statusClass}">${statusText}</span></td><td>${dateText}</td>`;
        tbody.appendChild(tr);
    });

    // Update progress bar
    const pct = total > 0 ? Math.round((submittedCount / total) * 100) : 0;
    const progressFill = document.querySelector('.progress-fill');
    const progressLabel = document.querySelector('.progress-label');
    if (progressFill) progressFill.style.width = pct + '%';
    if (progressLabel) progressLabel.textContent = submittedCount + ' / ' + total + ' submitted';
})();
