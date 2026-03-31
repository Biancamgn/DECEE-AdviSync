// ══════════════════════════════════════════════
// AdviSync – Program Checklist Page JavaScript
// ══════════════════════════════════════════════

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
    const fields = cols.split(' ').length;
    if (fields === 4) {
        row.innerHTML = '<div><input type="text" class="form-control-custom" placeholder="Course code"></div><div><input type="text" class="form-control-custom" placeholder="Course name"></div><div><input type="number" class="form-control-custom" placeholder="3"></div><div><button class="remove-row" onclick="this.closest(\'.course-row\').remove()"><i class="bi bi-x-lg"></i></button></div>';
    } else {
        row.innerHTML = '<div><input type="text" class="form-control-custom" placeholder="Course code"></div><div><input type="text" class="form-control-custom" placeholder="Course name"></div><div><input type="number" class="form-control-custom" placeholder="3"></div><div><input type="text" class="form-control-custom" placeholder="Prerequisite"></div><div><button class="remove-row" onclick="this.closest(\'.course-row\').remove()"><i class="bi bi-x-lg"></i></button></div>';
    }
    container.appendChild(row);
}

function selectRadio(el, value) {
    el.closest('.radio-card-group').querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('addFailedRow').addEventListener('click', () => addRow('failedCoursesContainer', '1fr 2fr 80px 40px'));
    document.getElementById('addCurrentRow').addEventListener('click', () => addRow('currentSubjectsContainer', '1fr 2fr 80px 1fr 40px'));
    document.getElementById('addPlannedRow').addEventListener('click', () => addRow('plannedCoursesContainer', '1fr 2fr 80px 1fr 40px'));

    document.addEventListener('click', e => { if (e.target.closest('.remove-row')) e.target.closest('.course-row').remove(); });
});
