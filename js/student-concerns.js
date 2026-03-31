// ══════════════════════════════════════════════
// AdviSync – Concerns Page JavaScript
// ══════════════════════════════════════════════

function updateCharCount() {
    const len = document.getElementById('concernText').value.length;
    document.getElementById('charCount').textContent = len;
}

function submitConcern() {
    const text = document.getElementById('concernText').value.trim();
    if (!text) { alert('Please enter your concern before submitting.'); return; }
    alert('Your concern has been submitted. Your adviser will be notified.');
    document.getElementById('concernText').value = '';
    updateCharCount();
}

function filterConcerns(chip, status) {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    document.querySelectorAll('.concern-item').forEach(item => {
        if (status === 'all' || item.dataset.status === status) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}
