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

        let _allStudentBookings = [];
        let _adviserName = 'Your Adviser';
        let _studentSlotMap = {};
        let _studentBookingsFilter = 'upcoming';
        let _studentBookingsPage = 1;
        const STUDENT_BOOKINGS_PER_PAGE = 6;

        function switchStudentBookingFilter(filter, btn) {
            _studentBookingsFilter = filter;
            _studentBookingsPage = 1;
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            renderStudentBookings();
        }

        function getStudentFilteredBookings() {
            const now = new Date();
            switch (_studentBookingsFilter) {
                case 'upcoming':
                    return _allStudentBookings.filter(a => a.status === 'confirmed' && new Date(a.appointment_date) >= now);
                case 'completed':
                    return _allStudentBookings.filter(a => a.status === 'completed');
                case 'cancelled':
                    return _allStudentBookings.filter(a => a.status === 'cancelled');
                case 'all':
                default:
                    return _allStudentBookings;
            }
        }

        function renderStudentBookings() {
            const container = document.getElementById('bookingsList');
            if (!container) return;

            const filtered = getStudentFilteredBookings();

            // Update tab counts
            const now = new Date();
            const counts = {
                upcoming: _allStudentBookings.filter(a => a.status === 'confirmed' && new Date(a.appointment_date) >= now).length,
                completed: _allStudentBookings.filter(a => a.status === 'completed').length,
                cancelled: _allStudentBookings.filter(a => a.status === 'cancelled').length,
                all: _allStudentBookings.length
            };
            document.querySelectorAll('.filter-tab').forEach(tab => {
                const key = tab.dataset.filter;
                const countEl = tab.querySelector('.tab-count');
                if (countEl && counts[key] !== undefined) countEl.textContent = counts[key];
            });

            if (filtered.length === 0) {
                container.innerHTML = `<div style="text-align:center;color:var(--dlsu-gray-400);padding:2rem;"><i class="bi bi-calendar-x" style="font-size:2rem;display:block;margin-bottom:0.5rem;opacity:0.3;"></i>No ${_studentBookingsFilter} appointments.</div>`;
                renderStudentPagination(0);
                return;
            }

            // Pagination
            const totalPages = Math.ceil(filtered.length / STUDENT_BOOKINGS_PER_PAGE);
            if (_studentBookingsPage > totalPages) _studentBookingsPage = totalPages;
            const start = (_studentBookingsPage - 1) * STUDENT_BOOKINGS_PER_PAGE;
            const pageData = filtered.slice(start, start + STUDENT_BOOKINGS_PER_PAGE);

            container.innerHTML = pageData.map(b => {
                const d = new Date(b.appointment_date);
                const month = d.toLocaleDateString('en-US', { month: 'short' });
                const day = d.getDate();
                const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                const statusClass = b.status || 'pending';
                const statusLabel = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);

                const linkedSlot = _studentSlotMap[b.id];
                const slotType = linkedSlot ? linkedSlot.slot_type : 'zoom';
                const typeIcon = slotType === 'in-person' ? 'building' : 'camera-video';
                const typeLabel = slotType === 'in-person' ? 'In Person' : 'Zoom';

                const isCompleted = statusClass === 'completed';
                const isCancelled = statusClass === 'cancelled';
                const isDimmed = isCancelled || isCompleted;
                const cancelBtn = statusClass === 'confirmed'
                    ? `<button class="btn-cancel" onclick="cancelBooking('${b.id}', this)">Cancel</button>`
                    : '';

                return `<div class="booking-item" data-id="${b.id}" ${isDimmed ? 'style="opacity:0.55;"' : ''}>
                    <div class="booking-left">
                        <div class="booking-date-box" ${isDimmed ? 'style="background:var(--dlsu-gray-100);"' : ''}>
                            <span class="bdb-month" ${isDimmed ? 'style="color:var(--dlsu-gray-400);"' : ''}>${month}</span>
                            <span class="bdb-day" ${isDimmed ? 'style="color:var(--dlsu-gray-400);"' : ''}>${day}</span>
                        </div>
                        <div class="booking-info">
                            <div class="bi-title" ${isCancelled ? 'style="text-decoration:line-through;"' : ''}>${b.purpose || 'Advising Meeting'} — ${_adviserName}</div>
                            <div class="bi-detail"><i class="bi bi-clock"></i> ${time} · <i class="bi bi-${typeIcon}"></i> ${typeLabel}</div>
                        </div>
                    </div>
                    <div class="booking-actions">
                        <span class="booking-status ${statusClass}">${statusLabel}</span>
                        ${cancelBtn}
                    </div>
                </div>`;
            }).join('');

            renderStudentPagination(totalPages);
        }

        function renderStudentPagination(totalPages) {
            const container = document.getElementById('bookingsPagination');
            if (!container) return;
            if (totalPages <= 1) { container.innerHTML = ''; return; }

            let html = '';
            html += `<button class="pg-btn" ${_studentBookingsPage <= 1 ? 'disabled' : ''} onclick="goStudentBookingsPage(${_studentBookingsPage - 1})"><i class="bi bi-chevron-left"></i></button>`;
            for (let i = 1; i <= totalPages; i++) {
                if (totalPages > 7 && i > 2 && i < totalPages - 1 && Math.abs(i - _studentBookingsPage) > 1) {
                    if (i === 3 || i === totalPages - 2) html += '<span class="pg-ellipsis">…</span>';
                    continue;
                }
                html += `<button class="pg-btn ${i === _studentBookingsPage ? 'active' : ''}" onclick="goStudentBookingsPage(${i})">${i}</button>`;
            }
            html += `<button class="pg-btn" ${_studentBookingsPage >= totalPages ? 'disabled' : ''} onclick="goStudentBookingsPage(${_studentBookingsPage + 1})"><i class="bi bi-chevron-right"></i></button>`;
            container.innerHTML = html;
        }

        function goStudentBookingsPage(page) {
            _studentBookingsPage = page;
            renderStudentBookings();
        }

        async function loadBookings() {
            const { data: bookings, error } = await supabaseClient
                .from('appointments')
                .select('*')
                .eq('student_id', _currentProfile.id)
                .order('appointment_date', { ascending: false });

            if (error) { console.error(error); return; }

            // Get adviser name
            _adviserName = 'Your Adviser';
            if (_studentData?.adviser_id) {
                const { data: adv } = await supabaseClient
                    .from('profiles')
                    .select('first_name, last_name')
                    .eq('id', _studentData.adviser_id)
                    .single();
                if (adv) _adviserName = `${adv.first_name} ${adv.last_name}`;
            }

            if (!bookings || bookings.length === 0) {
                _allStudentBookings = [];
                renderStudentBookings();
                return;
            }

            // Auto-complete past confirmed appointments
            const now = new Date();
            const pastConfirmed = bookings.filter(a => a.status === 'confirmed' && new Date(a.appointment_date) < now);
            if (pastConfirmed.length > 0) {
                const ids = pastConfirmed.map(a => a.id);
                await supabaseClient
                    .from('appointments')
                    .update({ status: 'completed' })
                    .in('id', ids);
                pastConfirmed.forEach(a => { a.status = 'completed'; });
            }

            // Get slot info for each booking
            _studentSlotMap = {};
            const apptIds = bookings.map(b => b.id);
            const { data: slots } = await supabaseClient
                .from('availability_slots')
                .select('appointment_id, slot_type, start_time, end_time')
                .in('appointment_id', apptIds);
            if (slots) {
                slots.forEach(s => { _studentSlotMap[s.appointment_id] = s; });
            }

            _allStudentBookings = bookings;
            renderStudentBookings();
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
