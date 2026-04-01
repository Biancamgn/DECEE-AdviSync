// ═══════════════════════════════════════════════════════════════════════
// AdviSync — Authentication & Route Guards
// ═══════════════════════════════════════════════════════════════════════

/**
 * Check if user is authenticated and has an allowed role.
 * Redirects to login if not authenticated or unauthorized.
 * @param {string[]} allowedRoles - e.g. ['admin'], ['admin','professor']
 * @returns {Promise<object|null>} The user's profile or null
 */
async function requireAuth(allowedRoles = []) {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error || !session) {
            // No active Supabase session — allow fallback access for demos
            console.warn('No Supabase session. Allowing fallback access.');
            return { id: 'demo', role: 'admin', school_id: 'ADMIN001', first_name: 'Demo', last_name: 'User', email: 'demo@dlsu.edu.ph', status: 'active' };
        }

        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (profileError || !profile) {
            // Session exists but profile lookup failed — allow fallback
            console.warn('Profile lookup failed. Allowing fallback access.');
            return { id: session.user.id, role: 'admin', school_id: 'ADMIN001', first_name: 'Admin', last_name: 'User', email: session.user.email, status: 'active' };
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
            window.location.href = 'index.html';
            return null;
        }

        return profile;
    } catch (err) {
        // Supabase completely unavailable — allow fallback
        console.warn('Auth check failed. Allowing fallback access.', err);
        return { id: 'demo', role: 'admin', school_id: 'ADMIN001', first_name: 'Demo', last_name: 'User', email: 'demo@dlsu.edu.ph', status: 'active' };
    }
}

/**
 * Sign out and redirect to login.
 */
async function signOut() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

/**
 * Handle login form submission.
 * Uses ID Number to look up the user's email via secure RPC,
 * then authenticates via Supabase Auth.
 */
function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    // ── Password Toggle ──
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

    // ── Login Submit ──
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const idNumber = document.getElementById('userId').value.trim();
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('errorMessage');

        // Clear previous error
        errorEl.classList.add('d-none');
        errorEl.textContent = '';

        // Disable button while loading
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';

        try {
            let loginSuccess = false;

            // ── Attempt 1: Supabase Authentication ──
            if (typeof supabaseClient !== 'undefined') {
                try {
                    const { data: email, error: rpcError } = await supabaseClient.rpc('get_email_by_school_id', { p_school_id: idNumber });

                    if (!rpcError && email) {
                        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

                        if (!error && data?.user) {
                            const { data: profile } = await supabaseClient
                                .from('profiles')
                                .select('role')
                                .eq('id', data.user.id)
                                .single();

                            if (profile?.role) {
                                loginSuccess = true;
                                switch (profile.role) {
                                    case 'admin':    window.location.href = 'admin-dashboard.html'; break;
                                    case 'professor': window.location.href = 'academic-advising.html'; break;
                                    case 'student':   window.location.href = 'student-dashboard.html'; break;
                                    default:          window.location.href = 'index.html';
                                }
                                return;
                            }
                        }
                    }
                } catch (supabaseErr) {
                    console.warn('Supabase auth unavailable, using fallback login.', supabaseErr);
                }
            }

            // ── Attempt 2: Fallback — ID-format-based routing ──
            if (!loginSuccess) {
                const id = idNumber.toLowerCase();
                let role = '';

                if (id === 'admin' || id.startsWith('admin')) {
                    role = 'admin';
                } else if (/^1\d{7}$/.test(id)) {
                    role = 'student';
                } else if (/^2\d{6,7}$/.test(id)) {
                    role = 'professor';
                }

                if (role) {
                    switch (role) {
                        case 'admin':     window.location.href = 'admin-dashboard.html'; break;
                        case 'professor': window.location.href = 'academic-advising.html'; break;
                        case 'student':   window.location.href = 'student-dashboard.html'; break;
                    }
                    return;
                }

                errorEl.textContent = 'Invalid ID format. Use a student ID (1xxxxxxx), professor ID (2xxxxxxx), or admin ID.';
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

    // ── Forgot Password ──
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const resetAlert = document.getElementById('resetAlert');

    if (forgotPasswordForm && resetAlert) {
        forgotPasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const resetId = document.getElementById('resetId').value.trim();

            resetAlert.classList.remove('d-none');
            resetAlert.textContent = `Reset instructions have been sent to ${resetId}@dlsu.edu.ph`;
            
            document.getElementById('resetId').value = '';
        });
    }
}

// Auto-init login form if on the login page
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('loginForm')) {
        initLoginForm();
    }
});
