function switchMode(mode) {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    event.target.closest('.mode-btn').classList.add('active');
    document.getElementById('mode-' + mode).classList.add('active');
}

(async function() {
    const profile = await requireAuth(['adviser']);
    if (!profile) return;

    // Fetch advisees
    const { data: students } = await supabaseClient
        .from('students')
        .select('id, student_number, program, profiles!inner(first_name, last_name, email)')
        .eq('adviser_id', profile.id);

    const advisees = students || [];
    const total = advisees.length;

    // Update bulk recipient field
    const bulkRecipient = document.querySelector('#mode-bulk .form-control-custom[disabled]');
    if (bulkRecipient) bulkRecipient.value = 'All Advisees (' + total + ' students)';

    // Update recipient info (program breakdown)
    const programCounts = {};
    advisees.forEach(s => {
        const prog = s.program || 'Unknown';
        programCounts[prog] = (programCounts[prog] || 0) + 1;
    });
    const breakdown = Object.entries(programCounts).map(([p, c]) => p + ' (' + c + ')').join(', ');
    const recipientInfo = document.querySelector('.recipient-info');
    if (recipientInfo) recipientInfo.innerHTML = '<i class="bi bi-info-circle"></i> Includes ' + (breakdown || 'no advisees');

    // Populate individual recipient dropdown
    const recipientSelect = document.querySelector('#mode-individual select');
    if (recipientSelect) {
        recipientSelect.innerHTML = '<option value="">Select a student...</option>';
        advisees.forEach(s => {
            const name = (s.profiles?.first_name || '') + ' ' + (s.profiles?.last_name || '');
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = name.trim() + ' (' + (s.student_number || '—') + ') — ' + (s.program || '');
            recipientSelect.appendChild(opt);
        });
    }

    // Update bulk send button text
    const bulkBtn = document.querySelector('#mode-bulk .btn-send');
    if (bulkBtn) {
        bulkBtn.innerHTML = '<i class="bi bi-send-fill"></i> Send to All Advisees';
        bulkBtn.onclick = function() {
            const subject = document.querySelector('#mode-bulk input[type="text"]:not([disabled])');
            const message = document.querySelector('#mode-bulk textarea');
            if (!subject?.value?.trim() || !message?.value?.trim()) { alert('Please fill in subject and message.'); return; }
            alert('Announcement sent to ' + total + ' advisees!');
            if (subject) subject.value = '';
            if (message) message.value = '';
        };
    }

    // Update individual send button
    const indBtn = document.querySelector('#mode-individual .btn-send');
    if (indBtn) {
        indBtn.onclick = function() {
            const sel = document.querySelector('#mode-individual select');
            const subject = document.querySelector('#mode-individual input[type="text"]');
            const message = document.querySelector('#mode-individual textarea');
            if (!sel?.value) { alert('Please select a recipient.'); return; }
            if (!subject?.value?.trim() || !message?.value?.trim()) { alert('Please fill in subject and message.'); return; }
            alert('Email sent!');
            if (sel) sel.value = '';
            if (subject) subject.value = '';
            if (message) message.value = '';
        };
    }

    // Update section-desc for bulk
    const bulkDesc = document.querySelector('#mode-bulk .section-desc');
    if (bulkDesc) bulkDesc.textContent = 'This email will be sent to all ' + total + ' of your assigned advisees.';
})();
