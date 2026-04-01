function switchTab(tab) {
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    event.target.closest('.tab-item').classList.add('active');
    document.getElementById('tab-' + tab).style.display = '';
}
function toggleFeedback(btn) {
    const area = btn.closest('.submission-card').querySelector('.feedback-area');
    area.classList.toggle('open');
    if (area.classList.contains('open')) area.querySelector('textarea').focus();
}
function approveSubmission(btn) {
    if (confirm('Approve this study plan?')) {
        const card = btn.closest('.submission-card');
        card.style.opacity = '0.5';
        card.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--dlsu-green); font-weight: 600;"><i class="bi bi-check-circle-fill"></i> Study plan approved successfully.</div>';
    }
}
function rejectSubmission(btn) {
    const area = btn.closest('.submission-card').querySelector('.feedback-area');
    area.classList.add('open');
    area.querySelector('textarea').focus();
    area.querySelector('textarea').placeholder = 'Please provide a reason for rejection...';
}
