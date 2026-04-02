async function loadForms() {
    const profile = await requireAuth(['adviser']);
    if (!profile) return;

    try {
        const { data: forms, error } = await supabaseClient
            .from('advising_forms')
            .select(`
                *,
                profiles!advising_forms_student_id_fkey (
                    first_name, last_name, school_id, program
                ),
                terms (
                    term_name, academic_year
                )
            `)
            .eq('adviser_id', profile.id)
            .order('submitted_at', { ascending: false });

        if (error) { console.error('Error fetching forms:', error); return; }

        const formIds = forms.map(f => f.id);

        const studentIds = [...new Set(forms.map(f => f.student_id))];
        const termIds    = [...new Set(forms.map(f => f.term_id).filter(Boolean))];

        let studyPlansMap = {}; 

        if (studentIds.length > 0) {
            const { data: plans, error: planErr } = await supabaseClient
                .from('study_plans')
                .select('*')
                .in('student_id', studentIds);

            if (!planErr && plans) {
                plans.forEach(plan => {
                    const key = `${plan.student_id}::${plan.term_id}`;
                    studyPlansMap[key] = plan;
                });

                const planIds = plans.map(p => p.id);
                if (planIds.length > 0) {
                    const { data: planCourses, error: pcErr } = await supabaseClient
                        .from('study_plan_courses')
                        .select(`
                            *,
                            courses (
                                code, name, units, type
                            )
                        `)
                        .in('plan_id', planIds);

                    if (!pcErr && planCourses) {
                        plans.forEach(plan => {
                            const key = `${plan.student_id}::${plan.term_id}`;
                            const matched = planCourses.filter(pc => pc.plan_id === plan.id);
                            studyPlansMap[key].courses = matched;
                        });
                    }
                }
            }
        }

        const enrichedForms = forms.map(form => {
            const key = `${form.student_id}::${form.term_id}`;
            return { ...form, studyPlan: studyPlansMap[key] || null };
        });

        const pending  = enrichedForms.filter(f => f.status === 'pending');
        const approved = enrichedForms.filter(f => f.status === 'approved');
        const rejected = enrichedForms.filter(f => f.status === 'rejected' || f.status === 'for_revision');

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

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });
}

function buildStudyPlanDetail(studyPlan) {
    if (!studyPlan) {
        return `<div class="sp-no-plan">
            <i class="bi bi-exclamation-circle"></i>
            No study plan data linked to this submission yet.
        </div>`;
    }

    const courses = studyPlan.courses || [];

    const failed  = courses.filter(pc => pc.courses?.type === 'failed'  || pc.type === 'failed');
    const current = courses.filter(pc => pc.courses?.type === 'current' || pc.type === 'current');
    const planned = courses.filter(pc => {
        const t = pc.courses?.type || pc.type;
        return !t || t === 'planned';
    });

    const meetingPref = studyPlan.meeting_preference || studyPlan.preferred_meeting || null;

    function courseTable(list, emptyMsg) {
        if (!list.length) {
            return `<p class="sp-empty-group">${emptyMsg}</p>`;
        }
        return `
        <table class="sp-table">
            <thead>
                <tr>
                    <th>Code</th>
                    <th>Course Name</th>
                    <th>Units</th>
                    ${list[0].courses?.prerequisite !== undefined ? '<th>Prerequisite</th>' : ''}
                </tr>
            </thead>
            <tbody>
                ${list.map(pc => {
                    const c = pc.courses || {};
                    return `<tr>
                        <td><code>${c.code || '—'}</code></td>
                        <td>${c.name || '—'}</td>
                        <td class="sp-units">${c.units ?? '—'}</td>
                        ${c.prerequisite !== undefined ? `<td>${c.prerequisite || 'None'}</td>` : ''}
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
    }

    const totalUnits = planned.reduce((sum, pc) => sum + (pc.courses?.units || 0), 0);

    return `
    <div class="sp-detail">
        <div class="sp-sections">

            ${ failed.length ? `
            <div class="sp-section sp-section--failed">
                <div class="sp-section-header">
                    <span class="sp-section-icon"><i class="bi bi-x-circle-fill"></i></span>
                    <span class="sp-section-title">Failed / Incomplete Courses</span>
                    <span class="sp-badge sp-badge--failed">${failed.length} course${failed.length !== 1 ? 's' : ''}</span>
                </div>
                ${courseTable(failed, 'No failed courses listed.')}
            </div>` : '' }

            ${ current.length ? `
            <div class="sp-section sp-section--current">
                <div class="sp-section-header">
                    <span class="sp-section-icon"><i class="bi bi-journals"></i></span>
                    <span class="sp-section-title">Currently Enrolled Subjects</span>
                    <span class="sp-badge sp-badge--current">${current.length} subject${current.length !== 1 ? 's' : ''}</span>
                </div>
                ${courseTable(current, 'No current subjects listed.')}
            </div>` : '' }

            <div class="sp-section sp-section--planned">
                <div class="sp-section-header">
                    <span class="sp-section-icon"><i class="bi bi-calendar2-check-fill"></i></span>
                    <span class="sp-section-title">Planned Courses for Next Term</span>
                    <span class="sp-badge sp-badge--planned">${planned.length} course${planned.length !== 1 ? 's' : ''}</span>
                    ${totalUnits ? `<span class="sp-units-total">${totalUnits} units total</span>` : ''}
                </div>
                ${courseTable(planned, 'No planned courses listed.')}
            </div>

            ${ meetingPref ? `
            <div class="sp-section sp-section--meeting">
                <div class="sp-section-header">
                    <span class="sp-section-icon"><i class="bi bi-calendar-event-fill"></i></span>
                    <span class="sp-section-title">Preferred Meeting</span>
                </div>
                <div class="sp-meeting-pref">
                    <i class="bi bi-clock"></i> ${meetingPref}
                </div>
            </div>` : '' }

        </div>
    </div>`;
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
        if (!p) return '';

        const t           = form.terms;
        const fullName    = `${p.first_name} ${p.last_name}`;
        const initials    = (p.first_name?.[0] || '') + (p.last_name?.[0] || '');
        const termLabel   = t ? `${t.term_name} · ${t.academic_year}` : '—';
        const submittedDate = formatDate(form.submitted_at);
        const spDetail    = buildStudyPlanDetail(form.studyPlan);

        if (type === 'pending') {
            return `
            <div class="submission-card" data-id="${form.id}">
                <!-- Card Header -->
                <div class="sub-top">
                    <div class="sub-student">
                        <div class="sub-avatar">${initials}</div>
                        <div>
                            <div class="sub-name">${fullName}</div>
                            <div class="sub-meta">
                                <span>${p.school_id}</span>
                                <span class="dot">·</span>
                                <span>${form.program || p.program || '—'}</span>
                                <span class="dot">·</span>
                                <span>${termLabel}</span>
                            </div>
                        </div>
                    </div>
                    <div class="sub-date"><i class="bi bi-clock"></i> ${submittedDate}</div>
                </div>

                <!-- Student Notes -->
                ${form.notes ? `
                <div class="sub-notes">
                    <i class="bi bi-chat-left-text-fill"></i>
                    <span>${form.notes}</span>
                </div>` : ''}

                <!-- Study Plan Detail (collapsible) -->
                <div class="sp-toggle-bar" onclick="toggleStudyPlan(this)">
                    <span><i class="bi bi-journal-bookmark-fill"></i> View Full Study Plan</span>
                    <i class="bi bi-chevron-down sp-chevron"></i>
                </div>
                <div class="sp-collapsible">
                    ${spDetail}
                </div>

                <!-- Action Buttons -->
                <div class="sub-actions">
                    <button class="btn-approve" onclick="updateFormStatus('${form.id}', 'approved', this)">
                        <i class="bi bi-check-lg"></i> Approve
                    </button>
                    <button class="btn-revision" onclick="openFeedback(this, 'revision')">
                        <i class="bi bi-pencil"></i> Request Revision
                    </button>
                    <button class="btn-reject" onclick="openFeedback(this, 'reject')">
                        <i class="bi bi-x-lg"></i> Reject
                    </button>
                </div>

                <!-- Feedback Area -->
                <div class="feedback-area">
                    <div class="feedback-label">
                        <i class="bi bi-chat-square-text"></i>
                        <span class="feedback-type-label">Feedback</span>
                    </div>
                    <textarea placeholder="Write your feedback or reason..."></textarea>
                    <div class="feedback-btns">
                        <button class="btn-send-feedback"
                            onclick="submitFeedback('${form.id}', this)">
                            <i class="bi bi-send"></i> Send Feedback
                        </button>
                        <button class="btn-cancel-feedback" onclick="closeFeedback(this)">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>`;
        }

        if (type === 'approved') {
            return `
            <div class="submission-card submission-card--approved" data-id="${form.id}">
                <div class="sub-top">
                    <div class="sub-student">
                        <div class="sub-avatar">${initials}</div>
                        <div>
                            <div class="sub-name">${fullName}</div>
                            <div class="sub-meta">
                                <span>${p.school_id}</span>
                                <span class="dot">·</span>
                                <span>${form.program || p.program || '—'}</span>
                                <span class="dot">·</span>
                                <span>${termLabel}</span>
                            </div>
                        </div>
                    </div>
                    <span class="sub-status approved"><i class="bi bi-check-circle-fill"></i> Approved</span>
                </div>
                <div class="sub-footer-meta">
                    <span><i class="bi bi-calendar3"></i> Submitted ${submittedDate}</span>
                    ${form.reviewed_at ? `<span><i class="bi bi-check2-all"></i> Reviewed ${formatDate(form.reviewed_at)}</span>` : ''}
                    ${form.adviser_remarks ? `<span class="sub-remarks"><i class="bi bi-chat-left"></i> ${form.adviser_remarks}</span>` : ''}
                </div>

                <div class="sp-toggle-bar" onclick="toggleStudyPlan(this)">
                    <span><i class="bi bi-journal-bookmark-fill"></i> View Study Plan</span>
                    <i class="bi bi-chevron-down sp-chevron"></i>
                </div>
                <div class="sp-collapsible">
                    ${spDetail}
                </div>
            </div>`;
        }

        if (type === 'rejected') {
            const isRevision = form.status === 'for_revision';
            return `
            <div class="submission-card submission-card--rejected" data-id="${form.id}">
                <div class="sub-top">
                    <div class="sub-student">
                        <div class="sub-avatar">${initials}</div>
                        <div>
                            <div class="sub-name">${fullName}</div>
                            <div class="sub-meta">
                                <span>${p.school_id}</span>
                                <span class="dot">·</span>
                                <span>${form.program || p.program || '—'}</span>
                                <span class="dot">·</span>
                                <span>${termLabel}</span>
                            </div>
                        </div>
                    </div>
                    <span class="sub-status ${isRevision ? 'revision' : 'rejected'}">
                        <i class="bi bi-${isRevision ? 'arrow-counterclockwise' : 'x-circle-fill'}"></i>
                        ${isRevision ? 'Revision Requested' : 'Rejected'}
                    </span>
                </div>
                <div class="sub-footer-meta">
                    <span><i class="bi bi-calendar3"></i> Submitted ${submittedDate}</span>
                    ${form.adviser_remarks ? `<span class="sub-remarks"><i class="bi bi-chat-left"></i> ${form.adviser_remarks}</span>` : ''}
                </div>

                <div class="sp-toggle-bar" onclick="toggleStudyPlan(this)">
                    <span><i class="bi bi-journal-bookmark-fill"></i> View Study Plan</span>
                    <i class="bi bi-chevron-down sp-chevron"></i>
                </div>
                <div class="sp-collapsible">
                    ${spDetail}
                </div>
            </div>`;
        }
    }).join('');
}

function toggleStudyPlan(toggleBar) {
    const collapsible = toggleBar.nextElementSibling;
    const chevron     = toggleBar.querySelector('.sp-chevron');
    const isOpen      = collapsible.classList.contains('open');

    collapsible.classList.toggle('open', !isOpen);
    chevron.classList.toggle('rotated', !isOpen);
    toggleBar.querySelector('span').innerHTML = isOpen
        ? '<i class="bi bi-journal-bookmark-fill"></i> View Full Study Plan'
        : '<i class="bi bi-journal-bookmark-fill"></i> Hide Study Plan';
}

async function updateFormStatus(formId, status, btn) {
    const card = btn.closest('.submission-card');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    try {
        const { error } = await supabaseClient
            .from('advising_forms')
            .update({ status, reviewed_at: new Date().toISOString() })
            .eq('id', formId);

        if (error) { console.error('Update error:', error); btn.disabled = false; return; }

        showCardSuccess(card, `Form ${status} successfully.`);
        setTimeout(() => loadForms(), 1200);

    } catch (err) {
        console.error('Unexpected error:', err);
        btn.disabled = false;
    }
}

async function submitFeedback(formId, btn) {
    const card     = btn.closest('.submission-card');
    const textarea = card.querySelector('.feedback-area textarea');
    const remarks  = textarea.value.trim();
    if (!remarks) {
        textarea.classList.add('input-error');
        textarea.placeholder = 'Please write feedback before sending.';
        textarea.focus();
        setTimeout(() => textarea.classList.remove('input-error'), 2000);
        return;
    }

    const pendingStatus = card.querySelector('.feedback-area').dataset.intent === 'reject'
        ? 'rejected'
        : 'for_revision';

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Sending...';

    try {
        const { error } = await supabaseClient
            .from('advising_forms')
            .update({
                status: pendingStatus,
                adviser_remarks: remarks,
                reviewed_at: new Date().toISOString()
            })
            .eq('id', formId);

        if (error) { console.error('Feedback error:', error); btn.disabled = false; return; }

        showCardSuccess(card, 'Feedback sent successfully.');
        setTimeout(() => loadForms(), 1200);

    } catch (err) {
        console.error('Unexpected error:', err);
        btn.disabled = false;
    }
}

function openFeedback(btn, intent) {
    const card     = btn.closest('.submission-card');
    const area     = card.querySelector('.feedback-area');
    const label    = area.querySelector('.feedback-type-label');

    area.dataset.intent = intent;
    label.textContent   = intent === 'reject' ? 'Reason for Rejection' : 'Revision Request';

    document.querySelectorAll('.feedback-area.open').forEach(a => {
        if (a !== area) a.classList.remove('open');
    });

    area.classList.toggle('open');
    if (area.classList.contains('open')) {
        area.querySelector('textarea').focus();
    }
}

function closeFeedback(btn) {
    btn.closest('.feedback-area').classList.remove('open');
}

function toggleFeedback(btn) { openFeedback(btn, 'revision'); }

function showCardSuccess(card, message) {
    card.style.transition = 'opacity 0.3s';
    card.style.opacity    = '0.5';
    setTimeout(() => {
        card.innerHTML = `
        <div class="card-success-msg">
            <i class="bi bi-check-circle-fill"></i> ${message}
        </div>`;
        card.style.opacity = '1';
    }, 300);
}

function switchTab(tab) {
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    event.target.closest('.tab-item').classList.add('active');
    document.getElementById('tab-' + tab).style.display = '';
}

document.addEventListener('DOMContentLoaded', () => { loadForms(); });