async function loadSchedule() {
    const profile = await requireAuth(['adviser']);
    if (!profile) return;

    const { data, error } = await supabaseClient
        .from('appointments')
        .select(`
            *,
            profiles!appointments_student_id_fkey (
                first_name, last_name, school_id
            )
        `)
        .eq('adviser_id', profile.id)
        .order('appointment_date', { ascending: true });

    if (error) { console.error(error); return; }

    const tbody = document.getElementById('bookingsTbody');
    if (!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No appointments found.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(appt => {
        const p = appt.profiles;
        const fullName = `${p.first_name} ${p.last_name}`;
        const date = new Date(appt.appointment_date);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const status = appt.status || 'pending';
        const actions = status === 'pending'
            ? `<button class="btn-action-sm btn-confirm" onclick="updateAppt('${appt.id}','confirmed',this)">Confirm</button>
               <button class="btn-action-sm btn-cancel-sm" onclick="updateAppt('${appt.id}','cancelled',this)">Cancel</button>`
            : `<button class="btn-action-sm btn-cancel-sm" onclick="updateAppt('${appt.id}','cancelled',this)">Cancel</button>`;

        return `<tr>
            <td><strong>${fullName}</strong></td>
            <td>${dateStr}</td>
            <td>${timeStr}</td>
            <td><i class="bi bi-camera-video"></i> Zoom</td>
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
    if (error) { console.error(error); return; }
    btn.closest('tr').style.opacity = '0.4';
    setTimeout(() => loadSchedule(), 800);
}

function addSlot() {
    const date = document.getElementById('slotDate').value;
    const start = document.getElementById('slotStart').value;
    const end = document.getElementById('slotEnd').value;
    const type = document.getElementById('slotType').value;
    if (!date || !start || !end) return alert('Please fill in all fields.');
    const d = new Date(date + 'T00:00');
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const fmt = t => { const [h,m] = t.split(':'); return ((h%12)||12)+':'+m+(h>=12?' PM':' AM'); };
    const icon = type === 'zoom' ? 'camera-video' : 'building';
    const card = document.createElement('div');
    card.className = 'slot-card';
    card.innerHTML = `<button class="slot-remove" onclick="this.parentElement.remove()"><i class="bi bi-x"></i></button>
        <div class="slot-date">${dateStr}</div>
        <div class="slot-time">${fmt(start)} – ${fmt(end)}</div>
        <div class="slot-type"><i class="bi bi-${icon}"></i> ${type === 'zoom' ? 'Zoom' : 'In Person'}</div>
        <div class="slot-booked available">Available</div>`;
    document.getElementById('slotsList').appendChild(card);
}

document.addEventListener('DOMContentLoaded', () => { loadSchedule(); });