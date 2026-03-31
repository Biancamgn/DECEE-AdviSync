document.addEventListener('DOMContentLoaded', async () => {

    // ═══════════════════════════════════════════════════════════════════════
    // ROUTE GUARD + SHARED UI
    // ═══════════════════════════════════════════════════════════════════════
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

    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) signOutBtn.addEventListener('click', (e) => { e.preventDefault(); signOut(); });

    // ═══════════════════════════════════════════════════════════════════════
    // FETCH DATA FROM SUPABASE
    // ═══════════════════════════════════════════════════════════════════════
    const OVERLOAD_THRESHOLD = 50;

    let professors = [];
    let students = [];

    async function fetchProfessors() {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*, professors(*)')
            .eq('role', 'professor')
            .eq('status', 'active')
            .order('last_name');

        if (!error && data) {
            professors = data.map(p => ({
                id: p.school_id,
                uuid: p.id,
                name: `${p.first_name} ${p.last_name}`,
                dept: p.professors?.department || 'DECEE',
                maxAdvisees: p.professors?.max_advisees || 50,
                initials: p.first_name[0] + p.last_name[0]
            }));
        }
    }

    async function fetchStudents() {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*, students(*)')
            .eq('role', 'student')
            .order('school_id');

        if (!error && data) {
            students = data.map(p => {
                const adviserUuid = p.students?.adviser_id || null;
                return {
                    id: p.school_id,
                    uuid: p.id,
                    name: `${p.first_name} ${p.last_name}`,
                    program: p.students?.program || 'BSCpE',
                    year: p.students?.year_level || 1,
                    adviserUuid: adviserUuid,
                    adviserId: null // will be resolved after professors load
                };
            });
        }
    }

    await Promise.all([fetchProfessors(), fetchStudents()]);

    // Resolve adviser school_id from UUID
    students.forEach(s => {
        if (s.adviserUuid) {
            const prof = professors.find(p => p.uuid === s.adviserUuid);
            s.adviserId = prof ? prof.id : null;
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // DERIVED HELPERS
    // ═══════════════════════════════════════════════════════════════════════
    function getAdviseeCount(profId) {
        return students.filter(s => s.adviserId === profId).length;
    }

    function getYearLabel(y) {
        return { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' }[y] || y;
    }

    function getWorkloadStatus(count) {
        if (count > OVERLOAD_THRESHOLD) return 'overloaded';
        if (count >= 30) return 'optimal';
        return 'low';
    }

    function workloadColor(status) {
        if (status === 'overloaded') return { bg: '#fdeaea', color: 'var(--dlsu-danger)', barBg: 'var(--dlsu-danger)' };
        if (status === 'optimal') return { bg: 'var(--dlsu-green-light)', color: 'var(--dlsu-green)', barBg: 'var(--dlsu-green)' };
        return { bg: '#e8f0fe', color: 'var(--dlsu-info)', barBg: 'var(--dlsu-info)' };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER: STATS
    // ═══════════════════════════════════════════════════════════════════════
    function renderStats() {
        const assigned = students.filter(s => s.adviserId).length;
        const unassigned = students.filter(s => !s.adviserId).length;
        const overloaded = professors.filter(p => getAdviseeCount(p.id) > OVERLOAD_THRESHOLD).length;

        document.getElementById('totalAdvisers').textContent = professors.length;
        document.getElementById('assignedStudents').textContent = assigned;
        document.getElementById('unassignedStudents').textContent = unassigned;
        document.getElementById('overloadedAdvisers').textContent = overloaded;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER: WORKLOAD GRID
    // ═══════════════════════════════════════════════════════════════════════
    const workloadGrid = document.getElementById('workloadGrid');
    const facultySearch = document.getElementById('facultySearch');
    const workloadFilter = document.getElementById('workloadFilter');

    function renderWorkload() {
        const q = facultySearch.value.toLowerCase();
        const wf = workloadFilter.value;

        const filtered = professors.filter(p => {
            const count = getAdviseeCount(p.id);
            const status = getWorkloadStatus(count);
            const matchSearch = !q || p.name.toLowerCase().includes(q);
            const matchFilter = wf === 'all' || status === wf;
            return matchSearch && matchFilter;
        });

        if (filtered.length === 0) {
            workloadGrid.innerHTML = `<div class="text-center py-4" style="color:var(--dlsu-gray-400); font-size:0.82rem;"><i class="bi bi-inbox fs-4 d-block mb-2"></i>No professors match the filter</div>`;
            return;
        }

        workloadGrid.innerHTML = `<div class="row g-3">${filtered.map(p => {
            const count = getAdviseeCount(p.id);
            const status = getWorkloadStatus(count);
            const colors = workloadColor(status);
            const pct = Math.min((count / p.maxAdvisees) * 100, 100);
            const overPct = count > p.maxAdvisees ? ((count - p.maxAdvisees) / p.maxAdvisees) * 100 : 0;

            return `
                <div class="col-sm-6 col-lg-4">
                    <div class="workload-card">
                        <div class="d-flex align-items-center gap-3 mb-3">
                            <div class="workload-avatar" style="background: ${colors.bg}; color: ${colors.color};">${p.initials}</div>
                            <div class="flex-grow-1">
                                <div class="fw-bold" style="font-size: 0.85rem;">${p.name}</div>
                                <div style="font-size: 0.72rem; color: var(--dlsu-gray-400);">${p.dept}</div>
                            </div>
                            <div class="workload-status-badge ${status}">${status === 'overloaded' ? '⚠ Overloaded' : status === 'optimal' ? '✓ Optimal' : '○ Low'}</div>
                        </div>
                        <div class="d-flex align-items-center justify-content-between mb-2">
                            <span style="font-size: 0.72rem; font-weight: 600; color: var(--dlsu-gray-400);">Advisees</span>
                            <span style="font-size: 0.82rem; font-weight: 800; color: ${colors.color};">${count} <span style="font-weight: 500; color: var(--dlsu-gray-400);">/ ${p.maxAdvisees}</span></span>
                        </div>
                        <div class="progress-track" style="height: 8px;">
                            <div class="progress-fill" style="width: ${Math.min(pct, 100)}%; background: ${colors.barBg}; border-radius: 4px;"></div>
                        </div>
                        ${overPct > 0 ? `<div style="font-size: 0.68rem; color: var(--dlsu-danger); font-weight: 600; margin-top: 0.35rem;"><i class="bi bi-exclamation-triangle me-1"></i>${count - p.maxAdvisees} over capacity</div>` : ''}
                    </div>
                </div>
            `;
        }).join('')}</div>`;
    }

    facultySearch.addEventListener('input', renderWorkload);
    workloadFilter.addEventListener('change', renderWorkload);

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER: STUDENT TABLES
    // ═══════════════════════════════════════════════════════════════════════
    const studentSearch = document.getElementById('studentSearch');
    const programFilter = document.getElementById('programFilter');
    const yearFilter = document.getElementById('yearFilter');
    const unassignedBody = document.getElementById('unassignedBody');
    const allBody = document.getElementById('allBody');

    let selectedStudents = new Set();

    function filterStudents(list) {
        const q = studentSearch.value.toLowerCase();
        const prog = programFilter.value;
        const yr = yearFilter.value;

        return list.filter(s => {
            const matchSearch = !q || s.name.toLowerCase().includes(q) || s.id.includes(q);
            const matchProg = prog === 'all' || s.program === prog;
            const matchYear = yr === 'all' || s.year === parseInt(yr);
            return matchSearch && matchProg && matchYear;
        });
    }

    function renderUnassigned() {
        const unassigned = filterStudents(students.filter(s => !s.adviserId));

        unassignedBody.innerHTML = unassigned.length === 0
            ? `<tr><td colspan="6" class="text-center py-4" style="color:var(--dlsu-gray-400); font-size:0.82rem;"><i class="bi bi-check-circle fs-4 d-block mb-2" style="color:var(--dlsu-green);"></i>All students are assigned!</td></tr>`
            : unassigned.map(s => `
                <tr>
                    <td><input type="checkbox" class="form-check-input student-checkbox" value="${s.id}" ${selectedStudents.has(s.id) ? 'checked' : ''}></td>
                    <td class="prof-name">${s.id}</td>
                    <td>${s.name}</td>
                    <td><span class="badge-program">${s.program}</span></td>
                    <td>${getYearLabel(s.year)}</td>
                    <td class="text-end">
                        <button class="btn btn-sm px-2 py-1" onclick="openAssignModal('${s.id}')" style="background: var(--dlsu-green-light); color: var(--dlsu-green); font-weight: 600; border-radius: 6px; font-size: 0.72rem;">
                            <i class="bi bi-link-45deg me-1"></i>Assign
                        </button>
                    </td>
                </tr>
            `).join('');

        document.getElementById('unassignedCount').textContent = students.filter(s => !s.adviserId).length;
        attachCheckboxListeners();
    }

    function renderAllStudents() {
        const all = filterStudents(students);

        allBody.innerHTML = all.length === 0
            ? `<tr><td colspan="6" class="text-center py-4" style="color:var(--dlsu-gray-400); font-size:0.82rem;"><i class="bi bi-inbox fs-4 d-block mb-2"></i>No students found</td></tr>`
            : all.map(s => {
                const adv = professors.find(p => p.id === s.adviserId);
                return `
                    <tr>
                        <td class="prof-name">${s.id}</td>
                        <td>${s.name}</td>
                        <td><span class="badge-program">${s.program}</span></td>
                        <td>${getYearLabel(s.year)}</td>
                        <td>${adv ? `<span style="font-size:0.78rem; font-weight:600;">${adv.name}</span>` : `<span class="user-status-badge inactive"><i class="bi bi-dash-circle me-1"></i>Unassigned</span>`}</td>
                        <td class="text-end">
                            ${adv
                                ? `<button class="action-btn edit" title="Reassign" onclick="openReassignModal('${s.id}')"><i class="bi bi-arrow-left-right"></i></button>`
                                : `<button class="btn btn-sm px-2 py-1" onclick="openAssignModal('${s.id}')" style="background: var(--dlsu-green-light); color: var(--dlsu-green); font-weight: 600; border-radius: 6px; font-size: 0.72rem;"><i class="bi bi-link-45deg me-1"></i>Assign</button>`
                            }
                        </td>
                    </tr>
                `;
            }).join('');

        document.getElementById('allCount').textContent = students.length;
    }

    function renderEverything() {
        renderStats();
        renderWorkload();
        renderUnassigned();
        renderAllStudents();
        populateAdviserDropdowns();
    }

    studentSearch.addEventListener('input', () => { renderUnassigned(); renderAllStudents(); });
    programFilter.addEventListener('change', () => { renderUnassigned(); renderAllStudents(); });
    yearFilter.addEventListener('change', () => { renderUnassigned(); renderAllStudents(); });

    // ═══════════════════════════════════════════════════════════════════════
    // CHECKBOX & BULK SELECTION
    // ═══════════════════════════════════════════════════════════════════════
    const bulkAssignBar = document.getElementById('bulkAssignBar');

    function attachCheckboxListeners() {
        document.querySelectorAll('.student-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                if (e.target.checked) selectedStudents.add(e.target.value);
                else selectedStudents.delete(e.target.value);
                updateBulkBar();
            });
        });
    }

    document.getElementById('selectAllUnassigned').addEventListener('change', (e) => {
        const cbs = document.querySelectorAll('.student-checkbox');
        cbs.forEach(cb => {
            cb.checked = e.target.checked;
            if (e.target.checked) selectedStudents.add(cb.value);
            else selectedStudents.delete(cb.value);
        });
        updateBulkBar();
    });

    function updateBulkBar() {
        document.getElementById('selectedCount').textContent = selectedStudents.size;
        bulkAssignBar.classList.toggle('visible', selectedStudents.size > 0);
    }

    document.getElementById('bulkCancelBtn').addEventListener('click', () => {
        selectedStudents.clear();
        document.querySelectorAll('.student-checkbox').forEach(cb => cb.checked = false);
        document.getElementById('selectAllUnassigned').checked = false;
        updateBulkBar();
    });

    // Bulk assign — Supabase
    document.getElementById('bulkAssignBtn').addEventListener('click', async () => {
        const advId = document.getElementById('bulkAdviserSelect').value;
        if (!advId) { alert('Please choose an adviser.'); return; }
        if (selectedStudents.size === 0) return;

        const prof = professors.find(p => p.id === advId);
        if (!prof) return;

        // Update all selected students in Supabase
        const studentUuids = [];
        selectedStudents.forEach(sId => {
            const s = students.find(x => x.id === sId);
            if (s) studentUuids.push(s.uuid);
        });

        for (const uuid of studentUuids) {
            await supabaseClient
                .from('students')
                .update({ adviser_id: prof.uuid })
                .eq('id', uuid);
        }

        // Update local state
        selectedStudents.forEach(sId => {
            const s = students.find(x => x.id === sId);
            if (s) {
                s.adviserId = advId;
                s.adviserUuid = prof.uuid;
            }
        });

        selectedStudents.clear();
        document.getElementById('selectAllUnassigned').checked = false;
        updateBulkBar();
        renderEverything();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // ADVISER DROPDOWN HELPERS
    // ═══════════════════════════════════════════════════════════════════════
    function populateAdviserDropdowns() {
        const options = professors.map(p => {
            const count = getAdviseeCount(p.id);
            const status = getWorkloadStatus(count);
            const warn = status === 'overloaded' ? ' ⚠' : '';
            return `<option value="${p.id}">${p.name} (${count}/${p.maxAdvisees}${warn})</option>`;
        }).join('');

        document.getElementById('bulkAdviserSelect').innerHTML = `<option value="">Choose adviser...</option>` + options;
        document.getElementById('assignAdviserSelect').innerHTML = `<option value="">Choose an adviser...</option>` + options;
        document.getElementById('reassignAdviserSelect').innerHTML = `<option value="">Choose a new adviser...</option>` + options;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MODAL: Assign Single — Supabase
    // ═══════════════════════════════════════════════════════════════════════
    const assignModal = new bootstrap.Modal(document.getElementById('assignModal'));

    window.openAssignModal = function(studentId) {
        const s = students.find(x => x.id === studentId);
        if (!s) return;

        document.getElementById('assignStudentId').value = s.id;
        document.getElementById('assignStudentAvatar').textContent = s.name.split(' ').map(w => w[0]).join('');
        document.getElementById('assignStudentName').textContent = s.name;
        document.getElementById('assignStudentInfo').textContent = `${s.id} · ${s.program} · ${getYearLabel(s.year)}`;
        document.getElementById('assignAdviserSelect').value = '';
        document.getElementById('adviserPreview').style.display = 'none';

        assignModal.show();
    };

    document.getElementById('assignAdviserSelect').addEventListener('change', (e) => {
        const p = professors.find(x => x.id === e.target.value);
        const preview = document.getElementById('adviserPreview');
        if (p) {
            preview.style.display = '';
            document.getElementById('previewAdvAvatar').textContent = p.initials;
            document.getElementById('previewAdvName').textContent = p.name;
            document.getElementById('previewAdvDept').textContent = p.dept;
            document.getElementById('previewAdvCount').textContent = getAdviseeCount(p.id);
        } else {
            preview.style.display = 'none';
        }
    });

    document.getElementById('confirmAssignBtn').addEventListener('click', async () => {
        const sId = document.getElementById('assignStudentId').value;
        const advId = document.getElementById('assignAdviserSelect').value;
        if (!advId) { alert('Please select an adviser.'); return; }

        const s = students.find(x => x.id === sId);
        const prof = professors.find(p => p.id === advId);
        if (s && prof) {
            await supabaseClient
                .from('students')
                .update({ adviser_id: prof.uuid })
                .eq('id', s.uuid);

            s.adviserId = advId;
            s.adviserUuid = prof.uuid;
        }

        assignModal.hide();
        renderEverything();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // MODAL: Reassign / Unassign — Supabase
    // ═══════════════════════════════════════════════════════════════════════
    const reassignModal = new bootstrap.Modal(document.getElementById('reassignModal'));

    window.openReassignModal = function(studentId) {
        const s = students.find(x => x.id === studentId);
        if (!s) return;

        const currentAdv = professors.find(p => p.id === s.adviserId);

        document.getElementById('reassignStudentId').value = s.id;
        document.getElementById('reassignStudentAvatar').textContent = s.name.split(' ').map(w => w[0]).join('');
        document.getElementById('reassignStudentName').textContent = s.name;
        document.getElementById('reassignStudentInfo').textContent = `${s.id} · ${s.program} · ${getYearLabel(s.year)}`;
        document.getElementById('currentAdviserLabel').textContent = currentAdv ? currentAdv.name : 'None';
        document.getElementById('reassignAdviserSelect').value = '';

        reassignModal.show();
    };

    document.getElementById('confirmReassignBtn').addEventListener('click', async () => {
        const sId = document.getElementById('reassignStudentId').value;
        const newAdvId = document.getElementById('reassignAdviserSelect').value;
        if (!newAdvId) { alert('Please select a new adviser.'); return; }

        const s = students.find(x => x.id === sId);
        const prof = professors.find(p => p.id === newAdvId);
        if (s && prof) {
            await supabaseClient
                .from('students')
                .update({ adviser_id: prof.uuid })
                .eq('id', s.uuid);

            s.adviserId = newAdvId;
            s.adviserUuid = prof.uuid;
        }

        reassignModal.hide();
        renderEverything();
    });

    document.getElementById('unassignBtn').addEventListener('click', async () => {
        const sId = document.getElementById('reassignStudentId').value;
        const s = students.find(x => x.id === sId);
        if (s) {
            await supabaseClient
                .from('students')
                .update({ adviser_id: null })
                .eq('id', s.uuid);

            s.adviserId = null;
            s.adviserUuid = null;
        }

        reassignModal.hide();
        renderEverything();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════════════════════════════
    renderEverything();
});
