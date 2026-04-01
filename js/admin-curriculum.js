document.addEventListener('DOMContentLoaded', async () => {

    const currentUser = await requireAuth(['admin']);
    if (!currentUser) return;

    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('hamburgerBtn');
    const isMobile = () => window.innerWidth < 992;

    sidebar.addEventListener('mouseenter', () => { if (!isMobile()) { sidebar.classList.add('expanded'); mainContent.classList.add('shifted'); } });
    sidebar.addEventListener('mouseleave', () => { if (!isMobile()) { sidebar.classList.remove('expanded'); mainContent.classList.remove('shifted'); } });
    hamburger.addEventListener('click', () => { sidebar.classList.toggle('expanded'); overlay.classList.toggle('active'); });
    overlay.addEventListener('click', () => { sidebar.classList.remove('expanded'); overlay.classList.remove('active'); });

    const clockEl = document.getElementById('topbarClock');
    function updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
        clockEl.textContent = `${now.toLocaleDateString('en-US', options)} · ${h}:${m}:${s}`;
    }
    updateClock();
    setInterval(updateClock, 1000);

    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) signOutBtn.addEventListener('click', (e) => { e.preventDefault(); signOut(); });

    let bscpeCourses = [];
    let bseceCourses = [];

    async function fetchCourses() {
        const { data: curriculum_courses, error } = await supabaseClient
            .from('curriculum_courses') // ✅ FIXED
            .select('*, prerequisites(*)')
            .order('term', { ascending: true });

        if (error) {
            console.error('Error fetching curriculum_courses:', error);
            return;
        }

        bscpeCourses = [];
        bseceCourses = [];

        (curriculum_courses || []).forEach(c => {
            const prereqs = c.prerequisites || [];
            const courseObj = {
                dbId: c.id,
                code: c.code,
                title: c.title,
                units: c.units,
                term: c.term,
                year: c.year_level,
                hardPrereqs: prereqs.filter(p => p.type === 'hard').map(p => p.prerequisite_code),
                softPrereqs: prereqs.filter(p => p.type === 'soft').map(p => p.prerequisite_code),
                coReqs: prereqs.filter(p => p.type === 'co').map(p => p.prerequisite_code)
            };

            if (c.program_code === 'BSCpE') bscpeCourses.push(courseObj);
            else if (c.program_code === 'BSECE') bseceCourses.push(courseObj);
        });
    }

    await fetchCourses();

    let currentView = 'grid';
    const viewGridBtn = document.getElementById('viewGrid');
    const viewTableBtn = document.getElementById('viewTable');

    viewGridBtn.addEventListener('click', () => {
        currentView = 'grid';
        viewGridBtn.style.background = 'var(--dlsu-green-light)';
        viewGridBtn.style.color = 'var(--dlsu-green)';
        viewTableBtn.style.background = 'var(--dlsu-gray-100)';
        viewTableBtn.style.color = 'var(--dlsu-gray-600)';
        renderAll();
    });

    viewTableBtn.addEventListener('click', () => {
        currentView = 'table';
        viewTableBtn.style.background = 'var(--dlsu-green-light)';
        viewTableBtn.style.color = 'var(--dlsu-green)';
        viewGridBtn.style.background = 'var(--dlsu-gray-100)';
        viewGridBtn.style.color = 'var(--dlsu-gray-600)';
        renderAll();
    });

    const courseSearch = document.getElementById('courseSearch');
    const termFilter = document.getElementById('termFilter');

    function prereqBadges(course) {
        let html = '';
        course.hardPrereqs.forEach(p => { html += `<span class="prereq-badge hard">${p}</span> `; });
        course.softPrereqs.forEach(p => { html += `<span class="prereq-badge soft">${p}</span> `; });
        course.coReqs.forEach(p => { html += `<span class="prereq-badge co">${p}</span> `; });
        return html || '<span style="color:var(--dlsu-gray-400); font-size:0.75rem;">None</span>';
    }

    function filterCourses(curriculum_courses) {
        const q = courseSearch.value.toLowerCase();
        const t = termFilter.value;
        return curriculum_courses.filter(c => {
            const matchSearch = !q || c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q);
            const matchTerm = t === 'all' || c.term === parseInt(t);
            return matchSearch && matchTerm;
        });
    }

    function getYearFromTerm(term) {
        if (term <= 3) return 1;
        if (term <= 6) return 2;
        if (term <= 9) return 3;
        return 4;
    }

    function renderGrid(curriculum_courses, gridEl, programKey) {
        const filtered = filterCourses(curriculum_courses);
        const terms = {};
        filtered.forEach(c => {
            if (!terms[c.term]) terms[c.term] = [];
            terms[c.term].push(c);
        });

        const sortedTerms = Object.keys(terms).map(Number).sort((a, b) => a - b);

        if (sortedTerms.length === 0) {
            gridEl.innerHTML = `<div class="text-center py-5" style="color:var(--dlsu-gray-400); font-size:0.85rem;"><i class="bi bi-inbox fs-2 d-block mb-2"></i>No curriculum_courses found</div>`;
            return;
        }

        gridEl.innerHTML = sortedTerms.map(term => {
            const year = getYearFromTerm(term);
            const totalUnits = terms[term].reduce((sum, c) => sum + c.units, 0);
            return `
                <div class="term-block mb-4">
                    <div class="term-header">
                        <span class="term-label">Term ${term}</span>
                        <span class="term-year">Year ${year}</span>
                        <span class="term-units">${totalUnits} units</span>
                    </div>
                    <div class="row g-2">
                        ${terms[term].map(c => `
                            <div class="col-sm-6 col-lg-4">
                                <div class="course-card">
                                    <div class="d-flex justify-content-between align-items-start mb-2">
                                        <span class="course-code">${c.code}</span>
                                        <div class="d-flex gap-1">
                                            <button class="action-btn edit" title="Edit" onclick="editCourse('${c.code}', '${programKey}')"><i class="bi bi-pencil-square"></i></button>
                                            <button class="action-btn delete" title="Delete" onclick="deleteCourse('${c.code}', '${programKey}')"><i class="bi bi-trash3"></i></button>
                                        </div>
                                    </div>
                                    <div class="course-title">${c.title}</div>
                                    <div class="course-units">${c.units} units</div>
                                    <div class="course-prereqs mt-2">
                                        ${prereqBadges(c)}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderTable(curriculum_courses, tbodyEl, programKey) {
        const filtered = filterCourses(curriculum_courses);

        if (filtered.length === 0) {
            tbodyEl.innerHTML = `<tr><td colspan="6" class="text-center py-4" style="color:var(--dlsu-gray-400); font-size:0.82rem;"><i class="bi bi-inbox fs-4 d-block mb-2"></i>No curriculum_courses found</td></tr>`;
            return;
        }

        tbodyEl.innerHTML = filtered.sort((a, b) => a.term - b.term || a.code.localeCompare(b.code)).map(c => `
            <tr>
                <td class="prof-name">${c.code}</td>
                <td>${c.title}</td>
                <td>${c.units}</td>
                <td><span class="badge-program">Term ${c.term}</span></td>
                <td>${prereqBadges(c)}</td>
                <td>
                    <div class="d-flex justify-content-end gap-1">
                        <button class="action-btn edit" title="Edit" onclick="editCourse('${c.code}', '${programKey}')"><i class="bi bi-pencil-square"></i></button>
                        <button class="action-btn delete" title="Delete" onclick="deleteCourse('${c.code}', '${programKey}')"><i class="bi bi-trash3"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function renderAll() {
        document.getElementById('bscpeGrid').classList.toggle('d-none', currentView !== 'grid');
        document.getElementById('bscpeTable').classList.toggle('d-none', currentView !== 'table');
        document.getElementById('bseceGrid').classList.toggle('d-none', currentView !== 'grid');
        document.getElementById('bseceTable').classList.toggle('d-none', currentView !== 'table');

        if (currentView === 'grid') {
            renderGrid(bscpeCourses, document.getElementById('bscpeGrid'), 'BSCpE');
            renderGrid(bseceCourses, document.getElementById('bseceGrid'), 'BSECE');
        } else {
            renderTable(bscpeCourses, document.getElementById('bscpeTableBody'), 'BSCpE');
            renderTable(bseceCourses, document.getElementById('bseceTableBody'), 'BSECE');
        }

        document.getElementById('bscpeCount').textContent = bscpeCourses.length;
        document.getElementById('bseceCount').textContent = bseceCourses.length;
    }

    renderAll();
    courseSearch.addEventListener('input', renderAll);

    const courseModal = new bootstrap.Modal(document.getElementById('courseModal'));

    document.getElementById('addCourseBtn').addEventListener('click', () => {
        document.getElementById('courseModalLabel').textContent = 'Add New Course';
        document.getElementById('courseForm').reset();
        document.getElementById('editCourseCode').value = '';
        document.getElementById('editCourseProgram').value = '';
        document.getElementById('formUnits').value = 3;
        const activeTab = document.querySelector('#programTabs .nav-link.active');
        document.getElementById('formCourseProgram').value = activeTab.id === 'bscpe-tab' ? 'BSCpE' : 'BSECE';
        courseModal.show();
    });

    document.getElementById('saveCourseBtn').addEventListener('click', async () => {
        const editCode = document.getElementById('editCourseCode').value;
        const editProg = document.getElementById('editCourseProgram').value;

        const code = document.getElementById('formCourseCode').value.trim().toUpperCase();
        const title = document.getElementById('formCourseTitle').value.trim();
        const units = parseInt(document.getElementById('formUnits').value);
        const term = parseInt(document.getElementById('formTerm').value);
        const program = document.getElementById('formCourseProgram').value;
        const year = parseInt(document.getElementById('formCourseYear').value);

        const parseList = (val) => val.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        const hardPrereqs = parseList(document.getElementById('formHardPrereqs').value);
        const softPrereqs = parseList(document.getElementById('formSoftPrereqs').value);
        const coReqs = parseList(document.getElementById('formCoReqs').value);

        if (!code || !title) { alert('Please fill in Course Code and Title.'); return; }

        if (editCode) {
            const srcArr = editProg === 'BSCpE' ? bscpeCourses : bseceCourses;
            const existing = srcArr.find(c => c.code === editCode);
            if (!existing) return;

            const { error } = await supabaseClient
                .from('curriculum_courses')
                .update({ code, title, units, term, year_level: year, program_code: program })
                .eq('id', existing.dbId);

            if (error) { alert('Error updating course: ' + error.message); return; }

            await supabaseClient.from('prerequisites').delete().eq('course_id', existing.dbId);

            const prereqRows = [
                ...hardPrereqs.map(p => ({ course_id: existing.dbId, prerequisite_code: p, type: 'hard' })),
                ...softPrereqs.map(p => ({ course_id: existing.dbId, prerequisite_code: p, type: 'soft' })),
                ...coReqs.map(p => ({ course_id: existing.dbId, prerequisite_code: p, type: 'co' }))
            ];

            if (prereqRows.length > 0) {
                await supabaseClient.from('prerequisites').insert(prereqRows);
            }
        } else {
            const { data: newCourse, error } = await supabaseClient
                .from('curriculum_courses')
                .insert({ code, title, units, term, year_level: year, program_code: program })
                .select()
                .single();

            if (error) { alert('Error creating course: ' + error.message); return; }

            const prereqRows = [
                ...hardPrereqs.map(p => ({ course_id: newCourse.id, prerequisite_code: p, type: 'hard' })),
                ...softPrereqs.map(p => ({ course_id: newCourse.id, prerequisite_code: p, type: 'soft' })),
                ...coReqs.map(p => ({ course_id: newCourse.id, prerequisite_code: p, type: 'co' }))
            ];

            if (prereqRows.length > 0) {
                await supabaseClient.from('prerequisites').insert(prereqRows);
            }
        }

        await fetchCourses();
        renderAll();
        courseModal.hide();
    });

    window.editCourse = function(code, program) {
        const arr = program === 'BSCpE' ? bscpeCourses : bseceCourses;
        const c = arr.find(x => x.code === code);
        if (!c) return;

        document.getElementById('courseModalLabel').textContent = 'Edit Course';
        document.getElementById('editCourseCode').value = code;
        document.getElementById('editCourseProgram').value = program;

        document.getElementById('formCourseCode').value = c.code;
        document.getElementById('formCourseTitle').value = c.title;
        document.getElementById('formUnits').value = c.units;
        document.getElementById('formTerm').value = c.term;
        document.getElementById('formCourseProgram').value = program;
        document.getElementById('formCourseYear').value = c.year;
        document.getElementById('formHardPrereqs').value = c.hardPrereqs.join(', ');
        document.getElementById('formSoftPrereqs').value = c.softPrereqs.join(', ');
        document.getElementById('formCoReqs').value = c.coReqs.join(', ');

        courseModal.show();
    };

    const deleteCourseModal = new bootstrap.Modal(document.getElementById('deleteCourseModal'));

    window.deleteCourse = function(code, program) {
        document.getElementById('deleteCourseCode').value = code;
        document.getElementById('deleteCourseProgram').value = program;
        deleteCourseModal.show();
    };

    document.getElementById('confirmDeleteCourseBtn').addEventListener('click', async () => {
        const code = document.getElementById('deleteCourseCode').value;
        const program = document.getElementById('deleteCourseProgram').value;

        const arr = program === 'BSCpE' ? bscpeCourses : bseceCourses;
        const course = arr.find(c => c.code === code);

        if (course) {
            const { error } = await supabaseClient
                .from('curriculum_courses')
                .delete()
                .eq('id', course.dbId);

            if (error) { alert('Error deleting course: ' + error.message); }
        }

        await fetchCourses();
        renderAll();
        deleteCourseModal.hide();
    });
});
