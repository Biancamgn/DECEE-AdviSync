async function loadForms() {
    const profile = await requireAuth(['adviser']);
    if (!profile) return;

    try {
        const { data, error } = await supabaseClient
            .from('advising_forms')
            .select(`
                *,
                profiles!advising_forms_student_id_fkey (
                    first_name, last_name, school_id
                ),
                terms (
                    term_name, academic_year
                )
            `)
            .eq('adviser_id', profile.id)
            .order('submitted_at', { ascending: false });

        if (error) { console.error('Error fetching forms:', error); return; }

        const pending  = data.filter(f => f.status === 'pending');
        const approved = data.filter(f => f.status === 'approved');
        const rejected = data.filter(f => f.status === 'rejected' || f.status === 'for_revision');

        document.querySelector('.tab-item:nth-child(1) .tab-count').textContent = pending.length;
        document.querySelector('.tab-item:nth-child(2) .tab-count').textContent = approved.length;
        document.querySelector('.tab-item:nth-child(3) .tab-count').textContent = rejected.length;

        renderForms('tab-pending',  pending,  'pending');
        renderForms('tab-approved', approved, 'approved');
        renderForms('tab-rejected', rejected, 'rejected');

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

function renderForms(containerId, forms, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!forms || forms.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-file-earmark-x"></i>
                No ${type} forms found.
            </div>`;
        return;
    }

    container.innerHTML = forms.map(form => {
        const p = form.profiles;
        if (!p) return ''; // skip rows where profile join returned null

        const t          = form.terms;
        const fullName   = `${p.first_name} ${p.last_name}`;
        const initials   = (p.first_name?.[0] || '') + (p.last_name?.[0] || '');
        const termLabel  = t ? `${t.term_name} · ${t.academic_year}` : '—';
        const submittedDate = form.submitted_at
            ? new Date(form.submitted_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
              })
            : '—';

        if (type === 'pending') {
            return `
            <div class="submission-card" data-id="${form.id}">
                <div class="sub-top">
                    <div class="sub-student">
                        <div class="sub-avatar">${initials}</div>
                        <div>
                            <div class="sub-name">${fullName}</div>
                            <div class="sub-meta">
                                <span>${p.school_id}</span>
                                <span>·</span>
                                <span>${form.program || '—'} · ${termLabel}</span>
                            </div>
                        </div>
                    </div>
                    <div class="sub-date"><i class="bi bi-clock"></i> Submitted ${submittedDate}</div>
                </div>
                ${form.notes ? `<div class="sub-notes"><i class="bi bi-chat-left-text"></i> ${form.notes}</div>` : ''}
                <div class="sub-actions">
                    <button class="btn-approve" onclick="updateFormStatus('${form.id}', 'approved', this)">
                        <i class="bi bi-check-lg"></i> Approve
                    </button>
                    <button class="btn-revision" onclick="toggleFeedback(this)">
                        <i class="bi bi-pencil"></i> Request Revision
                    </button>
                    <button class="btn-reject" onclick="toggleFeedback(this)">
                        <i class="bi bi-x-lg"></i> Reject
                    </button>
                </div>
                <div class="feedback-area">
                    <textarea placeholder="Write feedback or reason for revision/rejection..."></textarea>
                    <button class="btn-approve" style="margin-top:0.5rem;font-size:0.75rem;"
                        onclick="submitFeedback('${form.id}', this)">
                        <i class="bi bi-send"></i> Send Feedback
                    </button>
                </div>
            </div>`;
        }

        if (type === 'approved') {
            return `
            <div class="submission-card" data-id="${form.id}">
                <div class="sub-top">
                    <div class="sub-student">
                        <div class="sub-avatar">${initials}</div>
                        <div>
                            <div class="sub-name">${fullName}</div>
                            <div class="sub-meta">
                                <span>${p.school_id}</span>
                                <span>·</span>
                                <span>${form.program || '—'} · ${termLabel}</span>
                            </div>
                        </div>
                    </div>
                    <span class="sub-status approved"><i class="bi bi-check-circle"></i> Approved</span>
                </div>
                <div style="font-size:0.78rem;color:var(--dlsu-gray-400);">
                    Submitted ${submittedDate}
                    ${form.adviser_remarks ? `· <em>${form.adviser_remarks}</em>` : ''}
                </div>
            </div>`;
        }

        if (type === 'rejected') {
            return `
            <div class="submission-card" data-id="${form.id}">
                <div class="sub-top">
                    <div class="sub-student">
                        <div class="sub-avatar">${initials}</div>
                        <div>
                            <div class="sub-name">${fullName}</div>
                            <div class="sub-meta">
                                <span>${p.school_id}</span>
                                <span>·</span>
                                <span>${form.program || '—'} · ${termLabel}</span>
                            </div>
                        </div>
                    </div>
                    <span class="sub-status rejected"><i class="bi bi-x-circle"></i> 
                        ${form.status === 'for_revision' ? 'Revision Requested' : 'Rejected'}
                    </span>
                </div>
                <div style="font-size:0.78rem;color:var(--dlsu-gray-400);">
                    Submitted ${submittedDate}
                    ${form.adviser_remarks ? `· Reason: ${form.adviser_remarks}` : ''}
                </div>
            </div>`;
        }
    }).join('');
}

async function updateFormStatus(formId, status, btn) {
    const card = btn.closest('.submission-card');
    try {
        const { error } = await supabaseClient
            .from('advising_forms')
            .update({ status, reviewed_at: new Date().toISOString() })
            .eq('id', formId);

        if (error) { console.error('Update error:', error); return; }

        card.style.opacity = '0.5';
        card.innerHTML = `<div style="padding:1rem;text-align:center;color:var(--dlsu-green);font-weight:600;">
            <i class="bi bi-check-circle-fill"></i> Form ${status} successfully.
        </div>`;
        setTimeout(() => loadForms(), 1000);

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

async function submitFeedback(formId, btn) {
    const card     = btn.closest('.submission-card');
    const textarea = card.querySelector('.feedback-area textarea');
    const remarks  = textarea.value.trim();
    if (!remarks) { alert('Please write feedback before sending.'); return; }

    const status = 'for_revision';

    try {
        const { error } = await supabaseClient
            .from('advising_forms')
            .update({ status, adviser_remarks: remarks, reviewed_at: new Date().toISOString() })
            .eq('id', formId);

        if (error) { console.error('Feedback error:', error); return; }

        card.style.opacity = '0.5';
        card.innerHTML = `<div style="padding:1rem;text-align:center;color:var(--dlsu-green);font-weight:600;">
            <i class="bi bi-send-check-fill"></i> Feedback sent successfully.
        </div>`;
        setTimeout(() => loadForms(), 1000);

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

function toggleFeedback(btn) {
    const area = btn.closest('.submission-card').querySelector('.feedback-area');
    area.classList.toggle('open');
    if (area.classList.contains('open')) area.querySelector('textarea').focus();
}

function switchTab(tab) {
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    event.target.closest('.tab-item').classList.add('active');
    document.getElementById('tab-' + tab).style.display = '';
}

document.addEventListener('DOMContentLoaded', () => { loadForms(); });