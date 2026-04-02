let _adviserId = null;

async function initSchedule() {
    const profile = await requireAuth(['adviser']);
    if (!profile) return;
    _adviserId = profile.id;
    await loadSlots();
    await loadSchedule();
}

async function loadSlots() {
    const list  = document.getElementById('slotsList');
    const empty = document.getElementById('slotsEmpty');

    const { data, error } = await supabaseClient
        .from('appointments')
        .select(`
            *,
            profiles!appointments_student_id_fkey (
                first_name, last_name
            )
        `)
        .eq('adviser_id', _adviserId)
        .eq('status', 'available')
        .order('appointment_date', { ascending: true });

    if (error) { console.error('Load slots error:', error); return; }

    if (empty) empty.remove();
    list.querySelectorAll('.slot-card').forEach(c => c.remove());

    if (!data || data.length === 0) {
        list.innerHTML = '<div class="empty-state">No available slots. Add one above.</div>';
        return;
    }

    data.forEach(slot => list.appendChild(buildSlotCard(slot)));
}

function buildSlotCard(slot) {
    const date     = new Date(slot.appointment_date);
    const dateStr  = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const startStr = slot.start_time ? formatTime(slot.start_time) : '—';
    const endStr   = slot.end_time   ? formatTime(slot.end_time)   : '—';
    const type     = slot.slot_type  || 'zoom';
    const icon     = type === 'zoom' ? 'camera-video' : 'building';
    const typeLabel = type === 'zoom' ? 'Zoom' : 'In Person';

    const card = document.createElement('div');
    card.className  = 'slot-card';
    card.dataset.id = slot.id;
    card.innerHTML  = `
        <button class="slot-remove" onclick="removeSlot('${slot.id}', this)"><i class="bi bi-x"></i></button>
        <div class="slot-date">${dateStr}</div>
        <div class="slot-time">${startStr} – ${endStr}</div>
        <div class="slot-type"><i class="bi bi-${icon}"></i> ${typeLabel}</div>
        <div class="slot-booked available">Available</div>`;
    return card;
}

function formatTime(timeStr) {
    if (!timeStr) return '—';
    const [h, m] = timeStr.split(':');
    const hour   = parseInt(h);
    const ampm   = hour >= 12 ? 'PM' : 'AM';
    const h12    = (hour % 12) || 12;
    return `${h12}:${m} ${ampm}`;
}

async function addSlot() {
    const dateVal  = document.getElementById('slotDate').value;
    const startVal = document.getElementById('slotStart').value;
    const endVal   = document.getElementById('slotEnd').value;
    const type     = document.getElementById('slotType').value;

    if (!dateVal || !startVal || !endVal) { alert('Please fill in all fields.'); return; }
    if (startVal >= endVal) { alert('End time must be after start time.'); return; }

    const appointmentTimestamp = new Date(`${dateVal}T${startVal}:00`).toISOString();

    const { data, error } = await supabaseClient
        .from('appointments')
        .insert({
            adviser_id       : _adviserId,
            appointment_date : appointmentTimestamp,
            start_time       : startVal,
            end_time         : endVal,
            slot_type        : type,
            status           : 'available'
        })
        .select()
        .single();

    if (error) { console.error('Add slot error:', error); alert('Failed to add slot.'); return; }

    const list  = document.getElementById('slotsList');
    const empty = list.querySelector('.empty-state');
    if (empty) empty.remove();
    list.appendChild(buildSlotCard(data));
}

async function removeSlot(id, btn) {
    const { error } = await supabaseClient
        .from('appointments')
        .delete()
        .eq('id', id)
        .eq('status', 'available');

    if (error) { console.error('Remove slot error:', error); return; }

    btn.closest('.slot-card').remove();

    const list = document.getElementById('slotsList');
    if (!list.querySelector('.slot-card')) {
        list.innerHTML = '<div class="empty-state">No available slots. Add one above.</div>';
    }
}

async function loadSchedule() {
    const tbody = document.getElementById('bookingsTbody');
    if (!tbody) return;

    const { data, error } = await supabaseClient
        .from('appointments')
        .select(`
            *,
            student:profiles!student_id (
                first_name, last_name, school_id
            )
        `)
        .eq('adviser_id', _adviserId)
        .in('status', ['pending', 'confirmed', 'cancelled'])
        .order('appointment_date', { ascending: true });

    if (error) { console.error('Load bookings error:', error); return; }

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No appointments found.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(appt => {
        const p         = appt.student || {};
        const fullName  = `${p.first_name || ''} ${p.last_name || ''}`.trim() || '—';
        const date      = new Date(appt.appointment_date);
        const dateStr   = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr   = appt.start_time ? formatTime(appt.start_time) : '—';
        const type      = appt.slot_type  || 'zoom';
        const typeIcon  = type === 'zoom' ? 'camera-video' : 'building';
        const typeLabel = type === 'zoom' ? 'Zoom' : 'In Person';
        const status    = appt.status || 'pending';


        const actions = status === 'pending'
            ? `<button class="btn-action-sm btn-confirm" onclick="updateAppt('${appt.id}','confirmed',this)">Confirm</button>
               <button class="btn-action-sm btn-cancel-sm" onclick="updateAppt('${appt.id}','cancelled',this)">Cancel</button>`
            : status === 'confirmed'
            ? `<button class="btn-action-sm btn-cancel-sm" onclick="updateAppt('${appt.id}','cancelled',this)">Cancel</button>`
            : `<span style="color:var(--dlsu-gray-400);font-size:0.78rem;">—</span>`;

        return `<tr>
            <td><strong>${fullName}</strong></td>
            <td>${dateStr}</td>
            <td>${timeStr}</td>
            <td><i class="bi bi-${typeIcon}"></i> ${typeLabel}</td>
            <td><span class="booking-status ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
            <td>${actions}</td>
        </tr>`;
    }).join('');
}

async function updateAppt(id, status, btn) {
    const { error } = await supabaseClient
        .from('appointments')
        .update({ status })
        .eq('id', id);
    if (error) { console.error('Update appt error:', error); return; }
    btn.closest('tr').style.opacity = '0.4';
    setTimeout(() => loadSchedule(), 800);
}

document.addEventListener('DOMContentLoaded', () => { initSchedule(); });