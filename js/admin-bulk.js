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
    // TAB 1: CSV DATA UPLOAD
    // ═══════════════════════════════════════════════════════════════════════
    let selectedUploadType = 'students';
    let parsedCsvRows = []; // store parsed CSV data for actual import

    document.querySelectorAll('.upload-type-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.upload-type-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedUploadType = card.dataset.type;
        });
    });

    const dropzone = document.getElementById('csvDropzone');
    const fileInput = document.getElementById('csvFileInput');

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFileUpload(e.target.files[0]);
    });

    function handleFileUpload(file) {
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) { alert('File must be under 5MB.'); return; }
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['csv'].includes(ext)) { alert('Only CSV files are accepted.'); return; }

        // Read and parse CSV
        const reader = new FileReader();
        reader.onload = function(event) {
            const text = event.target.result;
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) { alert('CSV file is empty or missing data rows.'); return; }

            const headers = lines[0].split(',').map(h => h.trim());
            parsedCsvRows = lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.trim());
                const row = {};
                headers.forEach((h, i) => { row[h] = values[i] || ''; });
                return row;
            });

            // Show progress
            dropzone.style.display = 'none';
            const progressArea = document.getElementById('csvProgressArea');
            progressArea.style.display = 'block';
            document.getElementById('csvFileName').textContent = file.name;
            document.getElementById('csvFileSize').textContent = formatFileSize(file.size);

            const bar = document.getElementById('csvProgressBar');
            const status = document.getElementById('csvProgressStatus');
            bar.style.width = '100%';
            status.textContent = 'Processing complete!';
            status.style.color = 'var(--dlsu-green)';
            setTimeout(() => generateCsvPreview(headers, parsedCsvRows), 400);
        };
        reader.readAsText(file);
    }

    document.getElementById('csvRemoveBtn').addEventListener('click', resetUpload);

    function resetUpload() {
        document.getElementById('csvProgressArea').style.display = 'none';
        document.getElementById('csvPreviewArea').style.display = 'none';
        document.getElementById('csvDropzone').style.display = '';
        document.getElementById('csvProgressBar').style.width = '0';
        document.getElementById('csvProgressStatus').textContent = 'Uploading...';
        document.getElementById('csvProgressStatus').style.color = '';
        fileInput.value = '';
        parsedCsvRows = [];
    }

    function generateCsvPreview(headers, rows) {
        const thead = document.getElementById('csvPreviewHead');
        thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}<th class="text-center">Valid</th></tr>`;

        const tbody = document.getElementById('csvPreviewBody');
        tbody.innerHTML = rows.slice(0, 20).map(row => {
            const values = headers.map(h => row[h] || '');
            const isValid = values.every(v => v.length > 0);
            return `<tr class="${!isValid ? 'csv-row-invalid' : ''}">
                ${values.map(cell => `<td>${cell}</td>`).join('')}
                <td class="text-center">
                    ${isValid
                        ? '<i class="bi bi-check-circle-fill" style="color: var(--dlsu-green);"></i>'
                        : '<i class="bi bi-exclamation-circle-fill" style="color: var(--dlsu-danger);"></i>'}
                </td>
            </tr>`;
        }).join('');

        document.getElementById('csvRowCount').textContent = `${rows.length} rows detected`;
        document.getElementById('csvPreviewArea').style.display = 'block';
    }

    // ACTUAL CSV IMPORT TO SUPABASE
    document.getElementById('csvImportBtn').addEventListener('click', async () => {
        if (parsedCsvRows.length === 0) { alert('No data to import.'); return; }

        const btn = document.getElementById('csvImportBtn');
        btn.disabled = true;
        btn.textContent = 'Importing...';

        let successCount = 0;
        let errorCount = 0;

        if (selectedUploadType === 'students') {
            for (const row of parsedCsvRows) {
                const newId = crypto.randomUUID();
                const schoolId = row['Student ID'] || row['student_id'] || '';
                const fullName = row['Full Name'] || row['full_name'] || '';
                const email = row['Email'] || row['email'] || '';
                const program = row['Program'] || row['program'] || 'BSCpE';
                const yearLevel = parseInt(row['Year Level'] || row['year_level'] || '1');

                const [firstName, ...lastParts] = fullName.split(' ');
                const lastName = lastParts.join(' ') || firstName;

                const { error: profileError } = await supabaseClient
                    .from('profiles')
                    .insert({
                        id: newId,
                        role: 'student',
                        school_id: schoolId,
                        first_name: firstName,
                        last_name: lastName,
                        email: email,
                        status: 'active'
                    });

                if (!profileError) {
                    await supabaseClient.from('students').insert({
                        id: newId,
                        program: program,
                        year_level: yearLevel,
                        is_cleared: false,
                        failed_units: 0
                    });
                    successCount++;
                } else {
                    errorCount++;
                    console.warn('Import error:', profileError.message, row);
                }
            }
        } else {
            // Course import
            for (const row of parsedCsvRows) {
                const code = (row['Course Code'] || row['code'] || '').toUpperCase();
                const title = row['Title'] || row['title'] || '';
                const units = parseInt(row['Units'] || row['units'] || '3');
                const term = parseInt(row['Term'] || row['term'] || '1');
                const prereqs = row['Prerequisites'] || row['prerequisites'] || '';
                const program = row['Program'] || row['program'] || 'BSCpE';
                const yearLevel = Math.ceil(term / 3);

                const { data: newCourse, error } = await supabaseClient
                    .from('courses')
                    .insert({ code, title, units, term, year_level: yearLevel, program_code: program })
                    .select()
                    .single();

                if (!error && newCourse) {
                    // Parse prerequisites
                    if (prereqs && prereqs.toLowerCase() !== 'none') {
                        const prereqCodes = prereqs.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
                        const prereqRows = prereqCodes.map(p => ({
                            course_id: newCourse.id,
                            prerequisite_code: p,
                            type: 'hard'
                        }));
                        if (prereqRows.length > 0) {
                            await supabaseClient.from('prerequisites').insert(prereqRows);
                        }
                    }
                    successCount++;
                } else {
                    errorCount++;
                    console.warn('Course import error:', error?.message, row);
                }
            }
        }

        alert(`Import complete!\n✅ ${successCount} records imported successfully.\n${errorCount > 0 ? `❌ ${errorCount} records failed.` : ''}`);
        btn.disabled = false;
        btn.textContent = 'Import Data';
        resetUpload();
    });

    document.getElementById('csvDownloadTemplate').addEventListener('click', () => {
        const studentHeaders = ['Student ID', 'Full Name', 'Email', 'Program', 'Year Level'];
        const courseHeaders = ['Course Code', 'Title', 'Units', 'Term', 'Program', 'Prerequisites'];
        const headers = selectedUploadType === 'students' ? studentHeaders : courseHeaders;
        const csvContent = headers.join(',') + '\n';
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedUploadType}_template.csv`;
        a.click();
        URL.revokeObjectURL(url);
    });

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TAB 2: MASS CLEARANCE — Supabase
    // ═══════════════════════════════════════════════════════════════════════
    let clearanceStudents = [];

    async function fetchClearanceStudents() {
        try {
            // Fetch student profiles separately (same pattern as admin-advising.js)
            const { data: profileData, error: profileError } = await supabaseClient
                .from('profiles')
                .select('id, school_id, first_name, last_name, status')
                .eq('role', 'student')
                .eq('status', 'active');

            if (profileError) {
                console.error('Error fetching student profiles for clearance:', profileError);
                return;
            }

            // Fetch student details
            const { data: studentData, error: studentError } = await supabaseClient
                .from('students')
                .select('id, program, year_level, is_cleared, failed_units');

            if (studentError) {
                console.error('Error fetching student details for clearance:', studentError);
                return;
            }

            // Build lookup map
            const studentMap = {};
            (studentData || []).forEach(s => { studentMap[s.id] = s; });

            // Merge profile + student data
            clearanceStudents = (profileData || []).map(p => {
                const d = studentMap[p.id] || {};
                return {
                    uuid: p.id,
                    id: p.school_id,
                    name: `${p.first_name} ${p.last_name}`,
                    program: d.program || 'BSCpE',
                    year: d.year_level || 1,
                    cleared: d.is_cleared || false,
                    failedUnits: Number(d.failed_units || 0)
                };
            });

            console.log(`[Bulk] Loaded ${clearanceStudents.length} active students for clearance`);
        } catch (e) {
            console.error('fetchClearanceStudents failed:', e);
        }
    }

    await fetchClearanceStudents();

    function updateClearanceStats() {
        const total = clearanceStudents.length;
        const cleared = clearanceStudents.filter(s => s.cleared).length;
        const notCleared = total - cleared;
        const atRisk = clearanceStudents.filter(s => s.failedUnits >= 15).length;
        document.getElementById('clearTotalStudents').textContent = total.toLocaleString();
        document.getElementById('clearCleared').textContent = cleared.toLocaleString();
        document.getElementById('clearNotCleared').textContent = notCleared.toLocaleString();
        document.getElementById('clearAtRisk').textContent = atRisk.toLocaleString();
    }

    function updateClearanceCount() {
        const prog = document.getElementById('clearProgram').value;
        const yr = document.getElementById('clearYear').value;
        const status = document.getElementById('clearStatus').value;

        const matched = clearanceStudents.filter(s => {
            const matchProg = prog === 'all' || s.program === prog;
            const matchYr = yr === 'all' || s.year === parseInt(yr);
            const matchStatus = status === 'all' || (status === 'not-cleared' && !s.cleared);
            return matchProg && matchYr && matchStatus;
        });
        document.getElementById('clearMatchCount').textContent = matched.length;
    }

    updateClearanceStats();
    updateClearanceCount();

    document.getElementById('clearProgram').addEventListener('change', updateClearanceCount);
    document.getElementById('clearYear').addEventListener('change', updateClearanceCount);
    document.getElementById('clearStatus').addEventListener('change', updateClearanceCount);

    document.getElementById('clearApplyBtn').addEventListener('click', () => {
        const count = document.getElementById('clearMatchCount').textContent;
        document.getElementById('clearanceModalText').textContent = `This will clear ${count} students for enrollment. This action cannot be undone.`;
        new bootstrap.Modal(document.getElementById('clearanceModal')).show();
    });

    document.getElementById('confirmClearBtn').addEventListener('click', async () => {
        const prog = document.getElementById('clearProgram').value;
        const yr = document.getElementById('clearYear').value;
        const status = document.getElementById('clearStatus').value;

        const toClear = clearanceStudents.filter(s => {
            const matchProg = prog === 'all' || s.program === prog;
            const matchYr = yr === 'all' || s.year === parseInt(yr);
            const matchStatus = status === 'all' || (status === 'not-cleared' && !s.cleared);
            return matchProg && matchYr && matchStatus && !s.cleared;
        });

        // Batch update in Supabase
        const uuids = toClear.map(s => s.uuid);
        if (uuids.length > 0) {
            for (const uuid of uuids) {
                await supabaseClient
                    .from('students')
                    .update({
                        is_cleared: true,
                        cleared_at: new Date().toISOString(),
                        cleared_by: currentUser.id
                    })
                    .eq('id', uuid);
            }
        }

        // Log the clearance action
        await supabaseClient.from('clearance_log').insert({
            admin_id: currentUser.id,
            program_filter: prog === 'all' ? null : prog,
            year_filter: yr === 'all' ? null : parseInt(yr),
            students_cleared: uuids.length
        });

        // Update local state
        toClear.forEach(s => { s.cleared = true; });

        addClearanceLog(uuids.length, prog, yr);
        bootstrap.Modal.getInstance(document.getElementById('clearanceModal')).hide();
        updateClearanceStats();
        updateClearanceCount();
    });

    // Clearance logs from Supabase
    let clearanceLogs = [];

    async function fetchClearanceLogs() {
        const { data, error } = await supabaseClient
            .from('clearance_log')
            .select('*, profiles!clearance_log_admin_id_fkey(first_name, last_name)')
            .order('created_at', { ascending: false })
            .limit(10);

        if (!error && data) {
            clearanceLogs = data.map(log => {
                const adminName = log.profiles ? `${log.profiles.first_name} ${log.profiles.last_name}` : 'System Admin';
                const date = new Date(log.created_at);
                const options = { month: 'short', day: 'numeric', year: 'numeric' };
                const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                const progLabel = log.program_filter || 'All Programs';
                const yrLabel = log.year_filter ? `${log.year_filter}${log.year_filter === 1 ? 'st' : log.year_filter === 2 ? 'nd' : log.year_filter === 3 ? 'rd' : 'th'} Year` : 'All Year';
                return {
                    date: `${date.toLocaleDateString('en-US', options)} · ${time}`,
                    action: `Cleared ${log.students_cleared} ${progLabel} ${yrLabel} students`,
                    admin: adminName
                };
            });
        }
    }

    await fetchClearanceLogs();

    function addClearanceLog(count, prog, yr) {
        const now = new Date();
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const date = `${now.toLocaleDateString('en-US', options)} · ${time}`;
        const progLabel = prog === 'all' ? 'All Programs' : prog;
        const yrLabel = yr === 'all' ? 'All Year' : `${yr}${yr === '1' ? 'st' : yr === '2' ? 'nd' : yr === '3' ? 'rd' : 'th'} Year`;
        clearanceLogs.unshift({ date, action: `Cleared ${count} ${progLabel} ${yrLabel} students`, admin: `${currentUser.first_name} ${currentUser.last_name}` });
        renderClearanceLogs();
    }

    function renderClearanceLogs() {
        const container = document.getElementById('clearanceLog');
        if (clearanceLogs.length === 0) {
            container.innerHTML = `<div class="text-center py-3" style="color:var(--dlsu-gray-400); font-size:0.82rem;">No clearance actions yet.</div>`;
            return;
        }
        container.innerHTML = clearanceLogs.slice(0, 5).map(log => `
            <div class="clearance-log-item">
                <div class="clearance-log-dot"></div>
                <div class="clearance-log-content">
                    <div class="clearance-log-action">${log.action}</div>
                    <div class="clearance-log-meta"><i class="bi bi-person me-1"></i>${log.admin} · ${log.date}</div>
                </div>
            </div>
        `).join('');
    }

    document.getElementById('clearance-tab').addEventListener('shown.bs.tab', () => {
        renderClearanceLogs();
        updateClearanceCount();
    });
    renderClearanceLogs();

    // ═══════════════════════════════════════════════════════════════════════
    // TAB 3: TARGETED MASS EMAIL — Supabase
    // ═══════════════════════════════════════════════════════════════════════
    // Fetch dynamic recipient counts from base tables
    let recipientCounts = {};
    try {
        // Count active students by querying base tables
        const totalStudents = clearanceStudents.length;
        const bscpeStudents = clearanceStudents.filter(s => s.program === 'BSCpE').length;
        const bseceStudents = clearanceStudents.filter(s => s.program === 'BSECE').length;
        const atRiskStudents = clearanceStudents.filter(s => s.failedUnits >= 15).length;
        const notClearedStudents = clearanceStudents.filter(s => !s.cleared).length;

        // Count advisers
        const { count: adviserCount } = await supabaseClient
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'adviser')
            .eq('status', 'active');

        // Count unassigned students
        const { count: unassignedCount } = await supabaseClient
            .from('students')
            .select('*', { count: 'exact', head: true })
            .is('adviser_id', null);

        // Count students by year level
        const year1 = clearanceStudents.filter(s => s.year === 1).length;
        const year2 = clearanceStudents.filter(s => s.year === 2).length;
        const year3 = clearanceStudents.filter(s => s.year === 3).length;
        const year4 = clearanceStudents.filter(s => s.year === 4).length;

        recipientCounts = {
            'all-professors': adviserCount || 0,
            'all-students': totalStudents,
            'bscpe-students': bscpeStudents,
            'bsece-students': bseceStudents,
            'at-risk': atRiskStudents,
            'not-cleared': notClearedStudents,
            'unassigned': unassignedCount || 0,
            'year-1': year1,
            'year-2': year2,
            'year-3': year3,
            'year-4': year4,
        };
    } catch (e) {
        console.warn('Recipient counts calculation failed:', e);
        recipientCounts = {
            'all-professors': 0, 'all-students': 0, 'bscpe-students': 0,
            'bsece-students': 0, 'at-risk': 0, 'not-cleared': 0, 'unassigned': 0,
            'year-1': 0, 'year-2': 0, 'year-3': 0, 'year-4': 0,
        };
    }

    const emailTemplates = {
        'advising-deadline': {
            subject: 'Advising Deadline Reminder – AY 2025-2026 Term 3',
            body: `Dear Students,\n\nThis is a reminder that the deadline for academic advising consultation is approaching.\n\nPlease ensure you schedule and complete your advising session with your assigned faculty adviser before the deadline on April 15, 2026.\n\nFailure to do so may result in a hold on your enrollment for the next term.\n\nBest regards,\nDECEE Department\nDe La Salle University`
        },
        'clearance-notice': {
            subject: 'Enrollment Clearance Update – Action Required',
            body: `Dear Student,\n\nThis is to inform you that your enrollment clearance status has been updated.\n\nPlease log in to the AdviSync portal to review your current clearance status and address any outstanding requirements.\n\nIf you have questions, please contact the DECEE Department office.\n\nBest regards,\nDECEE Department\nDe La Salle University`
        },
        'at-risk-warning': {
            subject: 'Academic Standing Notice – Immediate Attention Required',
            body: `Dear Student,\n\nOur records indicate that you have accumulated a significant number of failed units, placing your academic standing at risk.\n\nYou are strongly encouraged to:\n1. Schedule an immediate consultation with your faculty adviser.\n2. Review your study plan for the upcoming term.\n3. Consider enrolling in fewer units to improve your academic performance.\n\nThe DECEE Department is here to support you. Please do not hesitate to reach out.\n\nBest regards,\nDECEE Department\nDe La Salle University`
        },
        'study-plan-reminder': {
            subject: 'Study Plan Review – Pending Review Reminder',
            body: `Dear Professor,\n\nThis is a reminder that you have pending study plans awaiting your review and approval.\n\nPlease log in to the AdviSync portal to review the submitted study plans from your advisees at your earliest convenience.\n\nTimely review ensures students can proceed with enrollment without delays.\n\nThank you for your dedication.\n\nBest regards,\nDECEE Department\nDe La Salle University`
        }
    };

    document.getElementById('emailRecipient').addEventListener('change', (e) => {
        const val = e.target.value;
        const count = recipientCounts[val] || 0;
        document.getElementById('emailRecipientCount').innerHTML = `<i class="bi bi-people me-1"></i> <strong>${count}</strong> recipient${count !== 1 ? 's' : ''} selected`;
    });

    document.querySelectorAll('.email-template-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const tmpl = emailTemplates[chip.dataset.template];
            if (tmpl) {
                document.getElementById('emailSubject').value = tmpl.subject;
                document.getElementById('emailBody').value = tmpl.body;
            }
            document.querySelectorAll('.email-template-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        });
    });

    document.getElementById('emailPreviewBtn').addEventListener('click', () => {
        const subject = document.getElementById('emailSubject').value;
        const body = document.getElementById('emailBody').value;
        if (!subject || !body) { alert('Please fill in the subject and message body before previewing.'); return; }
        const recipient = document.getElementById('emailRecipient');
        const group = recipient.options[recipient.selectedIndex]?.text || 'No group';
        alert(`── Email Preview ──\n\nTo: ${group}\nSubject: ${subject}\n\n${body}`);
    });

    document.getElementById('emailSendBtn').addEventListener('click', async () => {
        const recipient = document.getElementById('emailRecipient').value;
        const subject = document.getElementById('emailSubject').value;
        const body = document.getElementById('emailBody').value;
        if (!recipient || !subject || !body) { alert('Please select a recipient group and fill in all fields.'); return; }

        const count = recipientCounts[recipient] || 0;

        // Log email to Supabase
        await supabaseClient.from('email_log').insert({
            sender_id: currentUser.id,
            recipient_group: recipient,
            recipient_count: count,
            subject: subject,
            body: body,
            status: 'delivered'
        });

        document.getElementById('emailSentText').textContent = `Your email has been sent to ${count} recipient${count !== 1 ? 's' : ''}.`;
        new bootstrap.Modal(document.getElementById('emailSentModal')).show();

        addEmailLog(recipient, subject, count);

        document.getElementById('emailSubject').value = '';
        document.getElementById('emailBody').value = '';
        document.getElementById('emailRecipient').selectedIndex = 0;
        document.getElementById('emailRecipientCount').innerHTML = '<i class="bi bi-people me-1"></i> No group selected';
        document.querySelectorAll('.email-template-chip').forEach(c => c.classList.remove('active'));
    });

    // Email logs from Supabase
    let emailLogs = [];

    async function fetchEmailLogs() {
        const { data, error } = await supabaseClient
            .from('email_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (!error && data) {
            const groupMap = {
                'all-professors': 'All Professors',
                'all-students': 'All Students',
                'bscpe-students': 'BSCpE Students',
                'bsece-students': 'BSECE Students',
                'at-risk': 'At-Risk Students',
                'not-cleared': 'Not Cleared Students',
                'unassigned': 'Unassigned Students',
                'year-1': '1st Year Students',
                'year-2': '2nd Year Students',
                'year-3': '3rd Year Students',
                'year-4': '4th Year Students',
            };
            emailLogs = data.map(log => {
                const date = new Date(log.created_at);
                const options = { month: 'short', day: 'numeric', year: 'numeric' };
                const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                return {
                    date: `${date.toLocaleDateString('en-US', options)} · ${time}`,
                    subject: log.subject,
                    group: groupMap[log.recipient_group] || log.recipient_group,
                    count: log.recipient_count,
                    status: log.status
                };
            });
        }
    }

    await fetchEmailLogs();

    function addEmailLog(recipientKey, subject, count) {
        const now = new Date();
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const groupMap = {
            'all-professors': 'All Professors',
            'all-students': 'All Students',
            'bscpe-students': 'BSCpE Students',
            'bsece-students': 'BSECE Students',
            'at-risk': 'At-Risk Students',
            'not-cleared': 'Not Cleared Students',
            'unassigned': 'Unassigned Students',
            'year-1': '1st Year Students',
            'year-2': '2nd Year Students',
            'year-3': '3rd Year Students',
            'year-4': '4th Year Students',
        };
        emailLogs.unshift({ date: `${now.toLocaleDateString('en-US', options)} · ${time}`, subject, group: groupMap[recipientKey] || recipientKey, count, status: 'delivered' });
        renderEmailLogs();
    }

    function renderEmailLogs() {
        const container = document.getElementById('emailHistory');
        if (emailLogs.length === 0) {
            container.innerHTML = `<div class="text-center py-3" style="color:var(--dlsu-gray-400); font-size:0.82rem;">No emails sent yet.</div>`;
            return;
        }
        container.innerHTML = emailLogs.slice(0, 5).map(log => `
            <div class="email-log-item">
                <div class="d-flex justify-content-between align-items-start mb-1">
                    <div class="email-log-subject">${log.subject}</div>
                    <span class="email-log-status">${log.status}</span>
                </div>
                <div class="email-log-meta">
                    <span><i class="bi bi-people me-1"></i>${log.group} (${log.count})</span>
                    <span><i class="bi bi-clock me-1"></i>${log.date}</span>
                </div>
            </div>
        `).join('');
    }

    document.getElementById('email-tab').addEventListener('shown.bs.tab', renderEmailLogs);
    renderEmailLogs();
});
