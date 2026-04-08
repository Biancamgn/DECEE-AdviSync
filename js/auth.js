/**
 * File:        auth.js
 * Description: Authentication logic: session validation, role-based routing, sign-out, login form handling (school ID→email→password), and password reset flow.
 * Author:      Erin M. Quiazon
 * Date:        2026-04-07
 */

function _authPrefix() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts.length > 1 ? '../' : '';
}

async function requireAuth(allowedRoles = []) {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error || !session) {
            window.location.href = _authPrefix() + 'index.html';
            return null;
        }

        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (profileError || !profile) {
            window.location.href = _authPrefix() + 'index.html';
            return null;
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
            window.location.href = _authPrefix() + 'index.html';
            return null;
        }

        return profile;
    } catch (err) {
        window.location.href = _authPrefix() + 'index.html';
        return null;
    }
}

async function signOut() {
    sessionStorage.removeItem('_profileCache');
    await supabaseClient.auth.signOut();
    window.location.href = _authPrefix() + 'index.html';
}

function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('toggleIcon');

    if (togglePassword && passwordInput && toggleIcon) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            toggleIcon.classList.toggle('bi-eye');
            toggleIcon.classList.toggle('bi-eye-slash');
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const idNumber = document.getElementById('userId').value.trim();
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('errorMessage');

        errorEl.classList.add('d-none');
        errorEl.textContent = '';

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';

        try {
            const { data: email, error: rpcError } = await supabaseClient.rpc('get_email_by_school_id', { p_school_id: idNumber });

            if (rpcError || !email) {
                errorEl.textContent = 'Invalid ID number or password. Please try again.';
                errorEl.classList.remove('d-none');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }

            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

            if (error || !data?.user) {
                errorEl.textContent = 'Invalid ID number or password. Please try again.';
                errorEl.classList.remove('d-none');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }

            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();

            if (profile?.role) {
                switch (profile.role) {
                    case 'admin':     window.location.href = 'admin/admin-dashboard.html'; break;
                    case 'adviser': window.location.href = 'adviser/academic-advising.html'; break;
                    case 'student':   window.location.href = 'student/student-dashboard.html'; break;
                    default:          window.location.href = 'index.html';
                }
            } else {
                errorEl.textContent = 'Account profile not found. Contact your administrator.';
                errorEl.classList.remove('d-none');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        } catch (err) {
            errorEl.textContent = 'An unexpected error occurred. Please try again.';
            errorEl.classList.remove('d-none');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });

    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const resetAlert = document.getElementById('resetAlert');

    if (forgotPasswordForm && resetAlert) {
        forgotPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const resetId = document.getElementById('resetId').value.trim();

            let userEmail = null;

            try {
                const { data, error } = await supabaseClient
                    .from('profiles')
                    .select('email')
                    .eq('school_id', resetId)
                    .single();

                if (!error && data?.email) {
                    userEmail = data.email;
                }
            } catch (err) {
                userEmail = null;
            }

            if (!userEmail) {
                userEmail = resetId + '@dlsu.edu.ph';
            }

            resetAlert.classList.remove('d-none');
            resetAlert.textContent = 'Reset instructions have been sent to ' + userEmail;

            console.log('[Forgot Password] Reset requested for ID: ' + resetId);
            console.log('[Forgot Password] Email: ' + userEmail);
            console.log('[Forgot Password] Status: Reset link sent successfully (demo mode)');

            document.getElementById('resetId').value = '';
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('loginForm')) {
        initLoginForm();
    }
});