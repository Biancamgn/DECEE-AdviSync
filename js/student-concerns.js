const sidebar = document.getElementById('sidebar'), mainContent = document.getElementById('mainContent'), overlay = document.getElementById('sidebarOverlay'), hamburger = document.getElementById('hamburgerBtn');
const isMobile = () => window.innerWidth < 992;
sidebar.addEventListener('mouseenter', () => { if (!isMobile()) { sidebar.classList.add('expanded'); mainContent.classList.add('shifted'); } });
sidebar.addEventListener('mouseleave', () => { if (!isMobile()) { sidebar.classList.remove('expanded'); mainContent.classList.remove('shifted'); } });
hamburger.addEventListener('click', () => { sidebar.classList.toggle('expanded'); overlay.classList.toggle('active'); });
overlay.addEventListener('click', () => { sidebar.classList.remove('expanded'); overlay.classList.remove('active'); });

const clockEl = document.getElementById('topbarClock');
function updateClock() { const n = new Date(); clockEl.textContent = n.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}) + ' · ' + String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')+':'+String(n.getSeconds()).padStart(2,'0'); }
updateClock(); setInterval(updateClock, 1000);

function updateCharCount() {
    const len = document.getElementById('concernText').value.length;
    document.getElementById('charCount').textContent = len;
}

function submitConcern() {
    const text = document.getElementById('concernText').value.trim();
    const termSelect = document.querySelector('select.form-control-custom');
    const subjectInput = document.querySelector('input.form-control-custom');
    if (!text) { alert('Please enter your concern before submitting.'); return; }

    const termText = termSelect.options[termSelect.selectedIndex].text.replace(' (Current)', '');
    const subjectText = subjectInput ? subjectInput.value.trim() : '';
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Add to history dynamically
    const firstConcern = document.querySelector('.concern-item');
    const newConcern = document.createElement('div');
    newConcern.className = 'concern-item';
    newConcern.setAttribute('data-status', 'unread');
    newConcern.innerHTML = `
                <div class="concern-top">
                    <div class="concern-meta">
                        <span class="concern-term">${termText}</span>
                        <span class="concern-date">Submitted ${dateStr}</span>
                    </div>
                    <span class="concern-status unread">Pending</span>
                </div>
                <p class="concern-message">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
            `;
    firstConcern.parentNode.insertBefore(newConcern, firstConcern);

    const countBadge = document.querySelector('.count-badge');
    const currentCount = parseInt(countBadge.textContent) + 1;
    countBadge.textContent = currentCount + ' total';

    document.getElementById('concernText').value = '';
    if (subjectInput) subjectInput.value = '';
    updateCharCount();

    const t = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = 'Concern submitted successfully! Your adviser will be notified.';
    t.style.display = 'flex';
    setTimeout(() => t.style.display = 'none', 4000);
}

function filterConcerns(chip, status) {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    document.querySelectorAll('.concern-item').forEach(item => {
        if (status === 'all' || item.dataset.status === status) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}
