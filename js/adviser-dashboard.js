document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const h = new Date().getHours();
        let g = 'Good morning';
        if (h >= 12 && h < 18) g = 'Good afternoon';
        else if (h >= 18) g = 'Good evening';
        const el = document.getElementById('greetingText');
        if (el) el.textContent = `${g}, Dr. Cruz!`;
    }, 200);
});