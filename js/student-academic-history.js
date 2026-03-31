// ══════════════════════════════════════════════
// AdviSync – Academic History Page JavaScript
// ══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    const filterYear = document.getElementById('filterYear');
    const filterTerm = document.getElementById('filterTerm');
    const resetBtn = document.getElementById('resetFilters');
    const termCards = document.querySelectorAll('.term-card');

    function applyFilters() {
        const year = filterYear.value;
        const term = filterTerm.value;
        termCards.forEach(card => {
            const cardYear = card.dataset.year;
            const cardTerm = card.dataset.term;
            const matchYear = year === 'all' || cardYear === year;
            const matchTerm = term === 'all' || cardTerm === term;
            card.style.display = (matchYear && matchTerm) ? '' : 'none';
        });
    }

    filterYear.addEventListener('change', applyFilters);
    filterTerm.addEventListener('change', applyFilters);
    resetBtn.addEventListener('click', () => {
        filterYear.value = 'all';
        filterTerm.value = 'all';
        applyFilters();
    });
});
