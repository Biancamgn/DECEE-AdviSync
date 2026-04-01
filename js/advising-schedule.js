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
    card.innerHTML = `<button class="slot-remove" onclick="this.parentElement.remove()"><i class="bi bi-x"></i></button><div class="slot-date">${dateStr}</div><div class="slot-time">${fmt(start)} – ${fmt(end)}</div><div class="slot-type"><i class="bi bi-${icon}"></i> ${type === 'zoom' ? 'Zoom' : 'In Person'}</div><div class="slot-booked available">Available</div>`;
    document.getElementById('slotsList').appendChild(card);
}
