initShared();

let _currentProfile = null;

(async function () {
    const profile = await requireAuth(['student']);
    if (!profile) return;
    _currentProfile = profile;
    await loadUserProfile();
})();

function setTheme(el, theme) {
    document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    const dmBtn = document.getElementById('darkModeBtn');
    if (theme === 'dark') { document.body.classList.add('dark-mode'); if (dmBtn) dmBtn.querySelector('i').className = 'bi bi-sun-fill'; }
    else if (theme === 'light') { document.body.classList.remove('dark-mode'); if (dmBtn) dmBtn.querySelector('i').className = 'bi bi-moon-fill'; }
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    showToast('Theme updated!');
}

(function () {
    const dmBtn = document.getElementById('darkModeBtn');
    if (dmBtn) {
        dmBtn._dmBound = true;
        dmBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            dmBtn.querySelector('i').className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
            localStorage.setItem('darkMode', isDark);
            document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
            const cards = document.querySelectorAll('.theme-card');
            cards.forEach(c => { if (c.textContent.trim() === (isDark ? 'Dark' : 'Light')) c.classList.add('selected'); });
        });
    }
    if (document.body.classList.contains('dark-mode')) {
        document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
        document.querySelectorAll('.theme-card').forEach(c => { if (c.textContent.trim() === 'Dark') c.classList.add('selected'); });
    }
})();

function showToast(msg) {
    const t = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    t.style.display = 'flex';
    setTimeout(() => t.style.display = 'none', 3000);
}

async function changePassword() {
    const inputs = document.querySelectorAll('input[type="password"]');
    const newPass = inputs[1]?.value;
    const confirmPass = inputs[2]?.value;

    if (!newPass || newPass.length < 6) { showToast('Password must be at least 6 characters.'); return; }
    if (newPass !== confirmPass) { showToast('Passwords do not match.'); return; }

    const { error } = await supabaseClient.auth.updateUser({ password: newPass });
    if (error) { showToast('Failed to update password: ' + error.message); return; }

    inputs.forEach(i => i.value = '');
    showToast('Password updated successfully!');
}
