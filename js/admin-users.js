document.addEventListener('DOMContentLoaded', () => {

    // ═══════════════════════════════════════════════════════════════════════
    // SHARED UI: Sidebar, Dark Mode, Clock, Profile (same as admin-dashboard)
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
    // MOCK DATA
    // ═══════════════════════════════════════════════════════════════════════
    let students = [
        { id: '12210001', firstName: 'Bianca',  lastName: 'Garcia',    email: 'bianca_garcia@dlsu.edu.ph',    program: 'BSCpE', year: 3, status: 'active' },
        { id: '12210002', firstName: 'Carlos',  lastName: 'Mendoza',   email: 'carlos_mendoza@dlsu.edu.ph',   program: 'BSECE', year: 2, status: 'active' },
        { id: '12210003', firstName: 'Diana',   lastName: 'Reyes',     email: 'diana_reyes@dlsu.edu.ph',      program: 'BSCpE', year: 4, status: 'active' },
        { id: '12210004', firstName: 'Eduardo', lastName: 'Santos',    email: 'eduardo_santos@dlsu.edu.ph',   program: 'BSECE', year: 1, status: 'inactive' },
        { id: '12210005', firstName: 'Fatima',  lastName: 'Cruz',      email: 'fatima_cruz@dlsu.edu.ph',      program: 'BSCpE', year: 2, status: 'active' },
        { id: '12210006', firstName: 'Gabriel', lastName: 'Villanueva',email: 'gabriel_villanueva@dlsu.edu.ph',program: 'BSECE', year: 3, status: 'active' },
        { id: '12210007', firstName: 'Hannah',  lastName: 'Tan',       email: 'hannah_tan@dlsu.edu.ph',       program: 'BSCpE', year: 1, status: 'active' },
        { id: '12210008', firstName: 'Ivan',    lastName: 'Lim',       email: 'ivan_lim@dlsu.edu.ph',         program: 'BSECE', year: 4, status: 'active' },
    ];

    let professors = [
        { id: 'FAC001', firstName: 'Jane',  lastName: 'Smith',    email: 'jane.smith@dlsu.edu.ph',    department: 'DECEE', advisees: 50, status: 'active' },
        { id: 'FAC002', firstName: 'John',  lastName: 'Doe',      email: 'john.doe@dlsu.edu.ph',      department: 'DECEE', advisees: 60, status: 'active' },
        { id: 'FAC003', firstName: 'Alan',  lastName: 'Turing',   email: 'alan.turing@dlsu.edu.ph',   department: 'DECEE', advisees: 50, status: 'active' },
        { id: 'FAC004', firstName: 'Ada',   lastName: 'Lovelace', email: 'ada.lovelace@dlsu.edu.ph',  department: 'DECEE', advisees: 40, status: 'inactive' },
        { id: 'FAC005', firstName: 'Grace', lastName: 'Hopper',   email: 'grace.hopper@dlsu.edu.ph',  department: 'DECEE', advisees: 50, status: 'active' },
    ];

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER TABLES
    // ═══════════════════════════════════════════════════════════════════════
    const studentsBody = document.getElementById('studentsBody');
    const professorsBody = document.getElementById('professorsBody');
    const searchInput = document.getElementById('searchInput');
    const programFilter = document.getElementById('programFilter');

    function getYearLabel(y) {
        const labels = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };
        return labels[y] || y;
    }

    function statusBadge(status) {
        if (status === 'active') return `<span class="user-status-badge active"><i class="bi bi-check-circle-fill me-1"></i>Active</span>`;
        return `<span class="user-status-badge inactive"><i class="bi bi-dash-circle me-1"></i>Inactive</span>`;
    }

    function actionButtons(id, type) {
        return `
            <div class="d-flex justify-content-end gap-1">
                <button class="action-btn edit" title="Edit" onclick="editUser('${id}', '${type}')"><i class="bi bi-pencil-square"></i></button>
                <button class="action-btn delete" title="Delete" onclick="deleteUser('${id}', '${type}')"><i class="bi bi-trash3"></i></button>
            </div>
        `;
    }

    function renderStudents() {
        const query = searchInput.value.toLowerCase();
        const prog = programFilter.value;

        const filtered = students.filter(s => {
            const matchSearch = !query || s.firstName.toLowerCase().includes(query) || s.lastName.toLowerCase().includes(query) || s.id.includes(query) || s.email.toLowerCase().includes(query);
            const matchProg = prog === 'all' || s.program === prog;
            return matchSearch && matchProg;
        });

        studentsBody.innerHTML = filtered.length === 0
            ? `<tr><td colspan="7" class="text-center py-4" style="color: var(--dlsu-gray-400); font-size:0.82rem;"><i class="bi bi-inbox fs-4 d-block mb-2"></i>No students found</td></tr>`
            : filtered.map(s => `
                <tr>
                    <td class="prof-name">${s.id}</td>
                    <td>${s.firstName} ${s.lastName}</td>
                    <td style="color: var(--dlsu-gray-400);">${s.email}</td>
                    <td><span class="badge-program">${s.program}</span></td>
                    <td>${getYearLabel(s.year)}</td>
                    <td>${statusBadge(s.status)}</td>
                    <td>${actionButtons(s.id, 'student')}</td>
                </tr>
            `).join('');

        document.getElementById('studentCount').textContent = students.length;
    }

    function renderProfessors() {
        const query = searchInput.value.toLowerCase();

        const filtered = professors.filter(p => {
            return !query || p.firstName.toLowerCase().includes(query) || p.lastName.toLowerCase().includes(query) || p.id.toLowerCase().includes(query) || p.email.toLowerCase().includes(query);
        });

        professorsBody.innerHTML = filtered.length === 0
            ? `<tr><td colspan="7" class="text-center py-4" style="color: var(--dlsu-gray-400); font-size:0.82rem;"><i class="bi bi-inbox fs-4 d-block mb-2"></i>No professors found</td></tr>`
            : filtered.map(p => `
                <tr>
                    <td class="prof-name">${p.id}</td>
                    <td>${p.firstName} ${p.lastName}</td>
                    <td style="color: var(--dlsu-gray-400);">${p.email}</td>
                    <td><span class="badge-program">${p.department}</span></td>
                    <td>${p.advisees}</td>
                    <td>${statusBadge(p.status)}</td>
                    <td>${actionButtons(p.id, 'professor')}</td>
                </tr>
            `).join('');

        document.getElementById('professorCount').textContent = professors.length;
    }

    function renderAll() { renderStudents(); renderProfessors(); }
    renderAll();

    searchInput.addEventListener('input', renderAll);
    programFilter.addEventListener('change', renderAll);

    // ═══════════════════════════════════════════════════════════════════════
    // FORM: Role Toggle (show/hide student vs professor fields)
    // ═══════════════════════════════════════════════════════════════════════
    const formRole = document.getElementById('formRole');
    const studentFields = document.getElementById('studentFields');
    const professorFields = document.getElementById('professorFields');
    const formIdLabel = document.getElementById('formIdLabel');

    formRole.addEventListener('change', () => {
        if (formRole.value === 'student') {
            studentFields.style.display = '';
            professorFields.style.display = 'none';
            formIdLabel.textContent = 'Student ID';
        } else {
            studentFields.style.display = 'none';
            professorFields.style.display = '';
            formIdLabel.textContent = 'Faculty ID';
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // CRUD: Add User
    // ═══════════════════════════════════════════════════════════════════════
    const userModal = new bootstrap.Modal(document.getElementById('userModal'));

    document.getElementById('addUserBtn').addEventListener('click', () => {
        document.getElementById('userModalLabel').textContent = 'Add New User';
        document.getElementById('userForm').reset();
        document.getElementById('editUserId').value = '';
        document.getElementById('editUserType').value = '';
        formRole.value = 'student';
        formRole.dispatchEvent(new Event('change'));
        formRole.disabled = false;
        userModal.show();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // CRUD: Save (Create or Update)
    // ═══════════════════════════════════════════════════════════════════════
    document.getElementById('saveUserBtn').addEventListener('click', () => {
        const editId = document.getElementById('editUserId').value;
        const editType = document.getElementById('editUserType').value;
        const role = formRole.value;
        const userId = document.getElementById('formUserId').value.trim();
        const firstName = document.getElementById('formFirstName').value.trim();
        const lastName = document.getElementById('formLastName').value.trim();
        const email = document.getElementById('formEmail').value.trim();

        if (!userId || !firstName || !lastName || !email) {
            alert('Please fill in all required fields.');
            return;
        }

        if (editId) {
            // UPDATE
            if (editType === 'student') {
                const s = students.find(x => x.id === editId);
                if (s) {
                    s.id = userId; s.firstName = firstName; s.lastName = lastName; s.email = email;
                    s.program = document.getElementById('formProgram').value;
                    s.year = parseInt(document.getElementById('formYear').value);
                }
            } else {
                const p = professors.find(x => x.id === editId);
                if (p) {
                    p.id = userId; p.firstName = firstName; p.lastName = lastName; p.email = email;
                    p.department = document.getElementById('formDepartment').value;
                }
            }
        } else {
            // CREATE
            if (role === 'student') {
                students.push({
                    id: userId, firstName, lastName, email,
                    program: document.getElementById('formProgram').value,
                    year: parseInt(document.getElementById('formYear').value),
                    status: 'active'
                });
            } else {
                professors.push({
                    id: userId, firstName, lastName, email,
                    department: document.getElementById('formDepartment').value,
                    advisees: 0, status: 'active'
                });
            }
        }

        renderAll();
        userModal.hide();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // CRUD: Edit User (global function for onclick)
    // ═══════════════════════════════════════════════════════════════════════
    window.editUser = function(id, type) {
        document.getElementById('userModalLabel').textContent = 'Edit User';
        document.getElementById('editUserId').value = id;
        document.getElementById('editUserType').value = type;

        if (type === 'student') {
            const s = students.find(x => x.id === id);
            if (!s) return;
            formRole.value = 'student';
            formRole.dispatchEvent(new Event('change'));
            formRole.disabled = true;
            document.getElementById('formUserId').value = s.id;
            document.getElementById('formFirstName').value = s.firstName;
            document.getElementById('formLastName').value = s.lastName;
            document.getElementById('formEmail').value = s.email;
            document.getElementById('formProgram').value = s.program;
            document.getElementById('formYear').value = s.year;
        } else {
            const p = professors.find(x => x.id === id);
            if (!p) return;
            formRole.value = 'professor';
            formRole.dispatchEvent(new Event('change'));
            formRole.disabled = true;
            document.getElementById('formUserId').value = p.id;
            document.getElementById('formFirstName').value = p.firstName;
            document.getElementById('formLastName').value = p.lastName;
            document.getElementById('formEmail').value = p.email;
            document.getElementById('formDepartment').value = p.department;
        }

        userModal.show();
    };

    // ═══════════════════════════════════════════════════════════════════════
    // CRUD: Delete User
    // ═══════════════════════════════════════════════════════════════════════
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

    window.deleteUser = function(id, type) {
        document.getElementById('deleteUserId').value = id;
        document.getElementById('deleteUserType').value = type;
        deleteModal.show();
    };

    document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
        const id = document.getElementById('deleteUserId').value;
        const type = document.getElementById('deleteUserType').value;

        if (type === 'student') {
            students = students.filter(s => s.id !== id);
        } else {
            professors = professors.filter(p => p.id !== id);
        }

        renderAll();
        deleteModal.hide();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // ACCOUNT RECOVERY
    // ═══════════════════════════════════════════════════════════════════════
    const recoveryModal = new bootstrap.Modal(document.getElementById('recoveryModal'));

    document.getElementById('resetPasswordBtn').addEventListener('click', () => {
        document.getElementById('recoverySearchInput').value = '';
        document.getElementById('recoveryResult').style.display = 'none';
        document.getElementById('recoveryNotFound').style.display = 'none';
        recoveryModal.show();
    });

    document.getElementById('recoverySearchBtn').addEventListener('click', performRecoverySearch);
    document.getElementById('recoverySearchInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') performRecoverySearch();
    });

    function performRecoverySearch() {
        const q = document.getElementById('recoverySearchInput').value.trim().toLowerCase();
        if (!q) return;

        const allUsers = [
            ...students.map(s => ({ ...s, type: 'Student' })),
            ...professors.map(p => ({ ...p, type: 'Professor' }))
        ];

        const found = allUsers.find(u => u.id.toLowerCase() === q || u.email.toLowerCase() === q);

        if (found) {
            document.getElementById('recoveryResult').style.display = '';
            document.getElementById('recoveryNotFound').style.display = 'none';
            document.getElementById('recoveryAvatar').textContent = found.firstName[0] + found.lastName[0];
            document.getElementById('recoveryName').textContent = `${found.firstName} ${found.lastName}`;
            document.getElementById('recoveryId').textContent = `${found.type} · ${found.id}`;
            // Mock default password: "dlsu" + last 4 digits of ID
            document.getElementById('recoveryPassword').textContent = `dlsu${found.id.slice(-4)}`;
        } else {
            document.getElementById('recoveryResult').style.display = 'none';
            document.getElementById('recoveryNotFound').style.display = '';
        }
    }

    document.getElementById('copyPasswordBtn').addEventListener('click', () => {
        const pw = document.getElementById('recoveryPassword').textContent;
        navigator.clipboard.writeText(pw).then(() => {
            const btn = document.getElementById('copyPasswordBtn');
            btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Copied!';
            setTimeout(() => { btn.innerHTML = '<i class="bi bi-clipboard me-1"></i>Copy'; }, 2000);
        });
    });

    document.getElementById('resetToDefaultBtn').addEventListener('click', () => {
        const btn = document.getElementById('resetToDefaultBtn');
        btn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Password Reset Successfully!';
        btn.style.background = 'var(--dlsu-green-light)';
        btn.style.color = 'var(--dlsu-green)';
        setTimeout(() => {
            btn.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i> Reset to Default Password';
            btn.style.background = '#fef7e0';
            btn.style.color = 'var(--dlsu-warning)';
        }, 2500);
    });
});
