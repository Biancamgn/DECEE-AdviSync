document.addEventListener('DOMContentLoaded', async () => {

    const currentUser = await requireAuth(['admin']);
    if (!currentUser) {
        console.log('❌ Authentication failed, but continuing for testing...');
    } else {
        console.log('✅ User authenticated:', currentUser);
        // Populate topbar with actual user data
        const fullName = ((currentUser.first_name || '') + ' ' + (currentUser.last_name || '')).trim();
        const initials = (currentUser.first_name?.[0] || '') + (currentUser.last_name?.[0] || '');
        document.querySelectorAll('.profile-btn').forEach(el => el.textContent = initials);
        document.querySelectorAll('.dropdown-avatar').forEach(el => el.textContent = initials);
        document.querySelectorAll('.dropdown-name').forEach(el => el.textContent = fullName || 'System Admin');
    }
    console.log('Starting admin curriculum page...');
    console.log('Supabase client available:', typeof supabaseClient);

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
    let programStudentChecklists = [];

    // Track current student ID for each program (set early to avoid TDZ on initial renderAll)
    let currentStudentIds = { BSCpE: null, BSECE: null };

    // Declare currentView early so renderAll() called from fetchCourses() can access it
    let currentView = 'grid';

    // Declare search/filter elements early so filterCourses() can access them during initial render
    const courseSearch = document.getElementById('courseSearch');
    const termFilter = document.getElementById('termFilter');

    async function fetchCourses() {
        console.log('🔄 Starting fetchCourses function...');
        console.log('Supabase client available:', typeof supabaseClient);

        try {
            console.log('📚 Querying courses table...');
            const { data: courses, error } = await supabaseClient
                .from('courses')
                .select('*')
                .order('term', { ascending: true });

            console.log('🔍 Raw Supabase response:', {
                hasData: !!courses,
                dataLength: courses ? courses.length : 0,
                error: error,
                errorMessage: error ? error.message : null,
                errorDetails: error ? error.details : null
            });

            if (error) {
                console.error('❌ Database error:', error);
                console.error('Error code:', error.code);
                console.error('Error message:', error.message);
                console.error('Error details:', error.details);
                console.error('Error hint:', error.hint);

                // Show error in UI
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ff6b6b; color: white; padding: 15px; border-radius: 8px; z-index: 9999; max-width: 400px;';
                errorDiv.innerHTML = `
                    <strong>Database Error:</strong><br>
                    ${error.message}<br>
                    <small>Check browser console for details</small>
                `;
                document.body.appendChild(errorDiv);
                setTimeout(() => errorDiv.remove(), 10000);

                return;
            }

            console.log('✅ Query successful, processing courses...');
            bscpeCourses = [];
            bseceCourses = [];

            if (!courses || courses.length === 0) {
                console.warn('⚠️ No courses found in database');
                // Show warning in UI
                const warningDiv = document.createElement('div');
                warningDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ffa726; color: white; padding: 15px; border-radius: 8px; z-index: 9999; max-width: 400px;';
                warningDiv.innerHTML = `
                    <strong>No Courses Found:</strong><br>
                    The courses table is empty or inaccessible.<br>
                    <small>Check RLS policies or add sample data</small>
                `;
                document.body.appendChild(warningDiv);
                setTimeout(() => warningDiv.remove(), 10000);
            } else {
                console.log(`📊 Processing ${courses.length} courses...`);
                // Deduplicate by code (courses.code has UNIQUE constraint but guard against data issues)
                const seenCodes = new Set();
                courses.forEach((c, index) => {
                    if (seenCodes.has(c.code)) {
                        console.warn(`⚠️ Skipping duplicate course code: ${c.code}`);
                        return;
                    }
                    seenCodes.add(c.code);
                    console.log(`🔍 Course ${index + 1}:`, {
                        id: c.id,
                        code: c.code,
                        title: c.title,
                        program_code: c.program_code,
                        term: c.term,
                        year_level: c.year_level
                    });

                    const courseObj = {
                        dbId: c.id,
                        code: c.code,
                        title: c.title,
                        units: c.units,
                        term: c.term,
                        year: c.year_level,
                        hardPrereqs: [],
                        softPrereqs: [],
                        coReqs: []
                    };

                    const programCodeNormalized = c.program_code && c.program_code.toString().toUpperCase();
                    if (programCodeNormalized === 'BSCPE' || programCodeNormalized === 'CPE') {
                        bscpeCourses.push(courseObj);
                        console.log('✅ Added to BSCpE courses (normalized from', c.program_code + ')');
                    } else if (programCodeNormalized === 'BSECE' || programCodeNormalized === 'ECE') {
                        bseceCourses.push(courseObj);
                        console.log('✅ Added to BSECE courses (normalized from', c.program_code + ')');
                    } else {
                        console.warn('⚠️ Unknown program code:', c.program_code);
                    }
                });
            }

            console.log('📈 Final counts:', {
                bscpe: bscpeCourses.length,
                bsece: bseceCourses.length,
                total: bscpeCourses.length + bseceCourses.length
            });

            // Update UI counts
            const bscpeCountEl = document.getElementById('bscpeCount');
            const bseceCountEl = document.getElementById('bseceCount');

            if (bscpeCountEl) bscpeCountEl.textContent = bscpeCourses.length;
            if (bseceCountEl) bseceCountEl.textContent = bseceCourses.length;

            renderAll();

            // Show success message
            const successDiv = document.createElement('div');
            successDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4caf50; color: white; padding: 15px; border-radius: 8px; z-index: 9999; max-width: 400px;';
            successDiv.innerHTML = `
                <strong>✅ Database Connected!</strong><br>
                Found ${bscpeCourses.length + bseceCourses.length} courses<br>
                BSCpE: ${bscpeCourses.length} | BSECE: ${bseceCourses.length}
            `;
            document.body.appendChild(successDiv);
            setTimeout(() => successDiv.remove(), 5000);

        } catch (err) {
            console.error('💥 Unexpected error in fetchCourses:', err);
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #f44336; color: white; padding: 15px; border-radius: 8px; z-index: 9999; max-width: 400px;';
            errorDiv.innerHTML = `
                <strong>💥 Unexpected Error:</strong><br>
                ${err.message}<br>
                <small>Check browser console</small>
            `;
            document.body.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 10000);
        }
    }

    await fetchCourses();

    async function fetchProgramStudentChecklists() {
        console.log('📥 Fetching program student checklists...');
        const { data, error } = await supabaseClient
            .from('program_student_checklists')
            .select('*')
            .order('program_code', { ascending: true })
            .order('student_id_prefix', { ascending: true })
            .order('year_level', { ascending: true })
            .order('term', { ascending: true })
            .order('course_sequence', { ascending: true });

        if (error) {
            console.error('❌ Error fetching program_student_checklists:', error);
            return;
        }

        programStudentChecklists = data || [];
        console.log('✅ Loaded program student checklists:', programStudentChecklists.length);

        // Debug output: grouped by program+student
        const grouped = programStudentChecklists.reduce((acc, item) => {
            const key = `${item.program_code}-${item.student_id_prefix}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {});
        console.log('🗂️ Checklist groups', grouped);
    }

    await fetchProgramStudentChecklists();

    // Generate student ID tabs for each program
    function generateStudentIdTabs() {
        const bscpeStudentIds = [...new Set(programStudentChecklists
            .filter(c => {
                const p = c.program_code && c.program_code.toString().toUpperCase();
                return p === 'BSCPE' || p === 'CPE';
            })
            .map(c => c.student_id_prefix))].sort((a, b) => a - b);

        const bseceStudentIds = [...new Set(programStudentChecklists
            .filter(c => {
                const p = c.program_code && c.program_code.toString().toUpperCase();
                return p === 'BSECE' || p === 'ECE';
            })
            .map(c => c.student_id_prefix))].sort((a, b) => a - b);

        // BSCpE tabs
        const bscpeTabsContainer = document.getElementById('bscpeStudentTabs');
        bscpeTabsContainer.innerHTML = '';
        bscpeStudentIds.forEach((studentId, index) => {
            const tabBtn = document.createElement('button');
            tabBtn.className = `btn btn-sm ${index === 0 ? 'btn-primary' : 'btn-outline-primary'}`;
            tabBtn.textContent = `ID ${studentId}`;
            tabBtn.dataset.studentId = studentId;
            tabBtn.dataset.program = 'BSCpE';
            tabBtn.addEventListener('click', () => switchStudentTab('BSCpE', studentId));
            bscpeTabsContainer.appendChild(tabBtn);
        });

        // BSECE tabs
        const bseceTabsContainer = document.getElementById('bseceStudentTabs');
        bseceTabsContainer.innerHTML = '';
        bseceStudentIds.forEach((studentId, index) => {
            const tabBtn = document.createElement('button');
            tabBtn.className = `btn btn-sm ${index === 0 ? 'btn-primary' : 'btn-outline-primary'}`;
            tabBtn.textContent = `ID ${studentId}`;
            tabBtn.dataset.studentId = studentId;
            tabBtn.dataset.program = 'BSECE';
            tabBtn.addEventListener('click', () => switchStudentTab('BSECE', studentId));
            bseceTabsContainer.appendChild(tabBtn);
        });
    }

    function switchStudentTab(program, studentId) {
        // Update active tab styling
        const tabsContainer = document.getElementById(`${program.toLowerCase()}StudentTabs`);
        const tabButtons = tabsContainer.querySelectorAll('button');
        tabButtons.forEach(btn => {
            if (btn.dataset.studentId == studentId) {
                btn.className = 'btn btn-sm btn-primary';
            } else {
                btn.className = 'btn btn-sm btn-outline-primary';
            }
        });

        // Update current student ID
        currentStudentIds[program] = studentId;

        // Re-render the current view
        renderAll();
    }

    // Initialize student ID tabs
    generateStudentIdTabs();

    // Set initial student IDs (first available for each program)
    const bscpeStudentIds = [...new Set(programStudentChecklists
        .filter(c => {
            const p = c.program_code && c.program_code.toString().toUpperCase();
            return p === 'BSCPE' || p === 'CPE';
        })
        .map(c => c.student_id_prefix))].sort((a, b) => a - b);

    const bseceStudentIds = [...new Set(programStudentChecklists
        .filter(c => {
            const p = c.program_code && c.program_code.toString().toUpperCase();
            return p === 'BSECE' || p === 'ECE';
        })
        .map(c => c.student_id_prefix))].sort((a, b) => a - b);

    if (bscpeStudentIds.length > 0) currentStudentIds.BSCpE = bscpeStudentIds[0];
    if (bseceStudentIds.length > 0) currentStudentIds.BSECE = bseceStudentIds[0];

    // Re-render when program tab changes (bootstrap tab event), and ensure a student ID is selected.
    function getActiveProgram() {
        const activeProgramTab = document.querySelector('#programTabs .nav-link.active');
        return activeProgramTab && activeProgramTab.id === 'bscpe-tab' ? 'BSCpE' : 'BSECE';
    }

    document.querySelectorAll('#programTabs button[data-bs-toggle="tab"]').forEach(btn => {
        btn.addEventListener('shown.bs.tab', () => {
            const active = getActiveProgram();
            if (!currentStudentIds[active]) {
                const studentIds = active === 'BSCpE' ? bscpeStudentIds : bseceStudentIds;
                if (studentIds && studentIds.length) currentStudentIds[active] = studentIds[0];
            }
            renderAll();
        });
    });

    currentView = 'grid'; // reset (declared earlier)
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

    function renderGrid(courses, gridEl, programKey) {
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

    function renderFlowchart(checklistItems, containerEl, programKey) {
        if (!checklistItems || checklistItems.length === 0) {
            containerEl.innerHTML = `<div class="text-center py-5" style="color:var(--dlsu-gray-400); font-size:0.85rem;"><i class="bi bi-inbox fs-2 d-block mb-2"></i>No checklist data found</div>`;
            return;
        }

        // Group by year and term
        const grouped = checklistItems.reduce((acc, item) => {
            const key = `Year ${item.year_level} - Term ${item.term}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {});

        containerEl.innerHTML = Object.keys(grouped).sort().map(termKey => {
            const courses = grouped[termKey].sort((a, b) => a.course_sequence - b.course_sequence);
            const totalUnits = courses.reduce((sum, c) => sum + c.units, 0);

            return `
                <div class="term-block mb-4">
                    <div class="term-header">
                        <span class="term-label">${termKey}</span>
                        <span class="term-units">${totalUnits} units</span>
                    </div>
                    <div class="row g-2">
                        ${courses.map(c => {
                            // Parse prerequisites
                            let prereqHtml = '<span style="color:var(--dlsu-gray-400); font-size:0.75rem;">None</span>';
                            if (c.prerequisites) {
                                try {
                                    const prereqs = JSON.parse(c.prerequisites);
                                    if (prereqs && prereqs.length > 0) {
                                        prereqHtml = prereqs.map(p => {
                                            const type = p.type === 'H' ? 'hard' : p.type === 'S' ? 'soft' : 'co';
                                            return `<span class="prereq-badge ${type}">${p.code}</span>`;
                                        }).join(' ');
                                    }
                                } catch (e) {
                                    // If not JSON, treat as simple string
                                    prereqHtml = `<span class="prereq-badge hard">${c.prerequisites}</span>`;
                                }
                            }

                            return `
                                <div class="col-sm-6 col-lg-4">
                                    <div class="course-card">
                                        <div class="d-flex justify-content-between align-items-start mb-2">
                                            <span class="course-code">${c.course_code}</span>
                                            <div class="d-flex gap-1">
                                                <button class="action-btn edit" title="Edit" onclick="editChecklistCourse('${c.id}', '${programKey}')"><i class="bi bi-pencil-square"></i></button>
                                                <button class="action-btn delete" title="Delete" onclick="deleteChecklistCourse('${c.id}', '${programKey}')"><i class="bi bi-trash3"></i></button>
                                            </div>
                                        </div>
                                        <div class="course-title">${c.course_title}</div>
                                        <div class="course-units">${c.units} units</div>
                                        <div class="course-prereqs mt-2">
                                            ${prereqHtml}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderChecklistTable(checklistItems, tbodyEl, programKey) {
        if (!checklistItems || checklistItems.length === 0) {
            tbodyEl.innerHTML = `<tr><td colspan="6" class="text-center py-4" style="color:var(--dlsu-gray-400); font-size:0.82rem;"><i class="bi bi-inbox fs-4 d-block mb-2"></i>No checklist data found</td></tr>`;
            return;
        }

        tbodyEl.innerHTML = checklistItems.sort((a, b) => {
            if (a.year_level !== b.year_level) return a.year_level - b.year_level;
            if (a.term !== b.term) return a.term - b.term;
            return a.course_sequence - b.course_sequence;
        }).map(c => {
            // Parse prerequisites
            let prereqHtml = '<span style="color:var(--dlsu-gray-400); font-size:0.75rem;">None</span>';
            if (c.prerequisites) {
                try {
                    const prereqs = JSON.parse(c.prerequisites);
                    if (prereqs && prereqs.length > 0) {
                        prereqHtml = prereqs.map(p => {
                            const type = p.type === 'H' ? 'hard' : p.type === 'S' ? 'soft' : 'co';
                            return `<span class="prereq-badge ${type}">${p.code}</span>`;
                        }).join(' ');
                    }
                } catch (e) {
                    prereqHtml = `<span class="prereq-badge hard">${c.prerequisites}</span>`;
                }
            }

            return `
                <tr>
                    <td class="prof-name">${c.course_code}</td>
                    <td>${c.course_title}</td>
                    <td>${c.units}</td>
                    <td><span class="badge-program">Y${c.year_level} T${c.term}</span></td>
                    <td>${prereqHtml}</td>
                    <td>
                        <div class="d-flex justify-content-end gap-1">
                            <button class="action-btn edit" title="Edit" onclick="editChecklistCourse('${c.id}', '${programKey}')"><i class="bi bi-pencil-square"></i></button>
                            <button class="action-btn delete" title="Delete" onclick="deleteChecklistCourse('${c.id}', '${programKey}')"><i class="bi bi-trash3"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderAll() {
        // Get active program tab
        const activeProgramTab = document.querySelector('#programTabs .nav-link.active');
        if (!activeProgramTab) {
            console.warn('⚠️ No active program tab found, skipping render');
            return;
        }
        
        const activeProgram = activeProgramTab.id === 'bscpe-tab' ? 'BSCpE' : 'BSECE';

        // Get current student ID for the active program
        const currentStudentId = currentStudentIds[activeProgram];

        // If we have checklist data and a selected student ID, show checklist view (flowchart or table based on currentView)
        if (programStudentChecklists.length > 0 && currentStudentId) {
            // Filter checklist for current program and student ID
            const checklistItems = programStudentChecklists.filter(c => {
                const p = c.program_code && c.program_code.toString().toUpperCase();
                const normalized = (p === 'CPE' ? 'BSCPE' : p === 'ECE' ? 'BSECE' : p);
                return normalized === activeProgram.toUpperCase() && c.student_id_prefix == currentStudentId;
            });

            // Get grid/table elements
            const gridEl = document.getElementById(`${activeProgram.toLowerCase()}Grid`);
            const tableEl = document.getElementById(`${activeProgram.toLowerCase()}Table`);

            // Show/hide based on currentView
            if (currentView === 'grid') {
                gridEl.classList.remove('d-none');
                tableEl.classList.add('d-none');
                renderFlowchart(checklistItems, gridEl, activeProgram);
            } else {
                gridEl.classList.add('d-none');
                tableEl.classList.remove('d-none');
                const tbodyEl = document.getElementById(`${activeProgram.toLowerCase()}TableBody`);
                renderChecklistTable(checklistItems, tbodyEl, activeProgram);
            }

            // Hide the other program's content
            const otherProgram = activeProgram === 'BSCpE' ? 'BSECE' : 'BSCpE';
            document.getElementById(`${otherProgram.toLowerCase()}Grid`).classList.add('d-none');
            document.getElementById(`${otherProgram.toLowerCase()}Table`).classList.add('d-none');

        } else {
            // Show regular course view — only render the active program
            const otherProgram = activeProgram === 'BSCpE' ? 'BSECE' : 'BSCpE';

            // Show active, hide other
            document.getElementById(`${activeProgram.toLowerCase()}Grid`).classList.toggle('d-none', currentView !== 'grid');
            document.getElementById(`${activeProgram.toLowerCase()}Table`).classList.toggle('d-none', currentView !== 'table');
            document.getElementById(`${otherProgram.toLowerCase()}Grid`).classList.add('d-none');
            document.getElementById(`${otherProgram.toLowerCase()}Table`).classList.add('d-none');

            const activeCourses = activeProgram === 'BSCpE' ? bscpeCourses : bseceCourses;
            if (currentView === 'grid') {
                renderGrid(activeCourses, document.getElementById(`${activeProgram.toLowerCase()}Grid`), activeProgram);
            } else {
                renderTable(activeCourses, document.getElementById(`${activeProgram.toLowerCase()}TableBody`), activeProgram);
            }
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

        // Note: Prerequisites are parsed but not saved since courses table doesn't support them yet
        console.log('Prerequisites parsed but not saved:', { hardPrereqs, softPrereqs, coReqs });

        if (!code || !title) { alert('Please fill in Course Code and Title.'); return; }

        if (editCode) {
            const srcArr = editProg === 'BSCpE' ? bscpeCourses : bseceCourses;
            const existing = srcArr.find(c => c.code === editCode);
            if (!existing) return;

            const { error } = await supabaseClient
                .from('courses')
                .update({ code, title, units, term, year_level: year, program_code: program })
                .eq('id', existing.dbId);

            if (error) { alert('Error updating course: ' + error.message); return; }

            // Note: Prerequisites handling removed for now since courses table doesn't have them
            // You can add prerequisites table logic here if needed
        } else {
            const { data: newCourse, error } = await supabaseClient
                .from('courses')
                .insert({ code, title, units, term, year_level: year, program_code: program })
                .select()
                .single();

            if (error) { alert('Error creating course: ' + error.message); return; }

            // Note: Prerequisites handling removed for now since courses table doesn't have them
            // You can add prerequisites table logic here if needed
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
        // Prerequisites not populated since not saved in courses table
        document.getElementById('formHardPrereqs').value = '';
        document.getElementById('formSoftPrereqs').value = '';
        document.getElementById('formCoReqs').value = '';

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
                .from('courses')
                .delete()
                .eq('id', course.dbId);

            if (error) { alert('Error deleting course: ' + error.message); }
        }

        await fetchCourses();
        renderAll();
        deleteCourseModal.hide();
    });

    // Checklist course management functions
    window.editChecklistCourse = function(id, program) {
        const checklistItem = programStudentChecklists.find(c => c.id == id);
        if (!checklistItem) return;

        // For now, show a simple alert - you can expand this to a full modal
        alert(`Edit checklist course: ${checklistItem.course_code} - ${checklistItem.course_title}\n\nThis would open an edit modal for checklist courses.`);
    };

    window.deleteChecklistCourse = function(id, program) {
        if (confirm('Are you sure you want to delete this checklist course?')) {
            // Delete from program_student_checklists table
            supabaseClient
                .from('program_student_checklists')
                .delete()
                .eq('id', id)
                .then(async ({ error }) => {
                    if (error) {
                        alert('Error deleting checklist course: ' + error.message);
                    } else {
                        // Refresh data
                        await fetchProgramStudentChecklists();
                        renderAll();
                    }
                });
        }
    };
});
