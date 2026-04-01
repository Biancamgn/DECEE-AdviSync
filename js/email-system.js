function switchMode(mode) {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    event.target.closest('.mode-btn').classList.add('active');
    document.getElementById('mode-' + mode).classList.add('active');
}
