function filterTable() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const program = document.getElementById('filterProgram').value;
    const status = document.getElementById('filterStatus').value;
    document.querySelectorAll('#adviseeTable tbody tr').forEach(row => {
        const text = row.textContent.toLowerCase();
        const matchSearch = !search || text.includes(search);
        const matchProgram = program === 'all' || row.dataset.program === program;
        const matchStatus = status === 'all' || row.dataset.status === status;
        row.style.display = (matchSearch && matchProgram && matchStatus) ? '' : 'none';
    });
}