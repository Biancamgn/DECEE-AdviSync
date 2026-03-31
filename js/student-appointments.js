// ══════════════════════════════════════════════
// AdviSync – Appointments Page JavaScript
// ══════════════════════════════════════════════

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

function bookAppointment() {
    const date = document.querySelector('.date-chip.selected');
    const slot = document.querySelector('.time-slot.selected');
    if (date && slot) {
        alert(`Appointment booked!\n${date.querySelector('.day-name').textContent}, ${date.querySelector('.day-month').textContent} ${date.querySelector('.day-num').textContent} at ${slot.querySelector('.slot-time').textContent}`);
        slot.classList.remove('selected');
        slot.classList.add('booked');
        slot.querySelector('.slot-status').textContent = 'Booked';
        slot.onclick = null;
        document.getElementById('bookBtn').disabled = true;
    }
}

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
