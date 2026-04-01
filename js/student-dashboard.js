        // ── Elements ──
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        const overlay = document.getElementById('sidebarOverlay');
        const hamburger = document.getElementById('hamburgerBtn');
        const isMobile = () => window.innerWidth < 992;

        // ── Desktop: hover to expand, main content shifts ──
        sidebar.addEventListener('mouseenter', () => {
            if (!isMobile()) {
                sidebar.classList.add('expanded');
                mainContent.classList.add('shifted');
            }
        });

        sidebar.addEventListener('mouseleave', () => {
            if (!isMobile()) {
                sidebar.classList.remove('expanded');
                mainContent.classList.remove('shifted');
            }
        });

        // ── Mobile: hamburger toggle ──
        hamburger.addEventListener('click', () => {
            sidebar.classList.toggle('expanded');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('expanded');
            overlay.classList.remove('active');
        });

        // ── Profile Dropdown Toggle ──
        const profileWrapper = document.getElementById('profileWrapper');
        const profileToggle = document.getElementById('profileToggle');

        profileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            profileWrapper.classList.toggle('open');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!profileWrapper.contains(e.target)) {
                profileWrapper.classList.remove('open');
            }
        });

        // Close dropdown on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                profileWrapper.classList.remove('open');
            }
        });

        // ── Digital Clock + Date ──
        const clockEl = document.getElementById('topbarClock');
        function updateClock() {
            const now = new Date();
            const h = String(now.getHours()).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            const s = String(now.getSeconds()).padStart(2, '0');
            const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
            const dateStr = now.toLocaleDateString('en-US', options);
            clockEl.textContent = `${dateStr} · ${h}:${m}:${s}`;
        }
        updateClock();
        setInterval(updateClock, 1000);

        // ── Dark Mode Toggle (placeholder) ──
        const darkModeBtn = document.getElementById('darkModeBtn');
        darkModeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const icon = darkModeBtn.querySelector('i');
            if (document.body.classList.contains('dark-mode')) {
                icon.className = 'bi bi-sun-fill';
            } else {
                icon.className = 'bi bi-moon-fill';
            }
        });

        // ── Dynamic Greeting ──
        const greetingEl = document.querySelector('.welcome-banner h2');
        const hour = new Date().getHours();
        let greeting = 'Good morning';
        if (hour >= 12 && hour < 18) greeting = 'Good afternoon';
        else if (hour >= 18) greeting = 'Good evening';
        greetingEl.textContent = `${greeting}, Bianca!`;

        // ── PDF Download ──
        function downloadBookletPDF() {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                const green = [0, 112, 60];
                const gray = [90, 107, 96];
                let y = 20;

                // Header
                doc.setFillColor(...green);
                doc.rect(0, 0, 210, 35, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.text('DECEE Academic Advising', 15, 15);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text('De La Salle University — Academic Booklet', 15, 22);
                doc.text('Generated: ' + new Date().toLocaleDateString('en-US', {month:'long',day:'numeric',year:'numeric'}), 15, 29);

                y = 45;
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text('Student Information', 15, y);
                y += 8;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                const info = [
                    ['Name:', 'Bianca Magsino'], ['ID Number:', '12012345'],
                    ['Program:', 'BS Computer Engineering'], ['College:', 'Gokongwei College of Engineering'],
                    ['Department:', 'DECEE'], ['Adviser:', 'Dr. Roberto Cruz'],
                    ['Current Term:', '8 of 12'], ['Cumulative GPA:', '2.85'],
                    ['Accumulated Failures:', '6 units']
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
                // Term data
                const terms = [
                    { name: 'First Term — AY 2025–2026', gpa: '2.75', courses: [
                        ['LBYCPG2', 'Online Technologies Lab 2', '1', '2.5'],
                        ['CCNETCM', 'Network Computing', '3', '2.0'],
                        ['CCDATRCL', 'Data Structures & Algorithms', '3', '3.0'],
                        ['CALENG0', 'Pre-Calculus', '3', '2.5'],
                        ['ENGMANA', 'Engineering Management', '3', '3.5'],
                        ['GEETHIC', 'Ethics', '3', '3.0'],
                    ]},
                    { name: 'Third Term — AY 2024–2025', gpa: '2.75', courses: [
                        ['CSARCH2', 'Computer Architecture 2', '3', '2.0'],
                        ['CSALGCM', 'Design & Analysis of Algorithms', '3', '2.5'],
                        ['CSELEC1', 'CpE Elective 1', '3', '3.0'],
                        ['GELITER', 'Literature', '3', '3.5'],
                    ]},
                    { name: 'Second Term — AY 2024–2025', gpa: '2.63', courses: [
                        ['CSNETWK', 'Computer Networks', '3', '2.5'],
                        ['CSARCH1', 'Computer Architecture 1', '3', '2.0'],
                        ['CCDSTRU', 'Discrete Structures', '3', '2.5'],
                        ['GEPHIL2', 'Philosophy of the Human Person', '3', '3.5'],
                    ]},
                    { name: 'First Term — AY 2024–2025', gpa: '1.33', courses: [
                        ['CSMCPRO', 'Microprocessors', '3', '0.0 (F)'],
                        ['CSMCPRO', 'Microprocessors (Retake)', '3', '0.0 (F)'],
                        ['CCPROG3', 'Object-Oriented Programming', '3', '2.5'],
                        ['LBYCPG1', 'CpE Laboratory 1', '1', '3.0'],
                        ['GEFILI2', 'Filipino 2', '3', '3.5'],
                    ]},
                ];

                terms.forEach(term => {
                    if (y > 250) { doc.addPage(); y = 20; }
                    doc.setFillColor(...green);
                    doc.rect(15, y - 4, 180, 8, 'F');
                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'bold');
                    doc.text(term.name, 18, y + 1);
                    doc.text('Term GPA: ' + term.gpa, 160, y + 1);
                    y += 10;

                    // Table header
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
                    term.courses.forEach(([code, name, units, grade]) => {
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(...green);
                        doc.text(code, 15, y);
                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(0, 0, 0);
                        doc.text(name, 45, y);
                        doc.text(units, 150, y);
                        if (grade.includes('F')) { doc.setTextColor(192, 57, 43); }
                        doc.text(grade, 165, y);
                        doc.setTextColor(0, 0, 0);
                        y += 5;
                    });
                    y += 5;
                });

                // Footer
                const pageCount = doc.internal.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(7);
                    doc.setTextColor(...gray);
                    doc.text('AdviSync — DECEE Department, De La Salle University', 15, 290);
                    doc.text('Page ' + i + ' of ' + pageCount, 180, 290);
                }

                doc.save('Academic_Booklet_Bianca_Magsino_12012345.pdf');
            };
            document.head.appendChild(script);
        }