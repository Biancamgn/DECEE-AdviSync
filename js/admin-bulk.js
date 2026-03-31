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
    // TAB 1: CSV DATA UPLOAD
    // ═══════════════════════════════════════════════════════════════════════
    let selectedUploadType = 'students';

    // Upload type card selection
    document.querySelectorAll('.upload-type-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.upload-type-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedUploadType = card.dataset.type;
        });
    });

    // Drag & Drop
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
        if (file.size > maxSize) {
            alert('File must be under 5MB.');
            return;
        }
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['csv', 'xlsx'].includes(ext)) {
            alert('Only CSV and XLSX files are accepted.');
            return;
        }

        // Show progress area
        dropzone.style.display = 'none';
        const progressArea = document.getElementById('csvProgressArea');
        progressArea.style.display = 'block';
        document.getElementById('csvFileName').textContent = file.name;
        document.getElementById('csvFileSize').textContent = formatFileSize(file.size);

        // Simulate progress
        const bar = document.getElementById('csvProgressBar');
        const status = document.getElementById('csvProgressStatus');
        let pct = 0;
        const interval = setInterval(() => {
            pct += Math.random() * 25 + 5;
            if (pct >= 100) {
                pct = 100;
                clearInterval(interval);
                status.textContent = 'Processing complete!';
                status.style.color = 'var(--dlsu-green)';
                setTimeout(() => generateCsvPreview(), 400);
            } else {
                status.textContent = `Uploading... ${Math.round(pct)}%`;
            }
            bar.style.width = pct + '%';
        }, 200);
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
    }

    // Mock CSV preview data
    const mockStudentRows = [
        ['12220001', 'Juan Dela Cruz', 'juan_delacruz@dlsu.edu.ph', 'BSCpE', '1'],
        ['12220002', 'Maria Santos', 'maria_santos@dlsu.edu.ph', 'BSECE', '2'],
        ['12220003', 'Pedro Garcia', 'pedro_garcia@dlsu.edu.ph', 'BSCpE', '3'],
        ['12220004', 'Anna Reyes', 'anna_reyes@dlsu.edu.ph', 'BSECE', '4'],
        ['12220005', 'Carlo Mendoza', 'carlo_mendoza@dlsu.edu.ph', 'BSCpE', '1'],
        ['12220006', 'Sophie Torres', 'sophie_torres@dlsu.edu.ph', 'BSECE', '2'],
        ['12220007', 'Miguel Rivera', 'miguel_rivera@dlsu.edu.ph', 'BSCpE', '3'],
        ['12220008', 'Isabelle Lim', 'isabelle_lim@dlsu.edu.ph', 'BSCpE', '4'],
    ];
    const studentHeaders = ['Student ID', 'Full Name', 'Email', 'Program', 'Year Level'];

    const mockCourseRows = [
        ['LBYCPD1', 'Computer Programming 1', '3', '1', 'None'],
        ['LBYCPD2', 'Computer Programming 2', '3', '2', 'LBYCPD1'],
        ['LBYCALC', 'Calculus 1', '3', '1', 'None'],
        ['LBYPHY1', 'Physics 1', '3', '1', 'LBYCALC'],
        ['LBYCPD3', 'Data Structures & Algorithms', '3', '3', 'LBYCPD2'],
        ['LBYCAL2', 'Calculus 2', '3', '2', 'LBYCALC'],
        ['LBYCIRK', 'Circuit Analysis', '3', '4', 'LBYPHY1'],
        ['LBYCPG2', 'Computer Organization', '3', '5', 'LBYCPD2'],
    ];
    const courseHeaders = ['Course Code', 'Title', 'Units', 'Term', 'Prerequisites'];

    function generateCsvPreview() {
        const headers = selectedUploadType === 'students' ? studentHeaders : courseHeaders;
        const rows = selectedUploadType === 'students' ? mockStudentRows : mockCourseRows;

        const thead = document.getElementById('csvPreviewHead');
        thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}<th class="text-center">Valid</th></tr>`;

        const tbody = document.getElementById('csvPreviewBody');
        tbody.innerHTML = rows.map(row => {
            const isValid = Math.random() > 0.15;
            return `<tr class="${!isValid ? 'csv-row-invalid' : ''}">
                ${row.map(cell => `<td>${cell}</td>`).join('')}
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

    document.getElementById('csvImportBtn').addEventListener('click', () => {
        alert('Import complete! In the production version, this data would be saved to Supabase.');
        resetUpload();
    });

    document.getElementById('csvDownloadTemplate').addEventListener('click', () => {
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
    // TAB 2: MASS CLEARANCE
    // ═══════════════════════════════════════════════════════════════════════
    const clearanceStudents = [];
    // Generate mock students
    const programs = ['BSCpE', 'BSECE'];
    const firstNames = ['Juan', 'Maria', 'Pedro', 'Anna', 'Carlo', 'Sophie', 'Miguel', 'Isabelle', 'Jose', 'Teresa', 'Leo', 'Grace', 'Nathan', 'Ella', 'Rico', 'Linda', 'David', 'Carmen', 'Roberto', 'Jessica'];
    const lastNames = ['Dela Cruz', 'Santos', 'Garcia', 'Reyes', 'Mendoza', 'Torres', 'Rivera', 'Lim', 'Cruz', 'Diaz', 'Castillo', 'Bautista', 'Flores', 'Pineda', 'Santiago', 'Aquino', 'Villanueva', 'Fernandez', 'Sison', 'Yap'];

    for (let i = 0; i < 312; i++) {
        clearanceStudents.push({
            id: `1221${String(i).padStart(4, '0')}`,
            name: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
            program: programs[i % 2],
            year: (i % 4) + 1,
            cleared: false,
        });
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

    document.getElementById('clearProgram').addEventListener('change', updateClearanceCount);
    document.getElementById('clearYear').addEventListener('change', updateClearanceCount);
    document.getElementById('clearStatus').addEventListener('change', updateClearanceCount);

    // Show confirmation modal
    document.getElementById('clearApplyBtn').addEventListener('click', () => {
        const count = document.getElementById('clearMatchCount').textContent;
        document.getElementById('clearanceModalText').textContent = `This will clear ${count} students for enrollment. This action cannot be undone.`;
        new bootstrap.Modal(document.getElementById('clearanceModal')).show();
    });

    // Confirm clearance
    document.getElementById('confirmClearBtn').addEventListener('click', () => {
        const prog = document.getElementById('clearProgram').value;
        const yr = document.getElementById('clearYear').value;
        const status = document.getElementById('clearStatus').value;
        let count = 0;

        clearanceStudents.forEach(s => {
            const matchProg = prog === 'all' || s.program === prog;
            const matchYr = yr === 'all' || s.year === parseInt(yr);
            const matchStatus = status === 'all' || (status === 'not-cleared' && !s.cleared);
            if (matchProg && matchYr && matchStatus && !s.cleared) {
                s.cleared = true;
                count++;
            }
        });

        // Update stats
        const cleared = clearanceStudents.filter(s => s.cleared).length;
        const notCleared = clearanceStudents.length - cleared;
        document.getElementById('clearCleared').textContent = (938 + cleared).toLocaleString();
        document.getElementById('clearNotCleared').textContent = notCleared.toLocaleString();

        // Add to log
        addClearanceLog(count, prog, yr);

        bootstrap.Modal.getInstance(document.getElementById('clearanceModal')).hide();
        updateClearanceCount();
    });

    const clearanceLogs = [
        { date: 'Mar 28, 2026 · 14:32', action: 'Cleared 85 BSCpE 4th Year students', admin: 'System Admin' },
        { date: 'Mar 25, 2026 · 09:15', action: 'Cleared 120 BSECE All Year students', admin: 'System Admin' },
        { date: 'Mar 20, 2026 · 11:45', action: 'Cleared 200 All Programs 1st Year students', admin: 'System Admin' },
    ];

    function addClearanceLog(count, prog, yr) {
        const now = new Date();
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const date = `${now.toLocaleDateString('en-US', options)} · ${time}`;
        const progLabel = prog === 'all' ? 'All Programs' : prog;
        const yrLabel = yr === 'all' ? 'All Year' : `${yr}${yr === '1' ? 'st' : yr === '2' ? 'nd' : yr === '3' ? 'rd' : 'th'} Year`;
        clearanceLogs.unshift({ date, action: `Cleared ${count} ${progLabel} ${yrLabel} students`, admin: 'System Admin' });
        renderClearanceLogs();
    }

    function renderClearanceLogs() {
        const container = document.getElementById('clearanceLog');
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
    // TAB 3: TARGETED MASS EMAIL
    // ═══════════════════════════════════════════════════════════════════════
    const recipientCounts = {
        'all-professors': 6,
        'all-students': 1250,
        'bscpe-students': 650,
        'bsece-students': 600,
        'at-risk': 70,
        'not-cleared': 312,
        'unassigned': 8,
        'year-1': 380,
        'year-2': 330,
        'year-3': 300,
        'year-4': 240,
    };

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
        if (!subject || !body) {
            alert('Please fill in the subject and message body before previewing.');
            return;
        }
        const recipient = document.getElementById('emailRecipient');
        const group = recipient.options[recipient.selectedIndex]?.text || 'No group';
        alert(`── Email Preview ──\n\nTo: ${group}\nSubject: ${subject}\n\n${body}`);
    });

    document.getElementById('emailSendBtn').addEventListener('click', () => {
        const recipient = document.getElementById('emailRecipient').value;
        const subject = document.getElementById('emailSubject').value;
        const body = document.getElementById('emailBody').value;
        if (!recipient || !subject || !body) {
            alert('Please select a recipient group and fill in all fields.');
            return;
        }
        const count = recipientCounts[recipient] || 0;
        document.getElementById('emailSentText').textContent = `Your email has been sent to ${count} recipient${count !== 1 ? 's' : ''}.`;
        new bootstrap.Modal(document.getElementById('emailSentModal')).show();
        addEmailLog(recipient, subject, count);
        // Reset
        document.getElementById('emailSubject').value = '';
        document.getElementById('emailBody').value = '';
        document.getElementById('emailRecipient').selectedIndex = 0;
        document.getElementById('emailRecipientCount').innerHTML = '<i class="bi bi-people me-1"></i> No group selected';
        document.querySelectorAll('.email-template-chip').forEach(c => c.classList.remove('active'));
    });

    const emailLogs = [
        { date: 'Mar 30, 2026 · 10:22', subject: 'Advising Deadline Reminder – Term 3', group: 'All Students', count: 1250, status: 'delivered' },
        { date: 'Mar 28, 2026 · 15:45', subject: 'Study Plan Review Reminder', group: 'All Professors', count: 6, status: 'delivered' },
        { date: 'Mar 25, 2026 · 09:30', subject: 'Academic Standing Warning', group: 'At-Risk Students', count: 70, status: 'delivered' },
        { date: 'Mar 22, 2026 · 11:10', subject: 'Enrollment Clearance Notice', group: 'Not Cleared Students', count: 312, status: 'delivered' },
    ];

    function addEmailLog(recipientKey, subject, count) {
        const now = new Date();
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const date = `${now.toLocaleDateString('en-US', options)} · ${time}`;
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
        emailLogs.unshift({ date, subject, group: groupMap[recipientKey] || recipientKey, count, status: 'delivered' });
        renderEmailLogs();
    }

    function renderEmailLogs() {
        const container = document.getElementById('emailHistory');
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
