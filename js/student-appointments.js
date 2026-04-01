        // Sidebar
        const sidebar = document.getElementById('sidebar'), mainContent = document.getElementById('mainContent'), overlay = document.getElementById('sidebarOverlay'), hamburger = document.getElementById('hamburgerBtn');
        const isMobile = () => window.innerWidth < 992;
        sidebar.addEventListener('mouseenter', () => { if (!isMobile()) { sidebar.classList.add('expanded'); mainContent.classList.add('shifted'); } });
        sidebar.addEventListener('mouseleave', () => { if (!isMobile()) { sidebar.classList.remove('expanded'); mainContent.classList.remove('shifted'); } });
        hamburger.addEventListener('click', () => { sidebar.classList.toggle('expanded'); overlay.classList.toggle('active'); });
        overlay.addEventListener('click', () => { sidebar.classList.remove('expanded'); overlay.classList.remove('active'); });

        // Clock
        const clockEl = document.getElementById('topbarClock');
        function updateClock() { const n = new Date(); clockEl.textContent = n.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}) + ' · ' + String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')+':'+String(n.getSeconds()).padStart(2,'0'); }
        updateClock(); setInterval(updateClock, 1000);

        // Date selection
        function selectDate(el) {
            document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('selected'));
            el.classList.add('selected');
            document.querySelectorAll('.time-slot.selected').forEach(s => s.classList.remove('selected'));
            document.getElementById('bookBtn').disabled = true;
        }

        // Slot selection
        function selectSlot(el) {
            if (el.classList.contains('booked')) return;
            document.querySelectorAll('.time-slot.selected').forEach(s => s.classList.remove('selected'));
            el.classList.add('selected');
            document.getElementById('bookBtn').disabled = false;
        }

        // Book
        function bookAppointment() {
            const date = document.querySelector('.date-chip.selected');
            const slot = document.querySelector('.time-slot.selected');
            if (date && slot) {
                const dayName = date.querySelector('.day-name').textContent;
                const dayMonth = date.querySelector('.day-month').textContent;
                const dayNum = date.querySelector('.day-num').textContent;
                const slotTime = slot.querySelector('.slot-time').textContent;

                slot.classList.remove('selected');
                slot.classList.add('booked');
                slot.querySelector('.slot-status').textContent = 'Booked';
                slot.onclick = null;
                document.getElementById('bookBtn').disabled = true;

                // Add to My Bookings dynamically
                const bookingsContainer = document.querySelector('.section-card:last-of-type');
                const newBooking = document.createElement('div');
                newBooking.className = 'booking-item';
                newBooking.innerHTML = `
                    <div class="booking-left">
                        <div class="booking-date-box"><span class="bdb-month">${dayMonth}</span><span class="bdb-day">${dayNum}</span></div>
                        <div class="booking-info">
                            <div class="bi-title">Advising Meeting — Dr. Roberto Cruz</div>
                            <div class="bi-detail"><i class="bi bi-clock"></i> ${slotTime} · <i class="bi bi-camera-video"></i> Zoom</div>
                        </div>
                    </div>
                    <div class="booking-actions">
                        <span class="booking-status pending">Pending</span>
                        <button class="btn-cancel" onclick="cancelBooking(this)">Cancel</button>
                    </div>
                `;
                bookingsContainer.insertBefore(newBooking, bookingsContainer.querySelector('.booking-item'));

                // Show toast
                const t = document.getElementById('toast');
                document.getElementById('toastMsg').textContent = `Appointment booked for ${dayName}, ${dayMonth} ${dayNum} at ${slotTime}!`;
                t.style.display = 'flex';
                setTimeout(() => t.style.display = 'none', 4000);
            }
        }

        // Cancel
        function cancelBooking(btn) {
            if (confirm('Are you sure you want to cancel this appointment?')) {
                const item = btn.closest('.booking-item');
                item.style.opacity = '0.55';
                item.querySelector('.booking-status').className = 'booking-status cancelled';
                item.querySelector('.booking-status').textContent = 'Cancelled';
                item.querySelector('.bi-title').style.textDecoration = 'line-through';
                item.querySelector('.booking-date-box').style.background = 'var(--dlsu-gray-100)';
                btn.remove();
            }
        }

        // ── Dark Mode Toggle ──
        const darkModeBtn = document.getElementById('darkModeBtn');
        if (darkModeBtn) {
            darkModeBtn.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                const icon = darkModeBtn.querySelector('i');
                icon.className = document.body.classList.contains('dark-mode') ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
            });
        }