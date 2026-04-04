async function loadForms() {
    const profile = await requireAuth(['adviser']);
    if (!profile) return;

    try {
        // Fetch forms without ambiguous FK join to profiles
        const { data: forms, error } = await supabaseClient
            .from('advising_forms')
            .select('*, terms(term_name, academic_year)')
            .eq('adviser_id', profile.id)
            .order('submitted_at', { ascending: false });

        if (error) { console.error('Error fetching forms:', error); return; }

        // Fetch student profiles separately to avoid FK ambiguity
        const studentIds = [...new Set(forms.map(f => f.student_id))];
        let profileMap = {};
        let studentMap = {};
        if (studentIds.length > 0) {
            const [{ data: profileRows }, { data: studentRows }] = await Promise.all([
                supabaseClient
                    .from('profiles')
                    .select('id, first_name, last_name, school_id, program')
                    .in('id', studentIds),
                supabaseClient
                    .from('students')
                    .select('id, year_level, failed_units, is_cleared, program')
                    .in('id', studentIds)
            ]);
            (profileRows || []).forEach(p => { profileMap[p.id] = p; });
            (studentRows || []).forEach(s => { studentMap[s.id] = s; });
        }

        // Attach profiles and student data to forms
        forms.forEach(f => {
            f.profiles = profileMap[f.student_id] || null;
            f.studentData = studentMap[f.student_id] || null;
        });

        const formIds = forms.map(f => f.id);

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
                    // Use RPC (SECURITY DEFINER) to bypass RLS chain issues
                    let planCourses = null;
                    let pcErr = null;

                    const { data: rpcData, error: rpcErr } = await supabaseClient
                        .rpc('get_plan_courses_for_adviser', { p_plan_ids: planIds });

                    if (!rpcErr && rpcData) {
                        // Reshape RPC result to match the expected nested format
                        planCourses = rpcData.map(row => ({
                            id: row.id,
                            plan_id: row.plan_id,
                            course_id: row.course_id,
                            type: row.type,
                            courses: {
                                code: row.course_code,
                                title: row.course_title,
                                units: row.course_units
                            }
                        }));
                    } else {
                        // Fallback: direct query (works if RLS policies are applied)
                        console.warn('RPC get_plan_courses_for_adviser failed, trying direct query:', rpcErr);
                        const { data: directData, error: directErr } = await supabaseClient
                            .from('study_plan_courses')
                            .select('*, courses(code, title, units)')
                            .in('plan_id', planIds);
                        planCourses = directData;
                        pcErr = directErr;
                    }

                    if (pcErr) {
                        console.warn('study_plan_courses query error:', pcErr);
                    } else if (planCourses) {
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

function buildStudyPlanDetail(studyPlan, studentData, form) {
    if (!studyPlan) {
        return `<div class="sp-no-plan">
            <i class="bi bi-exclamation-circle"></i>
            No advising form data linked to this submission yet.
        </div>`;
    }

    const courses = studyPlan.courses || [];

    const failed  = courses.filter(pc => pc.type === 'failed');
    const current = courses.filter(pc => pc.type === 'current');
    const planned = courses.filter(pc => !pc.type || pc.type === 'planned');

    const meetingPref = studyPlan.meeting_preference || studyPlan.preferred_meeting || null;

    const failedUnits  = failed.reduce((s, pc) => s + (pc.courses?.units || 0), 0);
    const currentUnits = current.reduce((s, pc) => s + (pc.courses?.units || 0), 0);
    const plannedUnits = planned.reduce((s, pc) => s + (pc.courses?.units || 0), 0);
    const totalCourses = courses.length;

    // Student academic snapshot
    const sd = studentData || {};
    const yearLevel = form?.year_level || sd.year_level || null;
    const failedUnitsRecord = sd.failed_units || 0;
    const isCleared = sd.is_cleared || false;
    const standing = isCleared ? 'Cleared' : (failedUnitsRecord >= 15 ? 'At Risk' : 'Regular');
    const standingClass = isCleared ? 'cleared' : (failedUnitsRecord >= 15 ? 'at-risk' : 'regular');

    function courseTable(list, emptyMsg) {
        if (!list.length) {
            return `<p class="sp-empty-group">${emptyMsg}</p>`;
        }
        const sectionUnits = list.reduce((s, pc) => s + (pc.courses?.units || 0), 0);
        return `
        <table class="sp-table">
            <thead>
                <tr>
                    <th>Code</th>
                    <th>Course Name</th>
                    <th>Units</th>
                </tr>
            </thead>
            <tbody>
                ${list.map(pc => {
                    const c = pc.courses || {};
                    return `<tr>
                        <td><code>${c.code || '—'}</code></td>
                        <td>${c.title || '—'}</td>
                        <td class="sp-units">${c.units ?? '—'}</td>
                    </tr>`;
                }).join('')}
            </tbody>
            <tfoot>
                <tr class="sp-table-total">
                    <td colspan="2">Total</td>
                    <td class="sp-units">${sectionUnits} units</td>
                </tr>
            </tfoot>
        </table>`;
    }

    // Study plan notes
    const planNotes = studyPlan.notes || '';

    return `
    <div class="sp-detail">

        <!-- Student Academic Snapshot -->
        <div class="sp-snapshot">
            <div class="sp-snapshot-item">
                <i class="bi bi-mortarboard-fill"></i>
                <span class="sp-snapshot-label">Year Level</span>
                <span class="sp-snapshot-value">${yearLevel ? 'Year ' + yearLevel : '—'}</span>
            </div>
            <div class="sp-snapshot-item">
                <i class="bi bi-exclamation-triangle-fill"></i>
                <span class="sp-snapshot-label">Failed Units</span>
                <span class="sp-snapshot-value">${failedUnitsRecord}</span>
            </div>
            <div class="sp-snapshot-item">
                <i class="bi bi-shield-check"></i>
                <span class="sp-snapshot-label">Standing</span>
                <span class="sp-snapshot-value sp-standing sp-standing--${standingClass}">${standing}</span>
            </div>
            <div class="sp-snapshot-item">
                <i class="bi bi-layers-fill"></i>
                <span class="sp-snapshot-label">Total Courses</span>
                <span class="sp-snapshot-value">${totalCourses}</span>
            </div>
            <div class="sp-snapshot-item">
                <i class="bi bi-calculator"></i>
                <span class="sp-snapshot-label">Planned Load</span>
                <span class="sp-snapshot-value ${plannedUnits > 24 ? 'sp-overload' : ''}">${plannedUnits} units${plannedUnits > 24 ? ' <i class="bi bi-exclamation-circle-fill"></i>' : ''}</span>
            </div>
        </div>

        ${planNotes ? `
        <div class="sp-notes">
            <i class="bi bi-chat-left-text-fill"></i>
            <div>
                <span class="sp-notes-label">Student Notes</span>
                <span class="sp-notes-text">${planNotes}</span>
            </div>
        </div>` : ''}

        <div class="sp-sections">

            ${ failed.length ? `
            <div class="sp-section sp-section--failed">
                <div class="sp-section-header">
                    <span class="sp-section-icon"><i class="bi bi-x-circle-fill"></i></span>
                    <span class="sp-section-title">Failed / Incomplete Courses</span>
                    <span class="sp-badge sp-badge--failed">${failed.length} course${failed.length !== 1 ? 's' : ''}</span>
                    <span class="sp-units-total sp-units-total--failed">${failedUnits} units</span>
                </div>
                ${courseTable(failed, 'No failed courses listed.')}
            </div>` : '' }

            ${ current.length ? `
            <div class="sp-section sp-section--current">
                <div class="sp-section-header">
                    <span class="sp-section-icon"><i class="bi bi-journals"></i></span>
                    <span class="sp-section-title">Currently Enrolled Subjects</span>
                    <span class="sp-badge sp-badge--current">${current.length} subject${current.length !== 1 ? 's' : ''}</span>
                    <span class="sp-units-total sp-units-total--current">${currentUnits} units</span>
                </div>
                ${courseTable(current, 'No current subjects listed.')}
            </div>` : '' }

            <div class="sp-section sp-section--planned">
                <div class="sp-section-header">
                    <span class="sp-section-icon"><i class="bi bi-calendar2-check-fill"></i></span>
                    <span class="sp-section-title">Planned Courses for Next Term</span>
                    <span class="sp-badge sp-badge--planned">${planned.length} course${planned.length !== 1 ? 's' : ''}</span>
                    ${plannedUnits ? `<span class="sp-units-total">${plannedUnits} units</span>` : ''}
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
                    <i class="bi bi-clock"></i> ${meetingPref === 'schedule' ? 'In-person / Virtual Meeting' : meetingPref === 'waive' ? 'Waived (No Meeting)' : meetingPref}
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
        const spDetail    = buildStudyPlanDetail(form.studyPlan, form.studentData, form);
        const yearLevel   = form.year_level || form.studentData?.year_level || null;
        const meetPref    = form.meeting_preference || form.studyPlan?.meeting_preference || 'waive';
        const meetBadge   = meetPref === 'schedule'
            ? '<span class="sub-meeting-badge schedule"><i class="bi bi-camera-video-fill"></i> Meeting Requested</span>'
            : '<span class="sub-meeting-badge waive"><i class="bi bi-check-circle-fill"></i> Appointment Waived</span>';

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
                                ${yearLevel ? `<span class="dot">·</span><span class="sub-year">Year ${yearLevel}</span>` : ''}
                                <span class="dot">·</span>
                                <span>${termLabel}</span>
                            </div>
                        </div>
                    </div>
                    <div class="sub-date"><i class="bi bi-clock"></i> ${submittedDate}</div>
                </div>

                <!-- Meeting Preference -->
                <div class="sub-meeting-row">${meetBadge}</div>

                <!-- Student Notes -->
                ${form.notes ? `
                <div class="sub-notes">
                    <i class="bi bi-chat-left-text-fill"></i>
                    <span>${form.notes}</span>
                </div>` : ''}

                <!-- Study Plan Detail (collapsible) -->
                <div class="sp-toggle-bar" onclick="toggleStudyPlan(this)">
                    <span><i class="bi bi-journal-bookmark-fill"></i> View Full Advising Form</span>
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
                                ${yearLevel ? `<span class="dot">·</span><span class="sub-year">Year ${yearLevel}</span>` : ''}
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
                    <span><i class="bi bi-journal-bookmark-fill"></i> View Advising Form</span>
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
                                ${yearLevel ? `<span class="dot">·</span><span class="sub-year">Year ${yearLevel}</span>` : ''}
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
                    <span><i class="bi bi-journal-bookmark-fill"></i> View Advising Form</span>
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
        ? '<i class="bi bi-journal-bookmark-fill"></i> View Full Advising Form'
        : '<i class="bi bi-journal-bookmark-fill"></i> Hide Advising Form';
}

async function updateFormStatus(formId, status, btn) {
    const card = btn.closest('.submission-card');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    try {
        // Get the form details first
        const { data: form } = await supabaseClient
            .from('advising_forms')
            .select('student_id, term_id, meeting_preference')
            .eq('id', formId)
            .single();

        const { error } = await supabaseClient
            .from('advising_forms')
            .update({ status, reviewed_at: new Date().toISOString() })
            .eq('id', formId);

        if (error) { console.error('Update error:', error); btn.disabled = false; return; }

        // If approved, also update study_plan status and mark student as cleared
        if (status === 'approved' && form) {
            // Update study plan status
            await supabaseClient
                .from('study_plans')
                .update({ status: 'approved' })
                .eq('student_id', form.student_id)
                .eq('term_id', form.term_id);

            // Mark student as cleared for advising
            await supabaseClient
                .from('students')
                .update({
                    is_cleared: true,
                    cleared_at: new Date().toISOString()
                })
                .eq('id', form.student_id);

            // Send notification to student
            await supabaseClient
                .from('notifications')
                .insert({
                    user_id: form.student_id,
                    title: 'Advising Form Approved',
                    message: 'Your academic advising form has been approved by your adviser.',
                    type: 'success',
                    link: 'student-academic-booklet.html'
                });
        }

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
        // Get form details for notification
        const { data: form } = await supabaseClient
            .from('advising_forms')
            .select('student_id')
            .eq('id', formId)
            .single();

        const { error } = await supabaseClient
            .from('advising_forms')
            .update({
                status: pendingStatus,
                adviser_remarks: remarks,
                reviewed_at: new Date().toISOString()
            })
            .eq('id', formId);

        if (error) { console.error('Feedback error:', error); btn.disabled = false; return; }

        // Send notification to student
        if (form) {
            const notifTitle = pendingStatus === 'rejected' ? 'Advising Form Rejected' : 'Revision Requested';
            const notifMsg = pendingStatus === 'rejected'
                ? `Your academic advising form was rejected. Reason: ${remarks}`
                : `Your adviser requested revisions on your academic advising form: ${remarks}`;
            await supabaseClient
                .from('notifications')
                .insert({
                    user_id: form.student_id,
                    title: notifTitle,
                    message: notifMsg,
                    type: pendingStatus === 'rejected' ? 'error' : 'warning',
                    link: 'student-academic-booklet.html'
                });
        }

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