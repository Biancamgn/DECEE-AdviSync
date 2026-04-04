async function loadAcademicAdvising() {
    try {
        const profile = await requireAuth(['adviser']);
        if (!profile) return;
        window._advisingProfile = profile;

        await Promise.all([
            loadDeadline(),
            loadSubmissionProgress(profile.id)
        ]);
    } catch (err) {
        console.error('loadAcademicAdvising error:', err);
        const tbody = document.querySelector('.tracker-table tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--dlsu-danger);">Failed to load data. Please refresh.</td></tr>';
        const progressLabel = document.querySelector('.progress-label');
        if (progressLabel) progressLabel.textContent = 'Error loading data';
    }
}

async function loadDeadline() {
    const { data, error } = await supabaseClient
        .from('terms')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

    if (error || !data) {
        console.warn('Could not load term deadline:', error);
        return;
    }

    const ddValue = document.querySelector('.dd-value');
    if (ddValue) {
        const deadlineStr = data.deadline_date
            ? new Date(data.deadline_date).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric'
              })
            : 'Not set';
        ddValue.textContent = `${deadlineStr} · ${data.term_name}, AY ${data.academic_year}`;
    }

    const aySelect   = document.getElementById('aySelect');
    const termSelect = document.getElementById('termSelect');
    const dateInput = document.querySelector('input[type="date"].form-control-custom');
    if (aySelect)   aySelect.value = data.academic_year || '';
    if (termSelect) termSelect.value = data.term_name     || '';
    if (dateInput && data.deadline_date) dateInput.value = data.deadline_date.split('T')[0];

    window._currentTermId = data.id;
}

async function loadSubmissionProgress(adviserId) {
    try {
        const { data: adviseeRows, error: adviseeError } = await supabaseClient
            .from('advisees')
            .select('student_id')
            .eq('adviser_id', adviserId);

        const { data: studentAdvRows } = await supabaseClient
            .from('students')
            .select('id')
            .eq('adviser_id', adviserId);

        if (adviseeError) {
            console.error('Error loading advisees:', adviseeError);
            updateProgressUI([], {}, {});
            return;
        }

        // Merge both sources, deduplicate
        const idSet = new Set();
        (adviseeRows || []).forEach(r => idSet.add(r.student_id));
        (studentAdvRows || []).forEach(r => idSet.add(r.id));

        if (idSet.size === 0) {
            updateProgressUI([], {}, {});
            return;
        }

        const studentIds = [...idSet];

        const { data: profileRows, error: profileError } = await supabaseClient
            .from('profiles')
            .select('id, first_name, last_name, school_id')
            .in('id', studentIds);

        if (profileError || !profileRows) {
            console.error('Error loading profiles:', profileError);
            updateProgressUI([], {}, {});
            return;
        }

        // Get student records to get program info and clearance status
        const { data: studentRows } = await supabaseClient
            .from('students')
            .select('id, program, is_cleared, failed_units')
            .in('id', studentIds);

        const studentMap = {};
        (studentRows || []).forEach(s => { studentMap[s.id] = s; });

        // Attach program from students table to each profile
        profileRows.forEach(p => {
            p.program = studentMap[p.id]?.program || p.program || '—';
        });

        // Get active term to filter forms
        const { data: activeTerm } = await supabaseClient
            .from('terms')
            .select('id')
            .eq('is_active', true)
            .limit(1)
            .single();

        let formQuery = supabaseClient
            .from('advising_forms')
            .select('student_id, status, submitted_at')
            .eq('adviser_id', adviserId)
            .in('student_id', studentIds);

        if (activeTerm) {
            formQuery = formQuery.eq('term_id', activeTerm.id);
        }

        const { data: formRows, error: formError } = await formQuery;

        if (formError) console.warn('Error loading forms:', formError);

        const formMap = {};
        (formRows || []).forEach(f => { formMap[f.student_id] = f; });

        updateProgressUI(profileRows, formMap, studentMap);
    } catch (err) {
        console.error('loadSubmissionProgress error:', err);
        updateProgressUI([], {}, {});
    }
}

function updateProgressUI(profiles, formMap, studentMap) {
    const total     = profiles.length;
    const submitted = profiles.filter(p =>
        formMap[p.id] && ['pending', 'approved', 'for_revision'].includes(formMap[p.id].status)
    ).length;

    const pct = total > 0 ? (submitted / total) * 100 : 0;
    const progressFill  = document.querySelector('.progress-fill');
    const progressLabel = document.querySelector('.progress-label');
    if (progressFill)  progressFill.style.width = `${pct}%`;
    if (progressLabel) progressLabel.textContent = `${submitted} / ${total} submitted`;

    const tbody = document.querySelector('.tracker-table tbody');
    if (!tbody) return;

    if (profiles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--dlsu-gray-400);">No advisees found.</td></tr>';
        return;
    }

    tbody.innerHTML = profiles.map(p => {
        const form     = formMap[p.id];
        const student  = (studentMap || {})[p.id] || {};
        const program  = p.program || '—';
        const fullName = `${p.first_name} ${p.last_name}`;
        const schoolId = p.school_id || '—';

        let badgeClass, badgeLabel, dateStr;

        if (!form) {
            // Match My Advisees fallback: check is_cleared and failed_units
            const failedUnits = student.failed_units ?? 0;
            const isCleared   = student.is_cleared ?? false;
            if (isCleared) {
                badgeClass = 'reviewed';
                badgeLabel = 'Cleared';
            } else if (failedUnits >= 15) {
                badgeClass = 'revision';
                badgeLabel = 'At-Risk';
            } else {
                badgeClass = 'not-submitted';
                badgeLabel = 'Not Submitted';
            }
            dateStr = '—';
        } else if (form.status === 'approved') {
            badgeClass = 'reviewed';
            badgeLabel = 'Reviewed';
            dateStr    = formatDate(form.submitted_at);
        } else if (form.status === 'for_revision') {
            badgeClass = 'revision';
            badgeLabel = 'For Revision';
            dateStr    = formatDate(form.submitted_at);
        } else {
            badgeClass = 'submitted';
            badgeLabel = 'Submitted';
            dateStr    = formatDate(form.submitted_at);
        }

        return `
        <tr>
            <td><strong>${fullName}</strong></td>
            <td>${schoolId}</td>
            <td>${program}</td>
            <td><span class="sub-status-badge ${badgeClass}">${badgeLabel}</span></td>
            <td>${dateStr}</td>
        </tr>`;
    }).join('');
}

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });
}

async function saveDeadline() {
    const aySelect   = document.getElementById('aySelect');
    const termSelect = document.getElementById('termSelect');
    const dateInput = document.querySelector('input[type="date"].form-control-custom');

    const academicYear = aySelect?.value;
    const termName     = termSelect?.value;
    const deadlineDate = dateInput?.value;

    if (!deadlineDate) { alert('Please set a deadline date.'); return; }
    if (!window._currentTermId) { alert('Term not loaded yet. Please refresh.'); return; }

    const { error } = await supabaseClient
        .from('terms')
        .update({ academic_year: academicYear, term_name: termName, deadline_date: deadlineDate })
        .eq('id', window._currentTermId);

    if (error) {
        console.error('Save deadline error:', error);
        alert('Failed to save deadline.');
        return;
    }

    const ddValue = document.querySelector('.dd-value');
    if (ddValue) {
        const formatted = new Date(deadlineDate).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric'
        });
        ddValue.textContent = `${formatted} · ${termName}, AY ${academicYear}`;
    }

    alert('Deadline updated successfully!');
}

function filterTracker() {
    const search = document.getElementById('trackerSearch')?.value.toLowerCase() || '';
    const filter = document.getElementById('trackerFilter')?.value || 'all';

    document.querySelectorAll('.tracker-table tbody tr').forEach(row => {
        const text = row.textContent.toLowerCase();
        const badge = row.querySelector('.sub-status-badge');
        const badgeClass = badge ? badge.className : '';

        const matchSearch = !search || text.includes(search);
        let matchFilter = filter === 'all';
        if (!matchFilter) {
            if (filter === 'submitted' && badgeClass.includes('submitted')) matchFilter = true;
            if (filter === 'reviewed' && badgeClass.includes('reviewed')) matchFilter = true;
            if (filter === 'revision' && badgeClass.includes('revision')) matchFilter = true;
            if (filter === 'not-submitted' && badgeClass.includes('not-submitted')) matchFilter = true;
        }

        row.style.display = (matchSearch && matchFilter) ? '' : 'none';
    });
}

async function sendReminders() {
    const profile = window._advisingProfile;
    if (!profile) return;

    const { data: adviseeRows } = await supabaseClient
        .from('advisees')
        .select('student_id')
        .eq('adviser_id', profile.id);

    if (!adviseeRows || adviseeRows.length === 0) {
        alert('No advisees to remind.');
        return;
    }

    const studentIds = adviseeRows.map(r => r.student_id);

    const { data: formRows } = await supabaseClient
        .from('advising_forms')
        .select('student_id')
        .eq('adviser_id', profile.id)
        .in('student_id', studentIds);

    const submittedIds = new Set((formRows || []).map(f => f.student_id));
    const unsubmitted = studentIds.filter(id => !submittedIds.has(id));

    if (unsubmitted.length === 0) {
        alert('All advisees have submitted their forms!');
        return;
    }

    const notifications = unsubmitted.map(studentId => ({
        user_id: studentId,
        title: 'Advising Form Reminder',
        message: 'Please submit your academic advising form before the deadline. Your adviser is waiting for your submission.',
        type: 'warning',
        link: 'student-academic-booklet.html'
    }));

    const { error } = await supabaseClient
        .from('notifications')
        .insert(notifications);

    if (error) {
        console.error('Reminder error:', error);
        alert('Failed to send reminders.');
        return;
    }

    alert(`Reminders sent to ${unsubmitted.length} student(s)!`);
}

document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.querySelector('.btn-save');
    if (saveBtn) saveBtn.onclick = saveDeadline;
    loadAcademicAdvising();
});