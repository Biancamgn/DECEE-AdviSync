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
    const { data: { session }, error } = await supabaseClient.auth.getSession();

    if (error || !session) {
        window.location.href = 'index.html';
        return null;
    }

    const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (profileError || !profile) {
        window.location.href = 'index.html';
        return null;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
        window.location.href = 'index.html';
        return null;
    }

    return profile;
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
 * Called from index.html.
 */
function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const idNumber = document.getElementById('idInput').value.trim();
        const password = document.getElementById('passwordInput').value;
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
            // First, get the email associated with this ID Number using the secure RPC function
            const { data: email, error: rpcError } = await supabaseClient.rpc('get_email_by_school_id', { p_school_id: idNumber });
            
            if (rpcError || !email) {
                errorEl.textContent = 'Invalid ID Number or Password.';
                errorEl.classList.remove('d-none');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                errorEl.textContent = error.message;
                errorEl.classList.remove('d-none');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }

            // Get user role from profiles table
            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();

            if (profileError || !profile) {
                errorEl.textContent = 'Account not found in the system. Contact your administrator.';
                errorEl.classList.remove('d-none');
                await supabaseClient.auth.signOut();
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }

            // Redirect based on role
            switch (profile.role) {
                case 'admin':
                    window.location.href = 'admin-dashboard.html';
                    break;
                case 'professor':
                    window.location.href = 'prof-dashboard.html';
                    break;
                case 'student':
                    window.location.href = 'student-dashboard.html';
                    break;
                default:
                    window.location.href = 'index.html';
            }
        } catch (err) {
            errorEl.textContent = 'An unexpected error occurred. Please try again.';
            errorEl.classList.remove('d-none');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}

// Auto-init login form if on the login page
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('loginForm')) {
        initLoginForm();
    }
});
