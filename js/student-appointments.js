        initShared();

        let _currentProfile = null;
        let _studentData = null;

        (async function () {
            const profile = await requireAuth(['student']);
            if (!profile) return;
            _currentProfile = profile;
            await loadUserProfile();

            const { data: student } = await supabaseClient
                .from('students')
                .select('*')
                .eq('id', profile.id)
                .single();
            _studentData = student;

            if (student?.adviser_id) {
                const { data: adviser } = await supabaseClient
                    .from('profiles')
                    .select('*, professors(*)')
                    .eq('id', student.adviser_id)
                    .single();

                if (adviser) {
                    const advInitials = (adviser.first_name?.[0] || '') + (adviser.last_name?.[0] || '');
                    const advBanner = document.querySelector('.adviser-banner');
                    if (advBanner) {
                        advBanner.querySelector('.adv-avatar').textContent = advInitials;
                        advBanner.querySelector('.adv-name').textContent = `${adviser.first_name} ${adviser.last_name}`;
                        advBanner.querySelector('.adv-dept').textContent = `${adviser.professors?.department || 'DECEE'} · ${student.program || 'CpE Program'} · Academic Adviser`;
                    }
                }
            }

            await loadBookings();
        })();

        async function loadBookings() {
            const { data: bookings, error } = await supabaseClient
                .from('appointments')
                .select('*')
                .eq('student_id', _currentProfile.id)
                .order('appointment_date', { ascending: false });

            if (error) { console.error(error); return; }

            const container = document.getElementById('bookingsContainer');
            if (container && bookings && bookings.length > 0) {
                container.innerHTML = bookings.map(b => {
                    const d = new Date(b.appointment_date);
                    const month = d.toLocaleDateString('en-US', { month: 'short' });
                    const day = d.getDate();
                    const time = b.appointment_time || '';
                    const statusClass = b.status || 'pending';
                    const statusLabel = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);
                    return `<div class="booking-item" data-id="${b.id}">
                        <div class="booking-left">
                            <div class="booking-date-box"><span class="bdb-month">${month}</span><span class="bdb-day">${day}</span></div>
                            <div class="booking-info">
                                <div class="bi-title">${b.purpose || 'Advising Meeting'}</div>
                                <div class="bi-detail"><i class="bi bi-clock"></i> ${time} · <i class="bi bi-camera-video"></i> ${b.mode || 'TBD'}</div>
                            </div>
                        </div>
                        <div class="booking-actions">
                            <span class="booking-status ${statusClass}">${statusLabel}</span>
                            ${statusClass === 'pending' ? `<button class="btn-cancel" onclick="cancelBooking('${b.id}', this)">Cancel</button>` : ''}
                        </div>
                    </div>`;
                }).join('');
            } else if (container) {
                container.innerHTML = '<div style="text-align:center;color:var(--dlsu-gray-400);padding:2rem;">No bookings yet</div>';
            }
        }

        function selectDate(el) {
            document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('selected'));
            el.classList.add('selected');
            document.querySelectorAll('.time-slot.selected').forEach(s => s.classList.remove('selected'));
            document.getElementById('bookBtn').disabled = true;
        }

        function selectSlot(el) {
            if (el.classList.contains('booked')) return;
            document.querySelectorAll('.time-slot.selected').forEach(s => s.classList.remove('selected'));
            el.classList.add('selected');
            document.getElementById('bookBtn').disabled = false;
        }

        async function bookAppointment() {
            const date = document.querySelector('.date-chip.selected');
            const slot = document.querySelector('.time-slot.selected');
            if (date && slot && _currentProfile && _studentData) {
                const dateVal = date.dataset.date;
                const slotTime = slot.querySelector('.slot-time').textContent;
                const dayName = date.querySelector('.day-name').textContent;
                const dayMonth = date.querySelector('.day-month').textContent;
                const dayNum = date.querySelector('.day-num').textContent;

                const { error } = await supabaseClient
                    .from('appointments')
                    .insert({
                        student_id: _currentProfile.id,
                        adviser_id: _studentData.adviser_id,
                        appointment_date: dateVal,
                        appointment_time: slotTime,
                        purpose: 'Advising Meeting',
                        status: 'pending',
                        mode: 'Zoom'
                    });

                if (error) { alert('Failed to book appointment. Please try again.'); console.error(error); return; }

                slot.classList.remove('selected');
                slot.classList.add('booked');
                slot.querySelector('.slot-status').textContent = 'Booked';
                slot.onclick = null;
                document.getElementById('bookBtn').disabled = true;

                await loadBookings();

                const t = document.getElementById('toast');
                document.getElementById('toastMsg').textContent = `Appointment booked for ${dayName}, ${dayMonth} ${dayNum} at ${slotTime}!`;
                t.style.display = 'flex';
                setTimeout(() => t.style.display = 'none', 4000);
            }
        }

        async function cancelBooking(id, btn) {
            if (!confirm('Are you sure you want to cancel this appointment?')) return;

            const { error } = await supabaseClient
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('id', id);

            if (error) { alert('Failed to cancel appointment.'); console.error(error); return; }
            await loadBookings();
        }
