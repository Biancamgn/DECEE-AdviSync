initShared();

let _currentProfile = null;
let _studentData = null;
let _activeTerm = null;
let _existingForm = null;
let _meetingPreference = 'waive';

(async function () {
    const profile = await requireAuth(['student']);
    if (!profile) return;
    _currentProfile = profile;
    await loadUserProfile();

    const { data: student } = await supabaseClient
        .from('students')
        .select('*')
        .eq('id', profile.id)
        .single();
    _studentData = student;

    // Load active term
    const { data: activeTerm } = await supabaseClient
        .from('terms')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();
    _activeTerm = activeTerm;

    // Show deadline info if available
    if (activeTerm && activeTerm.deadline_date) {
        const deadlineEl = document.getElementById('deadlineInfo');
        if (deadlineEl) {
            const dl = new Date(activeTerm.deadline_date);
            const now = new Date();
            const daysLeft = Math.ceil((dl - now) / (1000 * 60 * 60 * 24));
            const dlStr = dl.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            deadlineEl.innerHTML = `<i class="bi bi-alarm"></i> Deadline: <strong>${dlStr}</strong> (${activeTerm.term_name}, AY ${activeTerm.academic_year})${daysLeft > 0 ? ` — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left` : daysLeft === 0 ? ' — <span style="color:var(--dlsu-warning)">Due today!</span>' : ' — <span style="color:var(--dlsu-danger)">Past deadline</span>'}`;
            deadlineEl.style.display = '';
        }
    }

    // Check if there's an existing form for this term
    if (activeTerm) {
        const { data: existingForm } = await supabaseClient
            .from('advising_forms')
            .select('*')
            .eq('student_id', profile.id)
            .eq('term_id', activeTerm.id)
            .order('submitted_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existingForm) {
            _existingForm = existingForm;
            showExistingFormStatus(existingForm);
        }
    }

    // Auto-populate failed courses from academic records
    const { data: failedRecords } = await supabaseClient
        .from('academic_records')
        .select('*, courses(*)')
        .eq('student_id', profile.id)
        .eq('status', 'failed');

    const container = document.getElementById('failedCoursesContainer');
    if (container && failedRecords && failedRecords.length > 0) {
        container.innerHTML = '';
        failedRecords.forEach(r => {
            const row = document.createElement('div');
            row.className = 'course-row';
            row.style.gridTemplateColumns = '1fr 2fr 80px 40px';
            row.innerHTML = `
                <div><input type="text" class="form-control-custom" value="${r.courses?.code || ''}" readonly></div>
                <div><input type="text" class="form-control-custom" value="${r.courses?.title || ''}" readonly></div>
                <div><input type="number" class="form-control-custom" value="${r.courses?.units || ''}" readonly></div>
                <div><button class="remove-row" onclick="this.closest('.course-row').remove()"><i class="bi bi-x-lg"></i></button></div>
            `;
            container.appendChild(row);
        });
    }

    // Auto-populate current enrolled subjects
    if (activeTerm) {
        const { data: currentRecords } = await supabaseClient
            .from('academic_records')
            .select('*, courses(*)')
            .eq('student_id', profile.id)
            .eq('term_id', activeTerm.id)
            .eq('status', 'in_progress');

        const currentContainer = document.getElementById('currentSubjectsContainer');
        if (currentContainer && currentRecords && currentRecords.length > 0) {
            currentContainer.innerHTML = '';
            currentRecords.forEach(r => {
                const row = document.createElement('div');
                row.className = 'course-row';
                row.style.gridTemplateColumns = '1fr 2fr 80px 1fr 40px';
                row.innerHTML = `
                    <div><input type="text" class="form-control-custom" value="${r.courses?.code || ''}" readonly></div>
                    <div><input type="text" class="form-control-custom" value="${r.courses?.name || r.courses?.title || ''}" readonly></div>
                    <div><input type="number" class="form-control-custom" value="${r.courses?.units || ''}" readonly></div>
                    <div><input type="text" class="form-control-custom" value="${r.courses?.prerequisite || ''}" readonly></div>
                    <div><button class="remove-row" onclick="this.closest('.course-row').remove()"><i class="bi bi-x-lg"></i></button></div>
                `;
                currentContainer.appendChild(row);
            });
        }
    }
})();

function showExistingFormStatus(form) {
    const statusBanner = document.getElementById('formStatusBanner');
    if (!statusBanner) return;

    const statusMap = {
        pending: { label: 'Pending Review', cls: 'warning', icon: 'bi-hourglass-split', msg: 'Your academic advising form has been submitted and is awaiting your adviser\'s review.' },
        approved: { label: 'Approved', cls: 'success', icon: 'bi-check-circle-fill', msg: 'Your academic advising form has been approved by your adviser.' },
        rejected: { label: 'Rejected', cls: 'danger', icon: 'bi-x-circle-fill', msg: form.adviser_remarks ? `Your form was rejected. Reason: ${form.adviser_remarks}` : 'Your form was rejected. Please revise and resubmit.' },
        for_revision: { label: 'Revision Requested', cls: 'warning', icon: 'bi-arrow-counterclockwise', msg: form.adviser_remarks ? `Revision requested: ${form.adviser_remarks}` : 'Your adviser requested revisions. Please update and resubmit.' }
    };

    const s = statusMap[form.status] || statusMap.pending;
    statusBanner.innerHTML = `
        <div class="form-status-alert ${s.cls}">
            <div class="fsa-icon"><i class="bi ${s.icon}"></i></div>
            <div class="fsa-content">
                <div class="fsa-label">${s.label}</div>
                <div class="fsa-msg">${s.msg}</div>
            </div>
        </div>
    `;
    statusBanner.style.display = '';

    // If approved or pending (not revision/rejected), lock entire form
    if (form.status === 'approved' || form.status === 'pending') {
        lockForm(form.status);
    }
}

function lockForm(status) {
    // Disable all inputs, textareas, selects, file inputs
    document.querySelectorAll('.form-section input, .form-section textarea, .form-section select').forEach(el => {
        el.disabled = true;
        el.style.opacity = '0.6';
        el.style.pointerEvents = 'none';
    });

    // Disable all add-row and remove-row buttons
    document.querySelectorAll('.add-row-btn, .remove-row, .upload-area').forEach(el => {
        el.style.pointerEvents = 'none';
        el.style.opacity = '0.4';
    });

    // Disable radio cards
    document.querySelectorAll('.radio-card').forEach(el => {
        el.style.pointerEvents = 'none';
        el.style.opacity = '0.6';
    });

    // Disable all navigation buttons
    document.querySelectorAll('.btn-nav.next, .btn-nav.prev').forEach(el => {
        el.disabled = true;
        el.style.opacity = '0.5';
        el.style.pointerEvents = 'none';
    });

    // Disable the submit button with appropriate label
    const submitBtn = document.querySelector('.btn-nav.submit');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = status === 'approved'
            ? '<i class="bi bi-check-circle-fill"></i> Already Approved'
            : '<i class="bi bi-hourglass-split"></i> Awaiting Review';
        submitBtn.style.opacity = '0.5';
        submitBtn.style.pointerEvents = 'none';
    }

    // Disable stepper clicks
    document.querySelectorAll('.step').forEach(el => {
        el.style.pointerEvents = 'none';
        el.style.cursor = 'default';
    });
}

let currentStep = 1;
function goStep(n) {
    // If going to review step (5), populate the review
    if (n === 5) populateReview();

    document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
    document.getElementById('step' + n).classList.add('active');
    document.querySelectorAll('.step').forEach(s => {
        const sn = parseInt(s.dataset.step);
        s.classList.remove('active', 'done');
        if (sn === n) s.classList.add('active');
        else if (sn < n) s.classList.add('done');
    });
    document.querySelectorAll('.step-line').forEach((line, i) => {
        line.classList.toggle('done', i < n - 1);
    });
    currentStep = n;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function addRow(containerId, cols) {
    const container = document.getElementById(containerId);
    const row = document.createElement('div');
    row.className = 'course-row';
    row.style.gridTemplateColumns = cols;
    const hasPrereq = cols.includes('1fr 40px') && cols.split(' ').length === 5;
    if (hasPrereq) {
        row.innerHTML = '<div><input type="text" class="form-control-custom" placeholder="Course code"></div><div><input type="text" class="form-control-custom" placeholder="Course name"></div><div><input type="number" class="form-control-custom" placeholder="3"></div><div><input type="text" class="form-control-custom" placeholder="Prerequisite"></div><div><button class="remove-row" onclick="this.closest(\'.course-row\').remove()"><i class="bi bi-x-lg"></i></button></div>';
    } else {
        row.innerHTML = '<div><input type="text" class="form-control-custom" placeholder="Course code"></div><div><input type="text" class="form-control-custom" placeholder="Course name"></div><div><input type="number" class="form-control-custom" placeholder="3"></div><div><button class="remove-row" onclick="this.closest(\'.course-row\').remove()"><i class="bi bi-x-lg"></i></button></div>';
    }
    container.appendChild(row);
}

document.getElementById('addFailedRow').addEventListener('click', () => addRow('failedCoursesContainer', '1fr 2fr 80px 40px'));
document.getElementById('addCurrentRow').addEventListener('click', () => addRow('currentSubjectsContainer', '1fr 2fr 80px 1fr 40px'));
document.getElementById('addPlannedRow').addEventListener('click', () => addRow('plannedCoursesContainer', '1fr 2fr 80px 1fr 40px'));

document.addEventListener('click', e => { if (e.target.closest('.remove-row')) e.target.closest('.course-row').remove(); });

function selectRadio(el, value) {
    el.closest('.radio-card-group').querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    _meetingPreference = value;
}

function getCoursesFromContainer(containerId, hasPrerequsite) {
    const rows = document.querySelectorAll(`#${containerId} .course-row`);
    const courses = [];
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        const code = inputs[0]?.value.trim();
        const name = inputs[1]?.value.trim();
        const units = parseInt(inputs[2]?.value) || 0;
        const prereq = hasPrerequsite ? (inputs[3]?.value.trim() || '') : '';
        if (code) courses.push({ code, name, units, prereq });
    });
    return courses;
}

function populateReview() {
    const plannedCourses = getCoursesFromContainer('plannedCoursesContainer', true);
    const failedCourses = getCoursesFromContainer('failedCoursesContainer', false);
    const currentCourses = getCoursesFromContainer('currentSubjectsContainer', true);
    const notes = document.querySelector('#step3 textarea')?.value.trim() || '';

    const totalPlannedUnits = plannedCourses.reduce((s, c) => s + c.units, 0);
    const totalFailedUnits = failedCourses.reduce((s, c) => s + c.units, 0) + (_studentData?.failed_units || 0);
    const meetingLabel = _meetingPreference === 'schedule' ? 'Meeting Requested' : 'Waived';

    const reviewTbody = document.querySelector('#step5 .review-table tbody');
    if (reviewTbody) {
        if (plannedCourses.length > 0) {
            reviewTbody.innerHTML = plannedCourses.map(c => `
                <tr>
                    <td class="code">${c.code}</td>
                    <td>${c.name}</td>
                    <td>${c.units}</td>
                    <td>${c.prereq || '—'}</td>
                    <td><span class="prereq-badge ok">✓</span></td>
                </tr>
            `).join('');
        } else {
            reviewTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--dlsu-gray-400);padding:1rem;">No planned courses added</td></tr>';
        }
    }

    // Update summary values
    const summaryGrid = document.querySelector('#step5 [style*="grid-template-columns: 1fr 1fr"]');
    if (summaryGrid) {
        const summaryDivs = summaryGrid.querySelectorAll(':scope > div');
        if (summaryDivs[0]) summaryDivs[0].querySelector('div:last-child').textContent = totalPlannedUnits;
        if (summaryDivs[1]) summaryDivs[1].querySelector('div:last-child').textContent = '0';
        if (summaryDivs[2]) summaryDivs[2].querySelector('div:last-child').textContent = totalFailedUnits;
        if (summaryDivs[3]) summaryDivs[3].querySelector('div:last-child').textContent = meetingLabel;
    }
}

async function submitStudyPlan() {
    if (!_currentProfile || !_studentData) { alert('Profile not loaded. Please refresh.'); return; }
    if (!_activeTerm) { alert('No active term found. Please contact admin.'); return; }

    const submitBtn = document.querySelector('.btn-nav.submit');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Submitting...'; }

    try {
        const plannedCourses = getCoursesFromContainer('plannedCoursesContainer', true);
        const failedCourses = getCoursesFromContainer('failedCoursesContainer', false);
        const currentCourses = getCoursesFromContainer('currentSubjectsContainer', true);
        const notes = document.querySelector('#step3 textarea')?.value.trim() || '';

        if (plannedCourses.length === 0) {
            alert('Please add at least one planned course for next term.');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="bi bi-send-fill"></i> Submit Advising Form'; }
            return;
        }

        // Create or update study plan
        let planId;
        if (_existingForm && (_existingForm.status === 'for_revision' || _existingForm.status === 'rejected')) {
            // Resubmission: delete old plan courses, update existing plan
            const { data: existingPlan } = await supabaseClient
                .from('study_plans')
                .select('id')
                .eq('student_id', _currentProfile.id)
                .eq('term_id', _activeTerm.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (existingPlan) {
                await supabaseClient.from('study_plan_courses').delete().eq('plan_id', existingPlan.id);
                await supabaseClient.from('study_plans').update({
                    status: 'pending',
                    meeting_preference: _meetingPreference,
                    notes: notes
                }).eq('id', existingPlan.id);
                planId = existingPlan.id;
            } else {
                const { data: plan, error: planError } = await supabaseClient
                    .from('study_plans')
                    .insert({
                        student_id: _currentProfile.id,
                        term_id: _activeTerm.id,
                        status: 'pending',
                        meeting_preference: _meetingPreference,
                        notes: notes
                    })
                    .select()
                    .single();
                if (planError) throw planError;
                planId = plan.id;
            }
        } else {
            const { data: plan, error: planError } = await supabaseClient
                .from('study_plans')
                .insert({
                    student_id: _currentProfile.id,
                    term_id: _activeTerm.id,
                    status: 'pending',
                    meeting_preference: _meetingPreference,
                    notes: notes
                })
                .select()
                .single();
            if (planError) throw planError;
            planId = plan.id;
        }

        // Insert study plan courses (for all types: failed, current, planned)
        const allCourseInserts = [];

        async function findOrCreateCourse(c) {
            // Try exact match first
            let { data: course } = await supabaseClient
                .from('courses').select('id').eq('code', c.code.toUpperCase().trim()).maybeSingle();
            if (course) return course.id;
            // Try case-insensitive match
            const { data: iCourse } = await supabaseClient
                .from('courses').select('id').ilike('code', c.code.trim()).maybeSingle();
            if (iCourse) return iCourse.id;
            // Not found — create via RPC (SECURITY DEFINER bypasses RLS)
            const { data: newId, error: rpcErr } = await supabaseClient
                .rpc('upsert_course_for_student', {
                    p_code: c.code.toUpperCase().trim(),
                    p_title: c.name || c.code,
                    p_units: c.units || 0
                });
            if (!rpcErr && newId) return newId;
            console.warn('Could not find or create course:', c.code, rpcErr);
            return null;
        }

        for (const c of failedCourses) {
            const courseId = await findOrCreateCourse(c);
            if (courseId) allCourseInserts.push({ plan_id: planId, course_id: courseId, type: 'failed' });
        }
        for (const c of currentCourses) {
            const courseId = await findOrCreateCourse(c);
            if (courseId) allCourseInserts.push({ plan_id: planId, course_id: courseId, type: 'current' });
        }
        for (const c of plannedCourses) {
            const courseId = await findOrCreateCourse(c);
            if (courseId) allCourseInserts.push({ plan_id: planId, course_id: courseId, type: 'planned' });
        }

        if (allCourseInserts.length > 0) {
            await supabaseClient.from('study_plan_courses').insert(allCourseInserts);
        }

        // Insert or update advising form
        if (_existingForm && (_existingForm.status === 'for_revision' || _existingForm.status === 'rejected')) {
            const { error: formError } = await supabaseClient
                .from('advising_forms')
                .update({
                    status: 'pending',
                    submitted_at: new Date().toISOString(),
                    meeting_preference: _meetingPreference,
                    notes: notes,
                    adviser_remarks: null,
                    reviewed_at: null,
                    adviser_id: _studentData.adviser_id
                })
                .eq('id', _existingForm.id);
            if (formError) throw new Error('Advising form update failed: ' + formError.message);
        } else {
            const { error: formError } = await supabaseClient
                .from('advising_forms')
                .insert({
                    student_id: _currentProfile.id,
                    adviser_id: _studentData.adviser_id,
                    term_id: _activeTerm.id,
                    year_level: _studentData.year_level || 1,
                    status: 'pending',
                    submitted_at: new Date().toISOString(),
                    meeting_preference: _meetingPreference,
                    notes: notes,
                    program: _studentData.program || _currentProfile.program || null
                });
            if (formError) throw new Error('Advising form insert failed: ' + formError.message);
        }

        // If schedule meeting was selected, redirect to appointments page
        if (_meetingPreference === 'schedule') {
            alert('Academic advising form submitted successfully! You will now be redirected to book an appointment with your adviser.');
            window.location.href = 'student-appointments.html';
        } else {
            alert('Academic advising form submitted successfully! Your adviser will review it.');
            window.location.href = 'student-dashboard.html';
        }

    } catch (err) {
        console.error('Submit error:', err);
        alert('Failed to submit advising form. Please try again.');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="bi bi-send-fill"></i> Submit Advising Form'; }
    }
}
