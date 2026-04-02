async function loadEmailSystem() {
    const profile = await requireAuth(['adviser']);
    if (!profile) return;

    window._adviserProfile = profile;

    const { data: adviseeRows, error } = await supabaseClient
        .from('advisees')
        .select('student_id')
        .eq('adviser_id', profile.id);

    if (error || !adviseeRows) { console.error('Error loading advisees:', error); return; }

    const studentIds = adviseeRows.map(r => r.student_id);

    if (studentIds.length === 0) {
        updateRecipientUI(0, {});
        return;
    }

    const { data: profileRows, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id, first_name, last_name, school_id, program')
        .in('id', studentIds);

    if (profileError || !profileRows) { console.error('Error loading profiles:', profileError); return; }

    const programCounts = {};
    profileRows.forEach(p => {
        const prog = p.program || 'Unknown';
        programCounts[prog] = (programCounts[prog] || 0) + 1;
    });

    updateRecipientUI(profileRows.length, programCounts);
    populateStudentDropdown(profileRows);
    window._allAdviseeProfiles = profileRows;

    loadRecentlySent(profile.id);
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
    const select = document.getElementById('individualRecipient');
    if (!select) return;
    select.innerHTML = '<option value="">Select a student...</option>';
    profiles.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `${p.first_name} ${p.last_name} (${p.school_id}) — ${p.program || '—'}`;
        select.appendChild(option);
    });
}

async function loadRecentlySent(adviserId) {
    const container = document.getElementById('recentlySentContainer');
    if (!container) return;

    const { data, error } = await supabaseClient
        .from('email_log')
        .select('*')
        .eq('sender_id', adviserId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error || !data || data.length === 0) {
        container.innerHTML = '<div class="empty-state">No emails sent yet.</div>';
        return;
    }

    container.innerHTML = data.map(email => {
        const isBulk    = email.recipient_group === 'bulk';
        const iconClass = isBulk ? 'bulk' : 'individual';
        const icon      = isBulk ? 'megaphone' : 'person';
        const toLabel   = isBulk
            ? `All Advisees (${email.recipient_count || '—'})`
            : (email.recipient_name || '—');
        const sentDate  = email.created_at
            ? new Date(email.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: 'numeric', minute: '2-digit'
              })
            : '—';
        const preview = (email.body || '').substring(0, 100) + '...';

        return `
        <div class="sent-item">
            <div class="sent-icon ${iconClass}"><i class="bi bi-${icon}"></i></div>
            <div>
                <div class="sent-subject">${email.subject}</div>
                <div class="sent-meta">To: ${toLabel} · ${sentDate}</div>
                <div class="sent-preview">${preview}</div>
            </div>
        </div>`;
    }).join('');
}

async function sendBulkEmail() {
    const subject = document.getElementById('bulkSubject')?.value.trim();
    const body    = document.getElementById('bulkMessage')?.value.trim();

    if (!subject || !body) { alert('Please fill in the subject and message.'); return; }

    const profile  = window._adviserProfile;
    const profiles = window._allAdviseeProfiles || [];

    const { error } = await supabaseClient
        .from('email_log')
        .insert({
            sender_id       : profile.id,
            recipient_group : 'bulk',
            recipient_count : profiles.length,
            subject,
            body,
            status          : 'sent'
        });

    if (error) { console.error('Send bulk error:', error); alert('Failed to send.'); return; }

    alert(`Announcement sent to ${profiles.length} advisees!`);
    document.getElementById('bulkSubject').value = '';
    document.getElementById('bulkMessage').value = '';
    loadRecentlySent(profile.id);
}

async function sendIndividualEmail() {
    const recipientId = document.getElementById('individualRecipient')?.value;
    const subject     = document.getElementById('individualSubject')?.value.trim();
    const body        = document.getElementById('individualMessage')?.value.trim();

    if (!recipientId) { alert('Please select a recipient.'); return; }
    if (!subject || !body) { alert('Please fill in the subject and message.'); return; }

    const profile       = window._adviserProfile;
    const profiles      = window._allAdviseeProfiles || [];
    const recipient     = profiles.find(p => p.id === recipientId);
    const recipientName = recipient ? `${recipient.first_name} ${recipient.last_name}` : '—';

    const { error } = await supabaseClient
        .from('email_log')
        .insert({
            sender_id       : profile.id,
            recipient_id    : recipientId,
            recipient_group : 'individual',
            recipient_name  : recipientName,
            subject,
            body,
            status          : 'sent'
        });

    if (error) { console.error('Send individual error:', error); alert('Failed to send.'); return; }

    alert(`Email sent to ${recipientName}!`);
    document.getElementById('individualRecipient').value = '';
    document.getElementById('individualSubject').value   = '';
    document.getElementById('individualMessage').value   = '';
    loadRecentlySent(profile.id);
}

function switchMode(mode) {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    event.target.closest('.mode-btn').classList.add('active');
    document.getElementById('mode-' + mode).classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => { loadEmailSystem(); });