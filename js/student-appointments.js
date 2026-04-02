        initShared();

        let _currentProfile = null;
        let _studentData = null;
        let _adviserSlots = [];
        let _selectedSlotId = null;

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

                await loadAdviserSlots();
            } else {
                document.getElementById('dateBar').innerHTML = '<div style="padding:1rem;color:var(--dlsu-gray-400);font-size:0.82rem;width:100%;text-align:center;"><i class="bi bi-exclamation-circle"></i> No adviser assigned. Please contact your department.</div>';
            }

            await loadBookings();
        })();

        // ── Load adviser's available slots ──

        async function loadAdviserSlots() {
            const { data: slots, error } = await supabaseClient
                .from('availability_slots')
                .select('*')
                .eq('adviser_id', _studentData.adviser_id)
                .eq('is_booked', false)
                .gte('slot_date', new Date().toISOString().split('T')[0])
                .order('slot_date', { ascending: true })
                .order('start_time', { ascending: true });

            if (error) { console.error('Error loading slots:', error); return; }

            _adviserSlots = slots || [];
            renderDateChips();
        }

        function renderDateChips() {
            const dateBar = document.getElementById('dateBar');
            if (!dateBar) return;

            // Get unique dates
            const uniqueDates = [...new Set(_adviserSlots.map(s => s.slot_date))];

            if (uniqueDates.length === 0) {
                dateBar.innerHTML = '<div style="padding:1rem;color:var(--dlsu-gray-400);font-size:0.82rem;width:100%;text-align:center;"><i class="bi bi-calendar-x" style="font-size:1.5rem;display:block;margin-bottom:0.5rem;opacity:0.3;"></i>No available slots from your adviser at the moment.</div>';
                document.getElementById('slotsGrid').innerHTML = '';
                return;
            }

            dateBar.innerHTML = uniqueDates.map(dateStr => {
                const d = new Date(dateStr + 'T00:00');
                const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNum = d.getDate();
                const dayMonth = d.toLocaleDateString('en-US', { month: 'short' });
                const slotCount = _adviserSlots.filter(s => s.slot_date === dateStr).length;
                return `<div class="date-chip" data-date="${dateStr}" onclick="selectDate(this)">
                    <span class="day-name">${dayName}</span>
                    <span class="day-num">${dayNum}</span>
                    <span class="day-month">${dayMonth}</span>
                    <span class="slot-count">${slotCount} slot${slotCount !== 1 ? 's' : ''}</span>
                </div>`;
            }).join('');

            // Auto-select first date
            const firstChip = dateBar.querySelector('.date-chip');
            if (firstChip) {
                firstChip.classList.add('selected');
                renderSlotsForDate(firstChip.dataset.date);
            }
        }

        function selectDate(el) {
            document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('selected'));
            el.classList.add('selected');
            _selectedSlotId = null;
            document.getElementById('bookBtn').disabled = true;
            document.getElementById('purposeGroup').style.display = 'none';
            renderSlotsForDate(el.dataset.date);
        }

        function renderSlotsForDate(dateStr) {
            const grid = document.getElementById('slotsGrid');
            if (!grid) return;

            const daySlots = _adviserSlots.filter(s => s.slot_date === dateStr);

            if (daySlots.length === 0) {
                grid.innerHTML = '<div class="no-slots"><i class="bi bi-calendar-x"></i> No available slots for this date</div>';
                return;
            }

            grid.innerHTML = daySlots.map(s => {
                const fmtTime = t => {
                    const [h, m] = t.split(':');
                    const hr = parseInt(h);
                    return ((hr % 12) || 12) + ':' + m + (hr >= 12 ? ' PM' : ' AM');
                };
                const icon = s.slot_type === 'zoom' ? 'camera-video' : 'building';
                const typeLabel = s.slot_type === 'zoom' ? 'Zoom' : 'In Person';

                return `<div class="time-slot" data-slot-id="${s.id}" onclick="selectSlot(this)">
                    <div class="slot-time">${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}</div>
                    <div class="slot-status"><i class="bi bi-${icon}" style="font-size:0.6rem;"></i> ${typeLabel}</div>
                </div>`;
            }).join('');
        }

        function selectSlot(el) {
            if (el.classList.contains('booked')) return;
            document.querySelectorAll('.time-slot.selected').forEach(s => s.classList.remove('selected'));
            el.classList.add('selected');
            _selectedSlotId = el.dataset.slotId;
            document.getElementById('bookBtn').disabled = false;
            document.getElementById('purposeGroup').style.display = 'block';
        }

        // ── Book appointment ──

        async function bookAppointment() {
            if (!_selectedSlotId) return;
            if (!_currentProfile) { alert('Not authenticated. Please log in again.'); return; }
            if (!_studentData || !_studentData.adviser_id) { alert('No adviser assigned.'); return; }

            const slot = _adviserSlots.find(s => s.id === _selectedSlotId);
            if (!slot) { alert('Slot no longer available.'); return; }

            const purpose = document.getElementById('purposeInput')?.value?.trim() || 'Advising Meeting';

            // Build appointment_date as TIMESTAMPTZ from slot_date + start_time
            const appointmentDate = `${slot.slot_date}T${slot.start_time}`;

            // Insert appointment
            const { data: apptData, error: apptError } = await supabaseClient
                .from('appointments')
                .insert({
                    student_id: _currentProfile.id,
                    adviser_id: _studentData.adviser_id,
                    appointment_date: appointmentDate,
                    purpose: purpose,
                    status: 'confirmed'
                })
                .select()
                .single();

            if (apptError) { alert('Failed to book appointment: ' + apptError.message); console.error(apptError); return; }

            // Mark slot as booked
            const { error: slotError } = await supabaseClient
                .from('availability_slots')
                .update({
                    is_booked: true,
                    booked_by: _currentProfile.id,
                    appointment_id: apptData.id
                })
                .eq('id', _selectedSlotId);

            if (slotError) { console.error('Slot update error:', slotError); }

            // Reset UI
            _selectedSlotId = null;
            document.getElementById('bookBtn').disabled = true;
            document.getElementById('purposeGroup').style.display = 'none';
            if (document.getElementById('purposeInput')) document.getElementById('purposeInput').value = '';

            // Reload data
            await Promise.all([loadAdviserSlots(), loadBookings()]);

            // Toast
            const fmtTime = t => {
                const [h, m] = t.split(':');
                const hr = parseInt(h);
                return ((hr % 12) || 12) + ':' + m + (hr >= 12 ? ' PM' : ' AM');
            };
            const d = new Date(slot.slot_date + 'T00:00');
            const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const t = document.getElementById('toast');
            if (t) {
                document.getElementById('toastMsg').textContent = `Appointment booked for ${dateLabel} at ${fmtTime(slot.start_time)}!`;
                t.style.display = 'flex';
                setTimeout(() => t.style.display = 'none', 4000);
            }
        }

        // ── My Bookings ──

        async function loadBookings() {
            const { data: bookings, error } = await supabaseClient
                .from('appointments')
                .select('*')
                .eq('student_id', _currentProfile.id)
                .order('appointment_date', { ascending: false });

            if (error) { console.error(error); return; }

            // Also get adviser name
            let adviserName = 'Your Adviser';
            if (_studentData?.adviser_id) {
                const { data: adv } = await supabaseClient
                    .from('profiles')
                    .select('first_name, last_name')
                    .eq('id', _studentData.adviser_id)
                    .single();
                if (adv) adviserName = `${adv.first_name} ${adv.last_name}`;
            }

            // Get slot info for each booking
            let slotMap = {};
            if (bookings && bookings.length > 0) {
                const apptIds = bookings.map(b => b.id);
                const { data: slots } = await supabaseClient
                    .from('availability_slots')
                    .select('appointment_id, slot_type, start_time, end_time')
                    .in('appointment_id', apptIds);
                if (slots) {
                    slots.forEach(s => { slotMap[s.appointment_id] = s; });
                }
            }

            const container = document.getElementById('bookingsContainer');
            if (!container) return;

            if (!bookings || bookings.length === 0) {
                container.innerHTML = '<div style="text-align:center;color:var(--dlsu-gray-400);padding:2rem;"><i class="bi bi-calendar-x" style="font-size:2rem;display:block;margin-bottom:0.5rem;opacity:0.3;"></i>No bookings yet. Select a slot above to book.</div>';
                return;
            }

            container.innerHTML = bookings.map(b => {
                const d = new Date(b.appointment_date);
                const month = d.toLocaleDateString('en-US', { month: 'short' });
                const day = d.getDate();
                const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                const statusClass = b.status || 'pending';
                const statusLabel = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);

                // Get type from linked slot
                const linkedSlot = slotMap[b.id];
                const slotType = linkedSlot ? linkedSlot.slot_type : 'zoom';
                const typeIcon = slotType === 'in-person' ? 'building' : 'camera-video';
                const typeLabel = slotType === 'in-person' ? 'In Person' : 'Zoom';

                const isCancelled = statusClass === 'cancelled';
                const cancelBtn = statusClass === 'confirmed'
                    ? `<button class="btn-cancel" onclick="cancelBooking('${b.id}', this)">Cancel</button>`
                    : '';

                return `<div class="booking-item" data-id="${b.id}" ${isCancelled ? 'style="opacity:0.55;"' : ''}>
                    <div class="booking-left">
                        <div class="booking-date-box" ${isCancelled ? 'style="background:var(--dlsu-gray-100);"' : ''}>
                            <span class="bdb-month" ${isCancelled ? 'style="color:var(--dlsu-gray-400);"' : ''}>${month}</span>
                            <span class="bdb-day" ${isCancelled ? 'style="color:var(--dlsu-gray-400);"' : ''}>${day}</span>
                        </div>
                        <div class="booking-info">
                            <div class="bi-title" ${isCancelled ? 'style="text-decoration:line-through;"' : ''}>${b.purpose || 'Advising Meeting'} — ${adviserName}</div>
                            <div class="bi-detail"><i class="bi bi-clock"></i> ${time} · <i class="bi bi-${typeIcon}"></i> ${typeLabel}</div>
                        </div>
                    </div>
                    <div class="booking-actions">
                        <span class="booking-status ${statusClass}">${statusLabel}</span>
                        ${cancelBtn}
                    </div>
                </div>`;
            }).join('');
        }

        async function cancelBooking(id, btn) {
            if (!confirm('Are you sure you want to cancel this appointment?')) return;

            const { error } = await supabaseClient
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('id', id);

            if (error) { alert('Failed to cancel appointment.'); console.error(error); return; }

            // Free up the linked availability slot
            await supabaseClient
                .from('availability_slots')
                .update({ is_booked: false, booked_by: null, appointment_id: null })
                .eq('appointment_id', id);

            await Promise.all([loadAdviserSlots(), loadBookings()]);
        }
