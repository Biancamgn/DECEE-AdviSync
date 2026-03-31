// ══════════════════════════════════════════════
// AdviSync – Dashboard Page JavaScript
// ══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    // Dynamic Greeting
    const greetingEl = document.querySelector('.welcome-banner h2');
    if (greetingEl) {
        const hour = new Date().getHours();
        let greeting = 'Good morning';
        if (hour >= 12 && hour < 18) greeting = 'Good afternoon';
        else if (hour >= 18) greeting = 'Good evening';
        greetingEl.textContent = `${greeting}, Bianca!`;
    }
});
