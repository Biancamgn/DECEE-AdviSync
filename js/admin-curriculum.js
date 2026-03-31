document.addEventListener('DOMContentLoaded', () => {

    // ═══════════════════════════════════════════════════════════════════════
    // SHARED UI: Sidebar, Dark Mode, Clock, Profile
    // ═══════════════════════════════════════════════════════════════════════
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('hamburgerBtn');
    const isMobile = () => window.innerWidth < 992;

    sidebar.addEventListener('mouseenter', () => { if (!isMobile()) { sidebar.classList.add('expanded'); mainContent.classList.add('shifted'); } });
    sidebar.addEventListener('mouseleave', () => { if (!isMobile()) { sidebar.classList.remove('expanded'); mainContent.classList.remove('shifted'); } });
    hamburger.addEventListener('click', () => { sidebar.classList.toggle('expanded'); overlay.classList.toggle('active'); });
    overlay.addEventListener('click', () => { sidebar.classList.remove('expanded'); overlay.classList.remove('active'); });

    const profileWrapper = document.getElementById('profileWrapper');
    const profileToggle = document.getElementById('profileToggle');
    profileToggle.addEventListener('click', (e) => { e.stopPropagation(); profileWrapper.classList.toggle('open'); });
    document.addEventListener('click', (e) => { if (!profileWrapper.contains(e.target)) profileWrapper.classList.remove('open'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') profileWrapper.classList.remove('open'); });

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

    const darkModeBtn = document.getElementById('darkModeBtn');
    darkModeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const icon = darkModeBtn.querySelector('i');
        icon.className = document.body.classList.contains('dark-mode') ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
    });

    // ═══════════════════════════════════════════════════════════════════════
    // MOCK CURRICULUM DATA (12-term structure)
    // ═══════════════════════════════════════════════════════════════════════
    let bscpeCourses = [
        // Term 1 – Year 1
        { code: 'LBYCPD1', title: 'Computer Programming 1', units: 3, term: 1, year: 1, hardPrereqs: [], softPrereqs: [], coReqs: [] },
        { code: 'LBYMATH', title: 'Mathematics for Engineers', units: 3, term: 1, year: 1, hardPrereqs: [], softPrereqs: [], coReqs: [] },
        { code: 'GEUSELF', title: 'Understanding the Self', units: 3, term: 1, year: 1, hardPrereqs: [], softPrereqs: [], coReqs: [] },
        { code: 'GEFCOMM', title: 'Purposive Communication', units: 3, term: 1, year: 1, hardPrereqs: [], softPrereqs: [], coReqs: [] },
        { code: 'GEETHIC', title: 'Ethics', units: 3, term: 1, year: 1, hardPrereqs: [], softPrereqs: [], coReqs: [] },
        // Term 2
        { code: 'LBYCPD2', title: 'Computer Programming 2', units: 3, term: 2, year: 1, hardPrereqs: ['LBYCPD1'], softPrereqs: [], coReqs: [] },
        { code: 'LBYCALC', title: 'Calculus 1', units: 3, term: 2, year: 1, hardPrereqs: ['LBYMATH'], softPrereqs: [], coReqs: [] },
        { code: 'LBYPHY1', title: 'Physics 1', units: 4, term: 2, year: 1, hardPrereqs: ['LBYMATH'], softPrereqs: [], coReqs: [] },
        { code: 'GELITPH', title: 'Philippine Literature', units: 3, term: 2, year: 1, hardPrereqs: [], softPrereqs: [], coReqs: [] },
        // Term 3
        { code: 'LBYCPD3', title: 'Data Structures & Algorithms', units: 3, term: 3, year: 1, hardPrereqs: ['LBYCPD2'], softPrereqs: [], coReqs: [] },
        { code: 'LBYCAL2', title: 'Calculus 2', units: 3, term: 3, year: 1, hardPrereqs: ['LBYCALC'], softPrereqs: [], coReqs: [] },
        { code: 'LBYPHY2', title: 'Physics 2', units: 4, term: 3, year: 1, hardPrereqs: ['LBYPHY1'], softPrereqs: [], coReqs: [] },
        // Term 4 – Year 2
        { code: 'LBYCPG1', title: 'Discrete Mathematics', units: 3, term: 4, year: 2, hardPrereqs: ['LBYCPD2'], softPrereqs: ['LBYCAL2'], coReqs: [] },
        { code: 'LBYCAL3', title: 'Differential Equations', units: 3, term: 4, year: 2, hardPrereqs: ['LBYCAL2'], softPrereqs: [], coReqs: [] },
        { code: 'LBYCIRK', title: 'Circuit Analysis', units: 3, term: 4, year: 2, hardPrereqs: ['LBYPHY2'], softPrereqs: [], coReqs: [] },
        // Term 5
        { code: 'LBYCPG2', title: 'Computer Organization', units: 3, term: 5, year: 2, hardPrereqs: ['LBYCPG1', 'LBYCPD3'], softPrereqs: [], coReqs: [] },
        { code: 'LBYNUM', title: 'Numerical Methods', units: 3, term: 5, year: 2, hardPrereqs: ['LBYCAL3'], softPrereqs: [], coReqs: [] },
        { code: 'LBYEC01', title: 'Electronics 1', units: 3, term: 5, year: 2, hardPrereqs: ['LBYCIRK'], softPrereqs: [], coReqs: [] },
        // Term 6
        { code: 'LBYCPOS', title: 'Operating Systems', units: 3, term: 6, year: 2, hardPrereqs: ['LBYCPG2'], softPrereqs: [], coReqs: [] },
        { code: 'LBYSIG1', title: 'Signals & Systems', units: 3, term: 6, year: 2, hardPrereqs: ['LBYCAL3'], softPrereqs: [], coReqs: [] },
        { code: 'LBYEC02', title: 'Electronics 2', units: 3, term: 6, year: 2, hardPrereqs: ['LBYEC01'], softPrereqs: [], coReqs: [] },
        // Term 7 – Year 3
        { code: 'LBYCPNW', title: 'Computer Networks', units: 3, term: 7, year: 3, hardPrereqs: ['LBYCPOS'], softPrereqs: [], coReqs: [] },
        { code: 'LBYCPDB', title: 'Database Systems', units: 3, term: 7, year: 3, hardPrereqs: ['LBYCPD3'], softPrereqs: [], coReqs: [] },
        { code: 'LBYEMBD', title: 'Embedded Systems', units: 3, term: 7, year: 3, hardPrereqs: ['LBYCPG2'], softPrereqs: [], coReqs: ['LBYEC02'] },
        // Term 8
        { code: 'LBYCPSE', title: 'Software Engineering', units: 3, term: 8, year: 3, hardPrereqs: ['LBYCPDB', 'LBYCPOS'], softPrereqs: [], coReqs: [] },
        { code: 'LBYDSGN', title: 'Digital Design', units: 3, term: 8, year: 3, hardPrereqs: ['LBYEMBD'], softPrereqs: [], coReqs: [] },
        { code: 'LBYCPAI', title: 'Artificial Intelligence', units: 3, term: 8, year: 3, hardPrereqs: ['LBYCPD3', 'LBYCPG1'], softPrereqs: ['LBYNUM'], coReqs: [] },
        // Term 9
        { code: 'LBYTH1A', title: 'Thesis 1', units: 3, term: 9, year: 3, hardPrereqs: ['LBYCPSE'], softPrereqs: [], coReqs: [] },
        { code: 'LBYCPSC', title: 'Computer Security', units: 3, term: 9, year: 3, hardPrereqs: ['LBYCPNW'], softPrereqs: [], coReqs: [] },
        // Term 10 – Year 4
        { code: 'LBYTH2A', title: 'Thesis 2', units: 3, term: 10, year: 4, hardPrereqs: ['LBYTH1A'], softPrereqs: [], coReqs: [] },
        { code: 'LBYCPEL', title: 'CpE Elective 1', units: 3, term: 10, year: 4, hardPrereqs: [], softPrereqs: [], coReqs: [] },
        // Term 11
        { code: 'LBYTH3A', title: 'Thesis 3', units: 3, term: 11, year: 4, hardPrereqs: ['LBYTH2A'], softPrereqs: [], coReqs: [] },
        { code: 'LBYCPE2', title: 'CpE Elective 2', units: 3, term: 11, year: 4, hardPrereqs: [], softPrereqs: [], coReqs: [] },
        // Term 12
        { code: 'LBYOJTA', title: 'On-the-Job Training', units: 6, term: 12, year: 4, hardPrereqs: ['LBYTH3A'], softPrereqs: [], coReqs: [] },
    ];

    let bseceCourses = [
        // Term 1 – Year 1
        { code: 'LBYEC10', title: 'Intro to Electronics Engineering', units: 3, term: 1, year: 1, hardPrereqs: [], softPrereqs: [], coReqs: [] },
        { code: 'LBYMTH1', title: 'Engineering Mathematics 1', units: 3, term: 1, year: 1, hardPrereqs: [], softPrereqs: [], coReqs: [] },
        { code: 'GEUSELF', title: 'Understanding the Self', units: 3, term: 1, year: 1, hardPrereqs: [], softPrereqs: [], coReqs: [] },
        { code: 'GEFCOMM', title: 'Purposive Communication', units: 3, term: 1, year: 1, hardPrereqs: [], softPrereqs: [], coReqs: [] },
        // Term 2
        { code: 'LBYEC20', title: 'Circuit Theory 1', units: 3, term: 2, year: 1, hardPrereqs: ['LBYMTH1'], softPrereqs: [], coReqs: [] },
        { code: 'LBYMTH2', title: 'Engineering Mathematics 2', units: 3, term: 2, year: 1, hardPrereqs: ['LBYMTH1'], softPrereqs: [], coReqs: [] },
        { code: 'LBYEP01', title: 'Engineering Physics 1', units: 4, term: 2, year: 1, hardPrereqs: ['LBYMTH1'], softPrereqs: [], coReqs: [] },
        // Term 3
        { code: 'LBYEC30', title: 'Circuit Theory 2', units: 3, term: 3, year: 1, hardPrereqs: ['LBYEC20'], softPrereqs: [], coReqs: [] },
        { code: 'LBYMTH3', title: 'Differential Equations', units: 3, term: 3, year: 1, hardPrereqs: ['LBYMTH2'], softPrereqs: [], coReqs: [] },
        { code: 'LBYEP02', title: 'Engineering Physics 2', units: 4, term: 3, year: 1, hardPrereqs: ['LBYEP01'], softPrereqs: [], coReqs: [] },
        // Term 4 – Year 2
        { code: 'LBYEC40', title: 'Electronics 1', units: 3, term: 4, year: 2, hardPrereqs: ['LBYEC30'], softPrereqs: [], coReqs: [] },
        { code: 'LBYSIG1', title: 'Signals & Systems', units: 3, term: 4, year: 2, hardPrereqs: ['LBYMTH3'], softPrereqs: [], coReqs: [] },
        { code: 'LBYEC4P', title: 'ECE Programming', units: 3, term: 4, year: 2, hardPrereqs: [], softPrereqs: ['LBYMTH2'], coReqs: [] },
        // Term 5
        { code: 'LBYEC50', title: 'Electronics 2', units: 3, term: 5, year: 2, hardPrereqs: ['LBYEC40'], softPrereqs: [], coReqs: [] },
        { code: 'LBYEM01', title: 'Electromagnetics 1', units: 3, term: 5, year: 2, hardPrereqs: ['LBYEP02', 'LBYMTH3'], softPrereqs: [], coReqs: [] },
        { code: 'LBYDSP1', title: 'Digital Signal Processing', units: 3, term: 5, year: 2, hardPrereqs: ['LBYSIG1'], softPrereqs: [], coReqs: [] },
        // Term 6
        { code: 'LBYEC60', title: 'Electronics 3', units: 3, term: 6, year: 2, hardPrereqs: ['LBYEC50'], softPrereqs: [], coReqs: [] },
        { code: 'LBYEM02', title: 'Electromagnetics 2', units: 3, term: 6, year: 2, hardPrereqs: ['LBYEM01'], softPrereqs: [], coReqs: [] },
        { code: 'LBYCOM1', title: 'Communications 1', units: 3, term: 6, year: 2, hardPrereqs: ['LBYDSP1'], softPrereqs: [], coReqs: [] },
        // Term 7 – Year 3
        { code: 'LBYCOM2', title: 'Communications 2', units: 3, term: 7, year: 3, hardPrereqs: ['LBYCOM1'], softPrereqs: [], coReqs: [] },
        { code: 'LBYPSYS', title: 'Power Systems', units: 3, term: 7, year: 3, hardPrereqs: ['LBYEC60'], softPrereqs: [], coReqs: [] },
        { code: 'LBYMICR', title: 'Microprocessors', units: 3, term: 7, year: 3, hardPrereqs: ['LBYEC4P', 'LBYEC50'], softPrereqs: [], coReqs: [] },
        // Term 8
        { code: 'LBYCOM3', title: 'Communications 3', units: 3, term: 8, year: 3, hardPrereqs: ['LBYCOM2'], softPrereqs: [], coReqs: [] },
        { code: 'LBYCTRL', title: 'Control Systems', units: 3, term: 8, year: 3, hardPrereqs: ['LBYSIG1'], softPrereqs: [], coReqs: [] },
        { code: 'LBYECD1', title: 'ECE Design 1', units: 3, term: 8, year: 3, hardPrereqs: ['LBYMICR'], softPrereqs: [], coReqs: [] },
        // Term 9
        { code: 'LBYETH1', title: 'ECE Thesis 1', units: 3, term: 9, year: 3, hardPrereqs: ['LBYECD1'], softPrereqs: [], coReqs: [] },
        { code: 'LBYECEL', title: 'ECE Elective 1', units: 3, term: 9, year: 3, hardPrereqs: [], softPrereqs: [], coReqs: [] },
        // Term 10 – Year 4
        { code: 'LBYETH2', title: 'ECE Thesis 2', units: 3, term: 10, year: 4, hardPrereqs: ['LBYETH1'], softPrereqs: [], coReqs: [] },
        { code: 'LBYECE2', title: 'ECE Elective 2', units: 3, term: 10, year: 4, hardPrereqs: [], softPrereqs: [], coReqs: [] },
        // Term 11
        { code: 'LBYETH3', title: 'ECE Thesis 3', units: 3, term: 11, year: 4, hardPrereqs: ['LBYETH2'], softPrereqs: [], coReqs: [] },
        { code: 'LBYECE3', title: 'ECE Elective 3', units: 3, term: 11, year: 4, hardPrereqs: [], softPrereqs: [], coReqs: [] },
        // Term 12
        { code: 'LBYEOJT', title: 'On-the-Job Training', units: 6, term: 12, year: 4, hardPrereqs: ['LBYETH3'], softPrereqs: [], coReqs: [] },
    ];

    // ═══════════════════════════════════════════════════════════════════════
    // VIEW MODE STATE
    // ═══════════════════════════════════════════════════════════════════════
    let currentView = 'grid'; // 'grid' or 'table'
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

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER HELPERS
    // ═══════════════════════════════════════════════════════════════════════
    const courseSearch = document.getElementById('courseSearch');
    const termFilter = document.getElementById('termFilter');

    function prereqBadges(course) {
        let html = '';
        course.hardPrereqs.forEach(p => { html += `<span class="prereq-badge hard">${p}</span> `; });
        course.softPrereqs.forEach(p => { html += `<span class="prereq-badge soft">${p}</span> `; });
        course.coReqs.forEach(p => { html += `<span class="prereq-badge co">${p}</span> `; });
        return html || '<span style="color:var(--dlsu-gray-400); font-size:0.75rem;">None</span>';
    }

    function filterCourses(courses) {
        const q = courseSearch.value.toLowerCase();
        const t = termFilter.value;
        return courses.filter(c => {
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

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER: GRID VIEW (Term cards)
    // ═══════════════════════════════════════════════════════════════════════
    function renderGrid(courses, gridEl) {
        const filtered = filterCourses(courses);
        const terms = {};
        filtered.forEach(c => {
            if (!terms[c.term]) terms[c.term] = [];
            terms[c.term].push(c);
        });

        const sortedTerms = Object.keys(terms).map(Number).sort((a, b) => a - b);

        if (sortedTerms.length === 0) {
            gridEl.innerHTML = `<div class="text-center py-5" style="color:var(--dlsu-gray-400); font-size:0.85rem;"><i class="bi bi-inbox fs-2 d-block mb-2"></i>No courses found</div>`;
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
                                            <button class="action-btn edit" title="Edit" onclick="editCourse('${c.code}', '${courses === bscpeCourses ? 'BSCpE' : 'BSECE'}')"><i class="bi bi-pencil-square"></i></button>
                                            <button class="action-btn delete" title="Delete" onclick="deleteCourse('${c.code}', '${courses === bscpeCourses ? 'BSCpE' : 'BSECE'}')"><i class="bi bi-trash3"></i></button>
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

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER: TABLE VIEW
    // ═══════════════════════════════════════════════════════════════════════
    function renderTable(courses, tbodyEl, programKey) {
        const filtered = filterCourses(courses);

        if (filtered.length === 0) {
            tbodyEl.innerHTML = `<tr><td colspan="6" class="text-center py-4" style="color:var(--dlsu-gray-400); font-size:0.82rem;"><i class="bi bi-inbox fs-4 d-block mb-2"></i>No courses found</td></tr>`;
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

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER ALL
    // ═══════════════════════════════════════════════════════════════════════
    function renderAll() {
        // Toggle visibility
        document.getElementById('bscpeGrid').classList.toggle('d-none', currentView !== 'grid');
        document.getElementById('bscpeTable').classList.toggle('d-none', currentView !== 'table');
        document.getElementById('bseceGrid').classList.toggle('d-none', currentView !== 'grid');
        document.getElementById('bseceTable').classList.toggle('d-none', currentView !== 'table');

        if (currentView === 'grid') {
            renderGrid(bscpeCourses, document.getElementById('bscpeGrid'));
            renderGrid(bseceCourses, document.getElementById('bseceGrid'));
        } else {
            renderTable(bscpeCourses, document.getElementById('bscpeTableBody'), 'BSCpE');
            renderTable(bseceCourses, document.getElementById('bseceTableBody'), 'BSECE');
        }

        document.getElementById('bscpeCount').textContent = bscpeCourses.length;
        document.getElementById('bseceCount').textContent = bseceCourses.length;
    }

    renderAll();
    courseSearch.addEventListener('input', renderAll);
    termFilter.addEventListener('change', renderAll);

    // ═══════════════════════════════════════════════════════════════════════
    // CRUD: Add Course
    // ═══════════════════════════════════════════════════════════════════════
    const courseModal = new bootstrap.Modal(document.getElementById('courseModal'));

    document.getElementById('addCourseBtn').addEventListener('click', () => {
        document.getElementById('courseModalLabel').textContent = 'Add New Course';
        document.getElementById('courseForm').reset();
        document.getElementById('editCourseCode').value = '';
        document.getElementById('editCourseProgram').value = '';
        document.getElementById('formUnits').value = 3;
        // Default to whichever tab is active
        const activeTab = document.querySelector('#programTabs .nav-link.active');
        document.getElementById('formCourseProgram').value = activeTab.id === 'bscpe-tab' ? 'BSCpE' : 'BSECE';
        courseModal.show();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // CRUD: Save (Create or Update)
    // ═══════════════════════════════════════════════════════════════════════
    document.getElementById('saveCourseBtn').addEventListener('click', () => {
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

        const courseObj = { code, title, units, term, year, hardPrereqs, softPrereqs, coReqs };
        const targetArr = program === 'BSCpE' ? bscpeCourses : bseceCourses;

        if (editCode) {
            // Update
            const srcArr = editProg === 'BSCpE' ? bscpeCourses : bseceCourses;
            const idx = srcArr.findIndex(c => c.code === editCode);
            if (idx !== -1) {
                // If program changed, remove from old and add to new
                if (editProg !== program) {
                    srcArr.splice(idx, 1);
                    targetArr.push(courseObj);
                } else {
                    srcArr[idx] = courseObj;
                }
            }
        } else {
            // Create
            if (targetArr.find(c => c.code === code)) { alert('A course with this code already exists.'); return; }
            targetArr.push(courseObj);
        }

        renderAll();
        courseModal.hide();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // CRUD: Edit
    // ═══════════════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════════════
    // CRUD: Delete
    // ═══════════════════════════════════════════════════════════════════════
    const deleteCourseModal = new bootstrap.Modal(document.getElementById('deleteCourseModal'));

    window.deleteCourse = function(code, program) {
        document.getElementById('deleteCourseCode').value = code;
        document.getElementById('deleteCourseProgram').value = program;
        deleteCourseModal.show();
    };

    document.getElementById('confirmDeleteCourseBtn').addEventListener('click', () => {
        const code = document.getElementById('deleteCourseCode').value;
        const program = document.getElementById('deleteCourseProgram').value;

        if (program === 'BSCpE') {
            bscpeCourses = bscpeCourses.filter(c => c.code !== code);
        } else {
            bseceCourses = bseceCourses.filter(c => c.code !== code);
        }

        renderAll();
        deleteCourseModal.hide();
    });
});
