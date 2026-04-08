/**
 * File:        admin-advising.js
 * Description: Admin Advising page: manages adviser-to-student assignment across the DECEE department, including unassigned student listing and bulk assignment.
 * Author:      Renjovil Joseph V. Lascano
 * Date:        2026-04-05
 */

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

    const OVERLOAD_THRESHOLD = 50;

    let advisers = [];
    let students = [];

    async function fetchAdvisers() {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*, professors(*)')
            .eq('role', 'adviser')
            .eq('status', 'active')
            .order('last_name');

        if (!error && data) {
            advisers = data.map(p => ({
                id: p.school_id,
                uuid: p.id,
                name: `${p.first_name} ${p.last_name}`,
                dept: p.professors?.department || 'DECEE',
                maxAdvisees: p.professors?.max_advisees || 50,
                initials: (p.first_name ? p.first_name[0] : '') + (p.last_name ? p.last_name[0] : '')
            }));
        }
    }

    async function fetchStudents() {
        // First get student profiles
        const { data: studentProfiles, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('role', 'student')
            .eq('status', 'active')
            .order('school_id');

        if (profileError || !studentProfiles) {
            console.error('Error fetching student profiles:', profileError);
            return;
        }

        // Then get student details for these profiles
        const studentIds = studentProfiles.map(p => p.id);
        let { data: studentDetails, error: detailsError } = await supabaseClient
            .from('students')
            .select('*')
            .in('id', studentIds);

        if (detailsError) {
            console.warn('Error fetching student details:', detailsError);
            studentDetails = [];
        }

        if (!studentDetails || studentDetails.length === 0) {
            console.warn('No student details found for student IDs.');
        }

        console.debug('Fetched students:', studentProfiles.length, 'profiles,', studentDetails?.length || 0, 'details');

        // Also get adviser assignments from advisees table for accurate mapping
        const { data: adviseeRows } = await supabaseClient
            .from('advisees')
            .select('student_id, adviser_id');

        const adviseeMap = {};
        (adviseeRows || []).forEach(r => { adviseeMap[r.student_id] = r.adviser_id; });

        // Merge the data - deduplicate by profile ID
        const seen = new Set();
        students = [];
        studentProfiles.forEach(profile => {
            if (seen.has(profile.id)) return;
            seen.add(profile.id);
            const details = studentDetails?.find(s => s.id === profile.id) || {};
            const adviserUuid = adviseeMap[profile.id] || details.adviser_id || null;

            students.push({
                id: profile.school_id,
                uuid: profile.id,
                name: `${profile.first_name} ${profile.last_name}`,
                program: details.program || 'BSCpE',
                year: details.year_level || 1,
                adviserUuid: adviserUuid,
                adviserId: null // will be resolved after professors load
            });
        });
    }

    await Promise.all([fetchAdvisers(), fetchStudents()]);

    // Resolve adviser school_id from UUID
    students.forEach(s => {
        if (s.adviserUuid) {
            const adv = advisers.find(p => p.uuid === s.adviserUuid);
            s.adviserId = adv ? adv.id : null;
        }
    });

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

    function renderStats() {
        const assigned = students.filter(s => s.adviserId).length;
        const unassigned = students.filter(s => !s.adviserId).length;
        const overloaded = advisers.filter(p => getAdviseeCount(p.id) > OVERLOAD_THRESHOLD).length;

        document.getElementById('totalAdvisers').textContent = advisers.length;
        document.getElementById('assignedStudents').textContent = assigned;
        document.getElementById('unassignedStudents').textContent = unassigned;
        document.getElementById('overloadedAdvisers').textContent = overloaded;
    }

    const workloadGrid = document.getElementById('workloadGrid');
    const facultySearch = document.getElementById('facultySearch');
    const workloadFilter = document.getElementById('workloadFilter');

    function renderWorkload() {
        const q = facultySearch.value.toLowerCase();
        const wf = workloadFilter.value;

        const filtered = advisers.filter(p => {
            const count = getAdviseeCount(p.id);
            const status = getWorkloadStatus(count);
            const matchSearch = !q || p.name.toLowerCase().includes(q);
            const matchFilter = wf === 'all' || status === wf;
            return matchSearch && matchFilter;
        });

        if (filtered.length === 0) {
            workloadGrid.innerHTML = `<div class="text-center py-4" style="color:var(--dlsu-gray-400); font-size:0.82rem;"><i class="bi bi-inbox fs-4 d-block mb-2"></i>No advisers match the filter</div>`;
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
                const adv = advisers.find(p => p.id === s.adviserId);
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

        const adv = advisers.find(p => p.id === advId);
        if (!adv) return;

        const studentUuids = [];
        selectedStudents.forEach(sId => {
            const s = students.find(x => x.id === sId);
            if (s) studentUuids.push(s.uuid);
        });

        for (const uuid of studentUuids) {
            await supabaseClient
                .from('students')
                .update({ adviser_id: adv.uuid })
                .eq('id', uuid);

            // Sync advisees table: remove old row, insert new
            await supabaseClient
                .from('advisees')
                .delete()
                .eq('student_id', uuid);
            await supabaseClient
                .from('advisees')
                .insert({ adviser_id: adv.uuid, student_id: uuid });

            // Migrate existing advising forms to new adviser
            await supabaseClient
                .from('advising_forms')
                .update({ adviser_id: adv.uuid })
                .eq('student_id', uuid);
        }

        selectedStudents.forEach(sId => {
            const s = students.find(x => x.id === sId);
            if (s) {
                s.adviserId = advId;
                s.adviserUuid = adv.uuid;
            }
        });

        selectedStudents.clear();
        document.getElementById('selectAllUnassigned').checked = false;
        updateBulkBar();
        renderEverything();
    });

    function populateAdviserDropdowns() {
        const options = advisers.map(p => {
            const count = getAdviseeCount(p.id);
            const status = getWorkloadStatus(count);
            const warn = status === 'overloaded' ? ' ⚠' : '';
            return `<option value="${p.id}">${p.name} (${count}/${p.maxAdvisees}${warn})</option>`;
        }).join('');

        document.getElementById('bulkAdviserSelect').innerHTML = `<option value="">Choose adviser...</option>` + options;
        document.getElementById('assignAdviserSelect').innerHTML = `<option value="">Choose an adviser...</option>` + options;
        document.getElementById('reassignAdviserSelect').innerHTML = `<option value="">Choose a new adviser...</option>` + options;
    }

    // MODAL: Assign Single — Supabase
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
        const p = advisers.find(x => x.id === e.target.value);
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
        const adv = advisers.find(p => p.id === advId);
        if (s && adv) {
            await supabaseClient
                .from('students')
                .update({ adviser_id: adv.uuid })
                .eq('id', s.uuid);

            // Sync advisees table: remove old row, insert new
            await supabaseClient
                .from('advisees')
                .delete()
                .eq('student_id', s.uuid);
            await supabaseClient
                .from('advisees')
                .insert({ adviser_id: adv.uuid, student_id: s.uuid });

            // Migrate existing advising forms to new adviser
            await supabaseClient
                .from('advising_forms')
                .update({ adviser_id: adv.uuid })
                .eq('student_id', s.uuid);

            s.adviserId = advId;
            s.adviserUuid = adv.uuid;
        }

        assignModal.hide();
        renderEverything();
    });

    // MODAL: Reassign / Unassign — Supabase
    const reassignModal = new bootstrap.Modal(document.getElementById('reassignModal'));

    window.openReassignModal = function(studentId) {
        const s = students.find(x => x.id === studentId);
        if (!s) return;

        const currentAdv = advisers.find(p => p.id === s.adviserId);

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
        const adv = advisers.find(p => p.id === newAdvId);
        if (s && adv) {
            await supabaseClient
                .from('students')
                .update({ adviser_id: adv.uuid })
                .eq('id', s.uuid);

            // Sync advisees table: remove old row, insert new
            await supabaseClient
                .from('advisees')
                .delete()
                .eq('student_id', s.uuid);
            await supabaseClient
                .from('advisees')
                .insert({ adviser_id: adv.uuid, student_id: s.uuid });

            // Migrate existing advising forms to new adviser
            await supabaseClient
                .from('advising_forms')
                .update({ adviser_id: adv.uuid })
                .eq('student_id', s.uuid);

            s.adviserId = newAdvId;
            s.adviserUuid = adv.uuid;
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

            // Sync advisees table: remove old row
            await supabaseClient
                .from('advisees')
                .delete()
                .eq('student_id', s.uuid);

            // Clear adviser from existing advising forms
            await supabaseClient
                .from('advising_forms')
                .update({ adviser_id: null })
                .eq('student_id', s.uuid);

            s.adviserId = null;
            s.adviserUuid = null;
        }

        reassignModal.hide();
        renderEverything();
    });

    renderEverything();
});
