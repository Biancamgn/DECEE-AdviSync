async function loadEmailSystem() {
    const profile = await requireAuth(['adviser']);
    if (!profile) return;

    const { data: adviseeRows, error } = await supabaseClient
        .from('advisees')
        .select('student_id')
        .eq('adviser_id', profile.id);

    if (error || !adviseeRows) {
        console.error('Error loading advisees:', error);
        return;
    }

    const studentIds = adviseeRows.map(r => r.student_id);

    if (studentIds.length === 0) {
        updateRecipientUI(0, {});
        return;
    }

    const { data: profileRows, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id, first_name, last_name, school_id, program')
        .in('id', studentIds);

    if (profileError || !profileRows) {
        console.error('Error loading student profiles:', profileError);
        return;
    }

    const programCounts = {};
    profileRows.forEach(p => {
        const prog = p.program || 'Unknown';
        programCounts[prog] = (programCounts[prog] || 0) + 1;
    });

    updateRecipientUI(profileRows.length, programCounts);
    populateStudentDropdown(profileRows);

    window._allAdviseeProfiles = profileRows;
}

function updateRecipientUI(total, programCounts) {
    const recipientInput = document.querySelector('#mode-bulk .form-control-custom[disabled]');
    if (recipientInput) recipientInput.value = `All Advisees (${total} students)`;

    const recipientInfo = document.querySelector('.recipient-info');
    if (recipientInfo) {
        const breakdown = Object.entries(programCounts)
            .map(([prog, count]) => `${prog} (${count})`)
            .join(', ');
        recipientInfo.innerHTML = `<i class="bi bi-info-circle"></i> ${breakdown || 'No students assigned'}`;
    }

    const bulkDesc = document.querySelector('#mode-bulk .section-desc');
    if (bulkDesc) bulkDesc.textContent = `This email will be sent to all ${total} of your assigned advisees.`;
}

function populateStudentDropdown(profiles) {
    const select = document.querySelector('#mode-individual select.form-control-custom');
    if (!select) return;

    select.innerHTML = '<option value="">Select a student...</option>';
    profiles.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `${p.first_name} ${p.last_name} (${p.school_id}) — ${p.program || '—'}`;
        select.appendChild(option);
    });
}

function switchMode(mode) {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    event.target.closest('.mode-btn').classList.add('active');
    document.getElementById('mode-' + mode).classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
    loadEmailSystem();
});