initShared();

let _currentProfile = null;
let _studentData = null;

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
})();

let currentStep = 1;
function goStep(n) {
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
}

async function submitStudyPlan() {
    if (!_currentProfile || !_studentData) { alert('Profile not loaded. Please refresh.'); return; }

    const { data: activeTerm } = await supabaseClient
        .from('terms')
        .select('id')
        .eq('is_active', true)
        .single();

    if (!activeTerm) { alert('No active term found. Please contact admin.'); return; }

    const { data: plan, error: planError } = await supabaseClient
        .from('study_plans')
        .insert({
            student_id: _currentProfile.id,
            term_id: activeTerm.id,
            status: 'pending'
        })
        .select()
        .single();

    if (planError) { alert('Failed to submit study plan.'); console.error(planError); return; }

    const plannedRows = document.querySelectorAll('#plannedCoursesContainer .course-row');
    const coursesToInsert = [];
    for (const row of plannedRows) {
        const inputs = row.querySelectorAll('input');
        const code = inputs[0]?.value.trim();
        if (!code) continue;
        const { data: course } = await supabaseClient
            .from('courses')
            .select('id')
            .eq('code', code)
            .single();
        if (course) {
            coursesToInsert.push({ plan_id: plan.id, course_id: course.id });
        }
    }

    if (coursesToInsert.length > 0) {
        await supabaseClient.from('study_plan_courses').insert(coursesToInsert);
    }

    const { error: formError } = await supabaseClient
        .from('advising_forms')
        .insert({
            student_id: _currentProfile.id,
            adviser_id: _studentData.adviser_id,
            term_id: activeTerm.id,
            status: 'pending',
            submitted_at: new Date().toISOString()
        });

    if (formError) console.error('Advising form insert error:', formError);

    alert('Study plan submitted successfully! Your adviser will review it.');
    window.location.href = 'student-dashboard.html';
}
