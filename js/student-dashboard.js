initShared();

(async function () {
    const profile = await requireAuth(['student']);
    if (!profile) return;
    await loadUserProfile();

    const { data: student, error: studentError } = await supabaseClient
        .from('students')
        .select('*')
        .eq('id', profile.id)
        .single();

    if (studentError) console.warn('Student fetch error:', studentError);

    const { data: adviser, error: adviserError } = student?.adviser_id
        ? await supabaseClient
            .from('profiles')
            .select('*, professors(*)')
            .eq('id', student.adviser_id)
            .single()
        : { data: null, error: null };

    if (adviserError) console.warn('Adviser fetch error:', adviserError);

    const { data: records } = await supabaseClient
        .from('academic_records')
        .select('*, courses(*), terms(*)')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false });

    const { data: activeTerm } = await supabaseClient
        .from('terms')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

    const { data: latestForm } = activeTerm
        ? await supabaseClient
            .from('advising_forms')
            .select('*, terms(*)')
            .eq('student_id', profile.id)
            .eq('term_id', activeTerm.id)
            .order('submitted_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : { data: null };

    const failedUnits = student?.failed_units || 0;
    const yearLevel = student?.year_level || 1;
    const program = student?.program || 'N/A';
    const totalTerms = 12;
    const currentTerm = activeTerm ? Math.min((yearLevel - 1) * 3 + 1, totalTerms) : yearLevel;

    const completedRecords = (records || []).filter(r => r.status === 'passed' || (r.grade && r.grade > 0 && r.grade <= 4.0));
    const completedUnits = completedRecords.reduce((sum, r) => sum + (r.courses?.units || 0), 0);
    const totalUnits = 200;

    let cumulativeGpa = 0;
    if (completedRecords.length > 0) {
        const totalWeighted = completedRecords.reduce((sum, r) => sum + (r.grade || 0) * (r.courses?.units || 0), 0);
        const totalUnitsTaken = completedRecords.reduce((sum, r) => sum + (r.courses?.units || 0), 0);
        cumulativeGpa = totalUnitsTaken > 0 ? (totalWeighted / totalUnitsTaken).toFixed(2) : '0.00';
    }

    const greetingEl = document.querySelector('.welcome-banner h2');
    if (greetingEl) {
        const hour = new Date().getHours();
        let greeting = 'Good morning';
        if (hour >= 12 && hour < 18) greeting = 'Good afternoon';
        else if (hour >= 18) greeting = 'Good evening';
        greetingEl.textContent = `${greeting}, ${profile.first_name}!`;
    }
    const bannerP = document.querySelector('.welcome-banner p');
    if (bannerP) bannerP.textContent = `You're on Year ${yearLevel} in the ${program} program. Keep it up — you're on track!`;

    const statValues = document.querySelectorAll('.stat-value');
    const statSubs = document.querySelectorAll('.stat-sub');
    if (statValues[0]) { statValues[0].textContent = completedUnits; statSubs[0].textContent = `of ${totalUnits} required`; }
    if (statValues[1]) { statValues[1].textContent = cumulativeGpa; }
    if (statValues[2]) { statValues[2].textContent = failedUnits; }
    if (statValues[3]) { statValues[3].textContent = yearLevel; statSubs[3].textContent = `Year Level`; }

    // Dynamically update profile dropdown info rows
    const infoValues = document.querySelectorAll('.dropdown-info-value');
    if (infoValues[0]) infoValues[0].textContent = profile.school_id || '—';
    if (infoValues[1]) infoValues[1].textContent = program;
    if (infoValues[2]) infoValues[2].textContent = `Year ${yearLevel} of 4`;

    if (latestForm) {
        const statusContainer = document.querySelector('.advising-status');
        if (statusContainer) {
            const statusMap = { pending: 'Pending Review', approved: 'Approved', rejected: 'Needs Revision', for_revision: 'Needs Revision' };
            const iconMap = { pending: 'bi-hourglass-split', approved: 'bi-check-circle', rejected: 'bi-x-circle', for_revision: 'bi-arrow-repeat' };
            statusContainer.className = `advising-status ${latestForm.status} mb-4`;
            statusContainer.style.opacity = '1';
            statusContainer.querySelector('.status-label').textContent = statusMap[latestForm.status] || latestForm.status;
            statusContainer.querySelector('.status-desc').textContent = latestForm.adviser_remarks || `Your academic advising form was submitted on ${new Date(latestForm.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`;
            statusContainer.querySelector('.status-icon i').className = `bi ${iconMap[latestForm.status] || 'bi-hourglass-split'}`;
        }
    } else {
        const statusContainer = document.querySelector('.advising-status');
        if (statusContainer) {
            statusContainer.className = 'advising-status mb-4';
            statusContainer.style.opacity = '1';
            statusContainer.querySelector('.status-label').textContent = 'No Form Submitted';
            statusContainer.querySelector('.status-desc').textContent = 'You have not yet submitted an advising form for the current term.';
            statusContainer.querySelector('.status-icon i').className = 'bi bi-file-earmark-x';
        }
    }

    const currentRecords = activeTerm ? (records || []).filter(r => r.term_id === activeTerm.id) : [];
    const tbody = document.querySelector('.subjects-table tbody');
    if (tbody) {
        if (currentRecords.length > 0) {
            tbody.innerHTML = currentRecords.map(r => `
                <tr>
                    <td class="course-code">${r.courses?.code || '—'}</td>
                    <td>${r.courses?.title || '—'}</td>
                    <td>${r.courses?.units || '—'}</td>
                    <td><span class="badge-prereq bg-success bg-opacity-10 text-success">Enrolled</span></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--dlsu-gray-400);">No enrolled subjects for this term</td></tr>';
        }
    }

    if (adviser) {
        const advInitials = (adviser.first_name?.[0] || '') + (adviser.last_name?.[0] || '');
        const advName = `${adviser.first_name} ${adviser.last_name}`;
        const advDept = adviser.professors?.department || 'DECEE';
        document.querySelector('.adviser-avatar').textContent = advInitials;
        document.querySelector('.adviser-name').textContent = advName;
        document.querySelector('.adviser-dept').textContent = `${advDept} · ${program}`;
    } else {
        document.querySelector('.adviser-avatar').textContent = '—';
        document.querySelector('.adviser-name').textContent = 'No adviser assigned';
        document.querySelector('.adviser-dept').textContent = program;
    }

    const meterValue = document.querySelector('.meter-value');
    const meterFill = document.querySelector('.meter-fill');
    if (meterValue) meterValue.textContent = `${failedUnits} / 30`;
    if (meterFill) {
        const pct = Math.min((failedUnits / 30) * 100, 100);
        meterFill.style.width = `${pct}%`;
        meterFill.className = `meter-fill ${failedUnits >= 15 ? 'danger' : 'safe'}`;
    }
    if (meterValue) meterValue.style.color = failedUnits >= 15 ? 'var(--dlsu-danger)' : 'var(--dlsu-green)';

    const { data: notifs } = await supabaseClient
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(4);

    const notifContainer = document.querySelector('.card-body-inner');
    if (notifContainer && notifs && notifs.length > 0) {
        notifContainer.innerHTML = notifs.map(n => {
            const timeAgo = getTimeAgo(n.created_at);
            return `<div class="notif-item">
                <div class="notif-dot-indicator ${n.is_read ? 'read' : 'unread'}"></div>
                <div>
                    <div class="notif-text">${n.message}</div>
                    <div class="notif-time">${timeAgo}</div>
                </div>
            </div>`;
        }).join('');
    } else if (notifContainer) {
        notifContainer.innerHTML = '<div class="notif-item"><div class="notif-text" style="color:var(--dlsu-gray-400)">No notifications yet</div></div>';
    }

    window._studentProfile = profile;
    window._studentData = student;
    window._adviserData = adviser;
    window._academicRecords = records;
})();

function getTimeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function downloadBookletPDF() {
    const profile = window._studentProfile;
    const student = window._studentData;
    const adviser = window._adviserData;
    const records = window._academicRecords || [];
    const fullName = profile ? `${profile.first_name} ${profile.last_name}` : 'Student';
    const schoolId = profile?.school_id || '';

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const green = [0, 112, 60];
        const gray = [90, 107, 96];
        let y = 20;

        doc.setFillColor(...green);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('DECEE Academic Advising', 15, 15);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('De La Salle University — Academic Booklet', 15, 22);
        doc.text('Generated: ' + new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), 15, 29);

        y = 45;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Student Information', 15, y);
        y += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const advName = adviser ? `${adviser.first_name} ${adviser.last_name}` : 'N/A';
        const info = [
            ['Name:', fullName],
            ['ID Number:', schoolId],
            ['Program:', student?.program || 'N/A'],
            ['College:', 'Gokongwei College of Engineering'],
            ['Department:', 'DECEE'],
            ['Adviser:', advName],
            ['Year Level:', String(student?.year_level || 'N/A')],
            ['Accumulated Failures:', `${student?.failed_units || 0} units`]
        ];
        info.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...gray);
            doc.text(label, 15, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(value, 55, y);
            y += 5.5;
        });

        y += 5;
        const termMap = {};
        records.forEach(r => {
            const key = r.terms ? `${r.terms.term_name} — AY ${r.terms.academic_year}` : 'Unknown Term';
            if (!termMap[key]) termMap[key] = [];
            termMap[key].push(r);
        });

        Object.entries(termMap).forEach(([termName, termRecords]) => {
            if (y > 250) { doc.addPage(); y = 20; }
            doc.setFillColor(...green);
            doc.rect(15, y - 4, 180, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(termName, 18, y + 1);
            y += 10;

            doc.setTextColor(...gray);
            doc.setFontSize(7);
            doc.text('CODE', 15, y);
            doc.text('COURSE NAME', 45, y);
            doc.text('UNITS', 145, y);
            doc.text('GRADE', 165, y);
            y += 2;
            doc.setDrawColor(200, 200, 200);
            doc.line(15, y, 195, y);
            y += 4;

            doc.setTextColor(0, 0, 0);
            doc.setFontSize(8);
            termRecords.forEach(r => {
                const code = r.courses?.code || '—';
                const name = r.courses?.title || '—';
                const units = String(r.courses?.units || '—');
                const grade = r.grade !== null ? String(r.grade) : '—';
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...green);
                doc.text(code, 15, y);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);
                doc.text(name, 45, y);
                doc.text(units, 150, y);
                if (r.status === 'failed') { doc.setTextColor(192, 57, 43); }
                doc.text(grade, 165, y);
                doc.setTextColor(0, 0, 0);
                y += 5;
            });
            y += 5;
        });

        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(...gray);
            doc.text('AdviSync — DECEE Department, De La Salle University', 15, 290);
            doc.text('Page ' + i + ' of ' + pageCount, 180, 290);
        }

        doc.save(`Academic_Booklet_${fullName.replace(/\s+/g, '_')}_${schoolId}.pdf`);
    };
    document.head.appendChild(script);
}
