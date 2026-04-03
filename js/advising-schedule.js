let _adviserProfile = null;

async function loadSchedule() {
    const profile = await requireAuth(['adviser']);
    if (!profile) return;
    _adviserProfile = profile;

    // Set default date inputs to today
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('slotDate');
    if (dateInput && !dateInput.value) dateInput.value = today;
    const bulkDateInput = document.getElementById('bulkDate');
    if (bulkDateInput && !bulkDateInput.value) bulkDateInput.value = today;

    // Live preview for bulk generation
    ['bulkFrom', 'bulkTo', 'bulkDuration'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', updateBulkPreview);
    });
    updateBulkPreview();

    await Promise.all([loadSlots(), loadBookings()]);
}

// ── Tab Switching ──

function switchSlotTab(tab, btn) {
    document.querySelectorAll('.slot-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('singleSlotForm').style.display = tab === 'single' ? 'flex' : 'none';
    document.getElementById('bulkSlotForm').style.display = tab === 'bulk' ? 'block' : 'none';
}

// ── Bulk Preview ──

function updateBulkPreview() {
    const from = document.getElementById('bulkFrom')?.value;
    const to = document.getElementById('bulkTo')?.value;
    const dur = parseInt(document.getElementById('bulkDuration')?.value || '30');
    const preview = document.getElementById('bulkPreview');
    if (!preview || !from || !to) { if (preview) preview.textContent = ''; return; }

    const slots = computeBulkSlots(from, to, dur);
    if (slots.length === 0) {
        preview.textContent = 'No slots can be generated with these settings.';
        return;
    }
    preview.innerHTML = `<strong>${slots.length} slot${slots.length !== 1 ? 's' : ''}</strong> will be created: ${slots.map(s => `${fmtTime(s.start)}–${fmtTime(s.end)}`).join(', ')}`;
}

function computeBulkSlots(from, to, durationMins) {
    const slots = [];
    const toMins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const fromStr = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    let cur = toMins(from);
    const end = toMins(to);
    while (cur + durationMins <= end) {
        slots.push({ start: fromStr(cur), end: fromStr(cur + durationMins) });
        cur += durationMins;
    }
    return slots;
}

// ── Availability Slots (persisted to DB) ──

async function loadSlots() {
    const { data: slots, error } = await supabaseClient
        .from('availability_slots')
        .select('*')
        .eq('adviser_id', _adviserProfile.id)
        .gte('slot_date', new Date().toISOString().split('T')[0])
        .order('slot_date', { ascending: true })
        .order('start_time', { ascending: true });

    if (error) { console.error('Error loading slots:', error); return; }

    const container = document.getElementById('slotsList');
    if (!container) return;

    if (!slots || slots.length === 0) {
        container.innerHTML = '<div class="text-center" style="grid-column:1/-1;padding:1.5rem;color:var(--dlsu-gray-400);font-size:0.82rem;"><i class="bi bi-calendar-x" style="font-size:1.5rem;display:block;margin-bottom:0.5rem;opacity:0.3;"></i>No upcoming slots. Add one above.</div>';
        return;
    }

    // Get booker names separately to avoid FK join issues
    const bookedSlots = slots.filter(s => s.is_booked && s.booked_by);
    let bookerMap = {};
    if (bookedSlots.length > 0) {
        const bookerIds = [...new Set(bookedSlots.map(s => s.booked_by))];
        const { data: bookers } = await supabaseClient
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', bookerIds);
        if (bookers) bookers.forEach(b => { bookerMap[b.id] = b; });
    }

    container.innerHTML = slots.map(s => {
        const d = new Date(s.slot_date + 'T00:00');
        const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const icon = s.slot_type === 'zoom' ? 'camera-video' : 'building';
        const typeLabel = s.slot_type === 'zoom' ? 'Zoom' : 'In Person';

        let statusHtml;
        if (s.is_booked && s.booked_by) {
            const booker = bookerMap[s.booked_by];
            const name = booker ? `${(booker.first_name || '')[0]}. ${booker.last_name || ''}` : 'Student';
            statusHtml = `<div class="slot-booked taken">Booked — ${name}</div>`;
        } else {
            statusHtml = `<div class="slot-booked available">Available</div>`;
        }

        const removeBtn = s.is_booked
            ? ''
            : `<button class="slot-remove" onclick="removeSlot('${s.id}', this)" title="Delete slot"><i class="bi bi-x"></i></button>`;

        return `<div class="slot-card" data-slot-id="${s.id}">
            ${removeBtn}
            <div class="slot-date">${dateStr}</div>
            <div class="slot-time">${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}</div>
            <div class="slot-type"><i class="bi bi-${icon}"></i> ${typeLabel}</div>
            ${statusHtml}
        </div>`;
    }).join('');
}

function fmtTime(t) {
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    return ((hr % 12) || 12) + ':' + m + (hr >= 12 ? ' PM' : ' AM');
}

async function checkOverlap(adviserId, date, startTime, endTime) {
    const { data: existing, error } = await supabaseClient
        .from('availability_slots')
        .select('start_time, end_time')
        .eq('adviser_id', adviserId)
        .eq('slot_date', date);
    if (error) { console.error('Error checking overlaps:', error); return []; }
    if (!existing || existing.length === 0) return [];
    return existing.filter(s => s.start_time < endTime && startTime < s.end_time);
}

async function addSlot() {
    if (!_adviserProfile) return;
    const date = document.getElementById('slotDate').value;
    const start = document.getElementById('slotStart').value;
    const end = document.getElementById('slotEnd').value;
    const type = document.getElementById('slotType').value;
    if (!date || !start || !end) return alert('Please fill in all fields.');
    if (start >= end) return alert('End time must be after start time.');

    const overlaps = await checkOverlap(_adviserProfile.id, date, start, end);
    if (overlaps.length > 0) {
        const conflicting = overlaps.map(s => `${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}`).join(', ');
        return alert(`This slot overlaps with existing slot(s): ${conflicting}`);
    }

    const { error } = await supabaseClient
        .from('availability_slots')
        .insert({
            adviser_id: _adviserProfile.id,
            slot_date: date,
            start_time: start,
            end_time: end,
            slot_type: type
        });

    if (error) { alert('Failed to save slot: ' + error.message); console.error(error); return; }
    await loadSlots();
}

async function generateSlots() {
    if (!_adviserProfile) return;
    const date = document.getElementById('bulkDate').value;
    const from = document.getElementById('bulkFrom').value;
    const to = document.getElementById('bulkTo').value;
    const dur = parseInt(document.getElementById('bulkDuration').value || '30');
    const type = document.getElementById('bulkType').value;

    if (!date || !from || !to) return alert('Please fill in all fields.');

    const slots = computeBulkSlots(from, to, dur);
    if (slots.length === 0) return alert('No slots can be generated with these settings. Check your time range and duration.');

    // Check each generated slot for overlaps with existing slots
    const { data: existing, error: fetchErr } = await supabaseClient
        .from('availability_slots')
        .select('start_time, end_time')
        .eq('adviser_id', _adviserProfile.id)
        .eq('slot_date', date);
    if (fetchErr) { alert('Failed to check existing slots.'); console.error(fetchErr); return; }

    if (existing && existing.length > 0) {
        const conflicting = slots.filter(s =>
            existing.some(e => e.start_time < s.end && s.start < e.end_time)
        );
        if (conflicting.length > 0) {
            const conflictStr = conflicting.map(s => `${fmtTime(s.start)} – ${fmtTime(s.end)}`).join(', ');
            return alert(`The following generated slots overlap with existing ones: ${conflictStr}`);
        }
    }

    const rows = slots.map(s => ({
        adviser_id: _adviserProfile.id,
        slot_date: date,
        start_time: s.start,
        end_time: s.end,
        slot_type: type
    }));

    const { error } = await supabaseClient
        .from('availability_slots')
        .insert(rows);

    if (error) { alert('Failed to generate slots: ' + error.message); console.error(error); return; }
    await loadSlots();
}

async function removeSlot(id, btn) {
    if (!confirm('Delete this slot?')) return;
    const card = btn.closest('.slot-card');
    if (card) card.style.opacity = '0.4';

    const { error } = await supabaseClient
        .from('availability_slots')
        .delete()
        .eq('id', id)
        .eq('is_booked', false);

    if (error) { alert('Failed to delete slot.'); console.error(error); return; }
    await loadSlots();
}

// ── Student Bookings (from appointments table) ──

let _allBookings = [];
let _studentMap = {};
let _slotMap = {};
let _bookingsFilter = 'upcoming';
let _bookingsPage = 1;
const BOOKINGS_PER_PAGE = 8;

function switchBookingFilter(filter, btn) {
    _bookingsFilter = filter;
    _bookingsPage = 1;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    renderBookingsTable();
}

function getFilteredBookings() {
    const now = new Date();
    switch (_bookingsFilter) {
        case 'upcoming':
            return _allBookings.filter(a => a.status === 'confirmed' && new Date(a.appointment_date) >= now);
        case 'completed':
            return _allBookings.filter(a => a.status === 'completed');
        case 'cancelled':
            return _allBookings.filter(a => a.status === 'cancelled');
        case 'all':
        default:
            return _allBookings;
    }
}

function renderBookingsTable() {
    const tbody = document.getElementById('bookingsTbody');
    if (!tbody) return;

    const filtered = getFilteredBookings();

    // Update tab counts
    const now = new Date();
    const counts = {
        upcoming: _allBookings.filter(a => a.status === 'confirmed' && new Date(a.appointment_date) >= now).length,
        completed: _allBookings.filter(a => a.status === 'completed').length,
        cancelled: _allBookings.filter(a => a.status === 'cancelled').length,
        all: _allBookings.length
    };
    document.querySelectorAll('.filter-tab').forEach(tab => {
        const key = tab.dataset.filter;
        const countEl = tab.querySelector('.tab-count');
        if (countEl && counts[key] !== undefined) countEl.textContent = counts[key];
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:2rem;color:var(--dlsu-gray-400);">No ${_bookingsFilter} appointments.</td></tr>`;
        renderBookingsPagination(0);
        return;
    }

    // Pagination
    const totalPages = Math.ceil(filtered.length / BOOKINGS_PER_PAGE);
    if (_bookingsPage > totalPages) _bookingsPage = totalPages;
    const start = (_bookingsPage - 1) * BOOKINGS_PER_PAGE;
    const pageData = filtered.slice(start, start + BOOKINGS_PER_PAGE);

    tbody.innerHTML = pageData.map(appt => {
        const p = _studentMap[appt.student_id] || {};
        const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown';
        const date = new Date(appt.appointment_date);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const status = appt.status || 'confirmed';

        const linkedSlot = _slotMap[appt.id];
        const slotType = linkedSlot ? linkedSlot.slot_type : 'zoom';
        const typeIcon = slotType === 'in-person' ? 'building' : 'camera-video';
        const typeLabel = slotType === 'in-person' ? 'In Person' : 'Zoom';

        let actions = '';
        if (status === 'confirmed') {
            actions = `<button class="btn-action-sm btn-complete-sm" onclick="completeAppt('${appt.id}', this)" title="Mark as completed"><i class="bi bi-check-lg"></i></button>
                       <button class="btn-action-sm btn-cancel-sm" onclick="cancelAppt('${appt.id}', this)" title="Cancel">Cancel</button>`;
        } else {
            actions = '<span style="color:var(--dlsu-gray-400);font-size:0.72rem;">—</span>';
        }

        return `<tr>
            <td><strong>${fullName}</strong>${p.school_id ? `<br><small style="color:var(--dlsu-gray-400)">${p.school_id}</small>` : ''}</td>
            <td>${dateStr}</td>
            <td>${timeStr}</td>
            <td><i class="bi bi-${typeIcon}"></i> ${typeLabel}</td>
            <td><span class="booking-status ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
            <td>${actions}</td>
        </tr>`;
    }).join('');

    renderBookingsPagination(totalPages);
}

function renderBookingsPagination(totalPages) {
    const container = document.getElementById('bookingsPagination');
    if (!container) return;

    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = '';
    html += `<button class="pg-btn" ${_bookingsPage <= 1 ? 'disabled' : ''} onclick="goBookingsPage(${_bookingsPage - 1})"><i class="bi bi-chevron-left"></i></button>`;
    for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7 && i > 2 && i < totalPages - 1 && Math.abs(i - _bookingsPage) > 1) {
            if (i === 3 || i === totalPages - 2) html += '<span class="pg-ellipsis">…</span>';
            continue;
        }
        html += `<button class="pg-btn ${i === _bookingsPage ? 'active' : ''}" onclick="goBookingsPage(${i})">${i}</button>`;
    }
    html += `<button class="pg-btn" ${_bookingsPage >= totalPages ? 'disabled' : ''} onclick="goBookingsPage(${_bookingsPage + 1})"><i class="bi bi-chevron-right"></i></button>`;
    container.innerHTML = html;
}

function goBookingsPage(page) {
    _bookingsPage = page;
    renderBookingsTable();
}

async function loadBookings() {
    const { data, error } = await supabaseClient
        .from('appointments')
        .select('*')
        .eq('adviser_id', _adviserProfile.id)
        .order('appointment_date', { ascending: false });

    if (error) { console.error('Error loading bookings:', error); return; }

    if (!data || data.length === 0) {
        _allBookings = [];
        renderBookingsTable();
        return;
    }

    // Auto-complete past confirmed appointments
    const now = new Date();
    const pastConfirmed = data.filter(a => a.status === 'confirmed' && new Date(a.appointment_date) < now);
    if (pastConfirmed.length > 0) {
        const ids = pastConfirmed.map(a => a.id);
        await supabaseClient
            .from('appointments')
            .update({ status: 'completed' })
            .in('id', ids);
        pastConfirmed.forEach(a => { a.status = 'completed'; });
    }

    // Fetch student profiles separately
    const studentIds = [...new Set(data.map(a => a.student_id))];
    _studentMap = {};
    if (studentIds.length > 0) {
        const { data: students } = await supabaseClient
            .from('profiles')
            .select('id, first_name, last_name, school_id')
            .in('id', studentIds);
        if (students) students.forEach(s => { _studentMap[s.id] = s; });
    }

    // Fetch slot info separately
    const apptIds = data.map(a => a.id);
    _slotMap = {};
    if (apptIds.length > 0) {
        const { data: slots } = await supabaseClient
            .from('availability_slots')
            .select('appointment_id, slot_type')
            .in('appointment_id', apptIds);
        if (slots) slots.forEach(s => { _slotMap[s.appointment_id] = s; });
    }

    _allBookings = data;
    renderBookingsTable();
}

async function completeAppt(id, btn) {
    if (!confirm('Mark this appointment as completed?')) return;
    const { error } = await supabaseClient
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', id);
    if (error) { console.error(error); alert('Failed to complete appointment.'); return; }

    btn.closest('tr').style.opacity = '0.4';
    setTimeout(async () => {
        await Promise.all([loadBookings(), loadSlots()]);
    }, 400);
}

async function cancelAppt(id, btn) {
    if (!confirm('Cancel this appointment?')) return;
    const { error } = await supabaseClient
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id);
    if (error) { console.error(error); alert('Failed to cancel appointment.'); return; }

    // Free up the linked availability slot
    await supabaseClient
        .from('availability_slots')
        .update({ is_booked: false, booked_by: null, appointment_id: null })
        .eq('appointment_id', id);

    btn.closest('tr').style.opacity = '0.4';
    setTimeout(async () => {
        await Promise.all([loadBookings(), loadSlots()]);
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => { loadSchedule(); });