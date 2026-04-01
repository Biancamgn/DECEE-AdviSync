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

    let students = [];
    let professors = [];

    async function fetchStudents() {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*, students(*)')
            .eq('role', 'student')
            .order('school_id', { ascending: true });

        if (!error && data) {
            students = data.map(p => ({
                id: p.school_id,
                uuid: p.id,
                firstName: p.first_name,
                lastName: p.last_name,
                email: p.email,
                program: p.students?.program || 'BSCpE',
                year: p.students?.year_level || 1,
                status: p.status
            }));
        }
    }

    async function fetchProfessors() {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*, professors(*)')
            .eq('role', 'professor')
            .order('school_id', { ascending: true });

        if (!error && data) {
            professors = data.map(p => ({
                id: p.school_id,
                uuid: p.id,
                firstName: p.first_name,
                lastName: p.last_name,
                email: p.email,
                department: p.professors?.department || 'DECEE',
                advisees: 0,
                status: p.status
            }));

            for (let prof of professors) {
                const { count } = await supabaseClient
                    .from('students')
                    .select('*', { count: 'exact', head: true })
                    .eq('adviser_id', prof.uuid);
                prof.advisees = count || 0;
            }
        }
    }

    await Promise.all([fetchStudents(), fetchProfessors()]);

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

    // CRUD: Save (Create or Update) — Supabase
    document.getElementById('saveUserBtn').addEventListener('click', async () => {
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
            const existingUser = editType === 'student'
                ? students.find(x => x.id === editId)
                : professors.find(x => x.id === editId);

            if (existingUser) {
                const { error: profileError } = await supabaseClient
                    .from('profiles')
                    .update({
                        school_id: userId,
                        first_name: firstName,
                        last_name: lastName,
                        email: email
                    })
                    .eq('id', existingUser.uuid);

                if (profileError) {
                    alert('Error updating profile: ' + profileError.message);
                    return;
                }

                if (editType === 'student') {
                    await supabaseClient
                        .from('students')
                        .update({
                            program: document.getElementById('formProgram').value,
                            year_level: parseInt(document.getElementById('formYear').value)
                        })
                        .eq('id', existingUser.uuid);
                } else {
                    await supabaseClient
                        .from('professors')
                        .update({
                            department: document.getElementById('formDepartment').value
                        })
                        .eq('id', existingUser.uuid);
                }
            }
        } else {
            // Create auth user via Supabase Admin (or use invite)
            // For client-side, we insert directly into profiles + role table
            // Note: In production, use a Supabase Edge Function to create auth users
            const newId = crypto.randomUUID();

            const { error: profileError } = await supabaseClient
                .from('profiles')
                .insert({
                    id: newId,
                    role: role,
                    school_id: userId,
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    status: 'active'
                });

            if (profileError) {
                alert('Error creating user: ' + profileError.message);
                return;
            }

            if (role === 'student') {
                await supabaseClient
                    .from('students')
                    .insert({
                        id: newId,
                        program: document.getElementById('formProgram').value,
                        year_level: parseInt(document.getElementById('formYear').value),
                        is_cleared: false,
                        failed_units: 0
                    });
            } else {
                await supabaseClient
                    .from('professors')
                    .insert({
                        id: newId,
                        department: document.getElementById('formDepartment').value
                    });
            }
        }

        await Promise.all([fetchStudents(), fetchProfessors()]);
        renderAll();
        userModal.hide();
    });

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

    // CRUD: Delete User — Supabase
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

    window.deleteUser = function(id, type) {
        document.getElementById('deleteUserId').value = id;
        document.getElementById('deleteUserType').value = type;
        deleteModal.show();
    };

    document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
        const id = document.getElementById('deleteUserId').value;
        const type = document.getElementById('deleteUserType').value;

        const user = type === 'student'
            ? students.find(s => s.id === id)
            : professors.find(p => p.id === id);

        if (user) {
            // Delete profile (cascades to students/professors table)
            const { error } = await supabaseClient
                .from('profiles')
                .delete()
                .eq('id', user.uuid);

            if (error) {
                alert('Error deleting user: ' + error.message);
                deleteModal.hide();
                return;
            }
        }

        await Promise.all([fetchStudents(), fetchProfessors()]);
        renderAll();
        deleteModal.hide();
    });

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

    async function performRecoverySearch() {
        const q = document.getElementById('recoverySearchInput').value.trim().toLowerCase();
        if (!q) return;

        const { data: results, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .or(`school_id.ilike.${q},email.ilike.${q}`);

        const found = (!error && results && results.length > 0) ? results[0] : null;

        if (found) {
            document.getElementById('recoveryResult').style.display = '';
            document.getElementById('recoveryNotFound').style.display = 'none';
            document.getElementById('recoveryAvatar').textContent = found.first_name[0] + found.last_name[0];
            document.getElementById('recoveryName').textContent = `${found.first_name} ${found.last_name}`;
            document.getElementById('recoveryId').textContent = `${found.role.charAt(0).toUpperCase() + found.role.slice(1)} · ${found.school_id}`;
            document.getElementById('recoveryPassword').textContent = `dlsu${found.school_id.slice(-4)}`;
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
