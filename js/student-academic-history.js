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

    const { data: records } = await supabaseClient
        .from('academic_records')
        .select('*, courses(*), terms(*)')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: true });

    if (!records || records.length === 0) return;

    const allRecords = records || [];
    const completedRecords = allRecords.filter(r => r.status === 'passed' || (r.grade && r.grade > 0 && r.grade <= 4.0));
    const completedUnits = completedRecords.reduce((sum, r) => sum + (r.courses?.units || 0), 0);
    const failedUnits = student?.failed_units || 0;
    let cumulativeGpa = 0;
    if (completedRecords.length > 0) {
        const totalWeighted = completedRecords.reduce((sum, r) => sum + (r.grade || 0) * (r.courses?.units || 0), 0);
        const totalUnitsTaken = completedRecords.reduce((sum, r) => sum + (r.courses?.units || 0), 0);
        cumulativeGpa = totalUnitsTaken > 0 ? (totalWeighted / totalUnitsTaken).toFixed(2) : '0.00';
    }

    const chips = document.querySelectorAll('.chip-value');
    if (chips[0]) chips[0].textContent = `${completedUnits}/200`;
    if (chips[1]) chips[1].textContent = cumulativeGpa;
    if (chips[2]) chips[2].textContent = `${failedUnits} units`;

    const termMap = {};
    allRecords.forEach(r => {
        const termKey = r.terms ? `${r.terms.academic_year}__${r.terms.term_name}` : 'unknown';
        if (!termMap[termKey]) termMap[termKey] = { term: r.terms, records: [] };
        termMap[termKey].records.push(r);
    });

    const container = document.getElementById('termCardsContainer');
    if (!container) return;

    const filterYear = document.getElementById('filterYear');
    const filterTerm = document.getElementById('filterTerm');
    const yearSet = new Set();

    container.innerHTML = '';
    Object.entries(termMap).sort((a, b) => b[0].localeCompare(a[0])).forEach(([key, { term, records: termRecords }]) => {
        const ay = term?.academic_year || 'Unknown';
        const termName = term?.term_name || 'Unknown';
        yearSet.add(ay);

        const termUnits = termRecords.reduce((s, r) => s + (r.courses?.units || 0), 0);
        const termPassed = termRecords.filter(r => r.status === 'passed');
        const termGpa = termPassed.length > 0
            ? (termPassed.reduce((s, r) => s + (r.grade || 0) * (r.courses?.units || 0), 0) / termPassed.reduce((s, r) => s + (r.courses?.units || 0), 0)).toFixed(2)
            : '—';
        const termFailed = termRecords.filter(r => r.status === 'failed').reduce((s, r) => s + (r.courses?.units || 0), 0);

        const card = document.createElement('div');
        card.className = 'term-card';
        card.dataset.year = ay;
        const termLower = termName.toLowerCase();
        card.dataset.term = (termLower.includes('first') || termLower.includes('1')) ? '1' : (termLower.includes('second') || termLower.includes('2')) ? '2' : '3';

        card.innerHTML = `
            <div class="term-card-header">
                <div><span class="term-title">${termName}</span> &middot; <span class="term-ay">AY ${ay}</span></div>
                <span class="term-status approved">Completed</span>
            </div>
            <table class="term-table">
                <thead><tr><th>Code</th><th>Course Name</th><th>Units</th><th>Grade</th></tr></thead>
                <tbody>${termRecords.map(r => {
                    const grade = r.grade !== null ? r.grade.toFixed(1) : '—';
                    const isFail = r.status === 'failed';
                    return `<tr>
                        <td class="code-cell">${r.courses?.code || '—'}</td>
                        <td>${r.courses?.title || '—'}</td>
                        <td>${r.courses?.units || '—'}</td>
                        <td><span class="grade-badge ${isFail ? 'fail' : 'pass'}">${grade}${isFail ? ' (F)' : ''}</span></td>
                    </tr>`;
                }).join('')}
                <tr class="total-units-row">
                    <td colspan="2" style="text-align:right;font-weight:700;color:var(--dlsu-gray-600);">Total Units</td>
                    <td style="font-weight:800;">${termUnits}</td>
                    <td></td>
                </tr>
                </tbody>
            </table>
            <div class="term-footer">
                <div class="term-stat"><span class="ts-label">Term GPA</span><span class="ts-value">${termGpa}</span></div>
                <div class="term-stat"><span class="ts-label">Units Taken</span><span class="ts-value">${termUnits}</span></div>
                <div class="term-stat"><span class="ts-label">Failures</span><span class="ts-value ${termFailed > 0 ? 'text-danger' : ''}">${termFailed}</span></div>
            </div>`;
        container.appendChild(card);
    });

    if (filterYear) {
        filterYear.innerHTML = '<option value="all">All Years</option>';
        [...yearSet].sort().reverse().forEach(y => {
            filterYear.innerHTML += `<option value="${y}">AY ${y}</option>`;
        });
    }

    const termCards = container.querySelectorAll('.term-card');
    function applyFilters() {
        const year = filterYear?.value || 'all';
        const term = filterTerm?.value || 'all';
        termCards.forEach(card => {
            const matchYear = year === 'all' || card.dataset.year === year;
            const matchTerm = term === 'all' || card.dataset.term === term;
            card.style.display = (matchYear && matchTerm) ? '' : 'none';
        });
    }

    if (filterYear) filterYear.addEventListener('change', applyFilters);
    if (filterTerm) filterTerm.addEventListener('change', applyFilters);
    const resetBtn = document.getElementById('resetFilters');
    if (resetBtn) resetBtn.addEventListener('click', () => {
        if (filterYear) filterYear.value = 'all';
        if (filterTerm) filterTerm.value = 'all';
        applyFilters();
    });
})();
