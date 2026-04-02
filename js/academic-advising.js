async function loadAcademicAdvising() {
    const profile = await requireAuth(['adviser']);
    if (!profile) return;

    await Promise.all([
        loadDeadline(),
        loadSubmissionProgress(profile.id)
    ]);
}

async function loadDeadline() {
    const { data, error } = await supabaseClient
        .from('terms')
        .select('*')
        .eq('is_active', true)
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

    const selects   = document.querySelectorAll('select.form-control-custom');
    const dateInput = document.querySelector('input[type="date"].form-control-custom');
    if (selects[0])  selects[0].value = data.academic_year || '';
    if (selects[1])  selects[1].value = data.term_name     || '';
    if (dateInput && data.deadline_date) dateInput.value = data.deadline_date.split('T')[0];

    window._currentTermId = data.id;
}

async function loadSubmissionProgress(adviserId) {
    const { data: adviseeRows, error: adviseeError } = await supabaseClient
        .from('advisees')
        .select('student_id')
        .eq('adviser_id', adviserId);

    if (adviseeError || !adviseeRows) {
        console.error('Error loading advisees:', adviseeError);
        return;
    }

    if (adviseeRows.length === 0) {
        updateProgressUI([], {});
        return;
    }

    const studentIds = adviseeRows.map(r => r.student_id);

    const { data: profileRows, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id, first_name, last_name, school_id, program')
        .in('id', studentIds);

    if (profileError || !profileRows) {
        console.error('Error loading profiles:', profileError);
        return;
    }

    const { data: formRows, error: formError } = await supabaseClient
        .from('advising_forms')
        .select('student_id, status, submitted_at')
        .eq('adviser_id', adviserId)
        .in('student_id', studentIds);

    if (formError) console.warn('Error loading forms:', formError);

    const formMap = {};
    (formRows || []).forEach(f => { formMap[f.student_id] = f; });

    updateProgressUI(profileRows, formMap);
}

function updateProgressUI(profiles, formMap) {
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
        const program  = p.program || '—';
        const fullName = `${p.first_name} ${p.last_name}`;
        const schoolId = p.school_id || '—';

        let badgeClass, badgeLabel, dateStr;

        if (!form) {
            badgeClass = 'not-submitted';
            badgeLabel = 'Not Submitted';
            dateStr    = '—';
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
    const selects   = document.querySelectorAll('select.form-control-custom');
    const dateInput = document.querySelector('input[type="date"].form-control-custom');

    const academicYear = selects[0]?.value;
    const termName     = selects[1]?.value;
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

document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.querySelector('.btn-save');
    if (saveBtn) saveBtn.onclick = saveDeadline;
    loadAcademicAdvising();
});