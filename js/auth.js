const togglePassword = document.querySelector('#togglePassword');
const passwordInput = document.querySelector('#password');
const toggleIcon = document.querySelector('#toggleIcon');

togglePassword.addEventListener('click', function () {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    toggleIcon.classList.toggle('bi-eye');
    toggleIcon.classList.toggle('bi-eye-slash');
});

const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const userId = document.getElementById('userId').value.trim();
    const password = document.getElementById('password').value;
    
    let role = "";

    if (userId === "admin") {
        role = "admin";
    } 
    else if (/^1[0-9]{7}$/.test(userId)) {
        role = "student";
    } 
    else if (/^2[0-9]{6,7}$/.test(userId)) {
        role = "prof";
    } 
    else {
        alert("Invalid ID format. Please enter a valid student ID, prof ID, or 'admin'.");
        return; 
    }

    if (role === "student") {
        window.location.href = "student-dashboard.html";
    } else if (role === "prof") {
        window.location.href = "prof-dashboard.html";
    } else if (role === "admin") {
        window.location.href = "admin-dashboard.html";
    }
});

const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const resetAlert = document.getElementById('resetAlert');

forgotPasswordForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const resetId = document.getElementById('resetId').value.trim();

    resetAlert.classList.remove('d-none');
    resetAlert.textContent = `Reset instructions have been sent to ${resetId}@dlsu.edu.ph`;
    
    document.getElementById('resetId').value = '';
});