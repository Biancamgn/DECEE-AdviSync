initShared();

(async function () {
    const profile = await requireAuth(['student']);
    if (!profile) return;
    await loadUserProfile();

    const { data: student } = await supabaseClient
        .from('students')
        .select('*')
        .eq('id', profile.id)
        .single();

    const programCode = student?.program || 'BSCpE';

    const { data: checklist } = await supabaseClient
        .from('program_student_checklists')
        .select('*')
        .eq('program_code', programCode)
        .order('year_level')
        .order('term')
        .order('course_sequence');

    const { data: records } = await supabaseClient
        .from('academic_records')
        .select('*, courses(code)')
        .eq('student_id', profile.id);

    const gradeMap = {};
    (records || []).forEach(r => {
        if (r.courses?.code) gradeMap[r.courses.code] = r;
    });

    const container = document.getElementById('checklistContainer');
    if (!container || !checklist || checklist.length === 0) return;

    const yearGroups = {};
    checklist.forEach(c => {
        const key = c.year_level;
        if (!yearGroups[key]) yearGroups[key] = {};
        const termKey = c.term || '1';
        if (!yearGroups[key][termKey]) yearGroups[key][termKey] = [];
        yearGroups[key][termKey].push(c);
    });

    let totalRequired = 0, completedCount = 0, completedUnits = 0;

    container.innerHTML = '';
    Object.entries(yearGroups).sort((a, b) => a[0] - b[0]).forEach(([yearLevel, terms]) => {
        const isCurrent = parseInt(yearLevel) === (student?.year_level || 1);
        const yearDiv = document.createElement('div');
        yearDiv.className = `year-group${isCurrent ? ' current' : ''}`;

        let yearHtml = `<div class="year-header"><h3>Year ${yearLevel} ${isCurrent ? '<span class="current-badge">Current</span>' : ''}</h3></div>`;

        Object.entries(terms).sort((a, b) => a[0] - b[0]).forEach(([term, courses]) => {
            yearHtml += `<div class="term-group"><h4 class="term-label">Term ${term}</h4><div class="checklist-table">`;
            courses.forEach(c => {
                totalRequired++;
                const record = gradeMap[c.course_code];
                let status = 'not-taken';
                let gradeText = '—';
                let statusIcon = '<i class="bi bi-dash-circle"></i>';

                if (record) {
                    if (record.status === 'passed' || (record.grade && record.grade > 0 && record.grade <= 4.0)) {
                        status = 'completed';
                        gradeText = record.grade?.toFixed(1) || '✓';
                        statusIcon = '<i class="bi bi-check-circle-fill"></i>';
                        completedCount++;
                        completedUnits += c.units || 0;
                    } else if (record.status === 'in_progress') {
                        status = 'in-progress';
                        gradeText = 'In Progress';
                        statusIcon = '<i class="bi bi-arrow-repeat"></i>';
                    } else if (record.status === 'failed') {
                        status = 'not-taken';
                        gradeText = `${record.grade?.toFixed(1) || '0.0'} (F)`;
                        statusIcon = '<i class="bi bi-x-circle"></i>';
                    }
                }

                yearHtml += `<div class="checklist-row" data-status="${status}">
                    <div class="col-status ${status}">${statusIcon}</div>
                    <div class="col-code">${c.course_code || '—'}</div>
                    <div class="col-name">${c.course_title || '—'}</div>
                    <div class="col-units">${c.units || '—'}</div>
                    <div class="col-prereq">${c.prerequisite || '—'}</div>
                    <div class="col-grade">${gradeText}</div>
                </div>`;
            });
            yearHtml += '</div></div>';
        });

        yearDiv.innerHTML = yearHtml;
        container.appendChild(yearDiv);
    });

    const summaryValues = document.querySelectorAll('.summary-value');
    if (summaryValues[0]) summaryValues[0].textContent = totalRequired;
    if (summaryValues[1]) summaryValues[1].textContent = completedCount;
    if (summaryValues[2]) summaryValues[2].textContent = totalRequired - completedCount;
    const pct = totalRequired > 0 ? Math.round((completedCount / totalRequired) * 100) : 0;
    if (summaryValues[3]) summaryValues[3].textContent = `${pct}%`;
    const progressFill = document.querySelector('.progress-bar-fill');
    if (progressFill) progressFill.style.width = `${pct}%`;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            document.querySelectorAll('.checklist-row[data-status]').forEach(row => {
                row.style.display = (filter === 'all' || row.dataset.status === filter) ? '' : 'none';
            });
        });
    });
})();
