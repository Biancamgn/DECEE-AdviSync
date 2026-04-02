initShared();

let _currentProfile = null;
let _studentData = null;

(async function () {
    const profile = await requireAuth(['student']);
    if (!profile) return;
    _currentProfile = profile;
    await loadUserProfile();

    const { data: student } = await supabaseClient
        .from('students')
        .select('*')
        .eq('id', profile.id)
        .single();
    _studentData = student;

    await loadConcerns();
})();

async function loadConcerns() {
    const { data: concerns, error } = await supabaseClient
        .from('concerns')
        .select('*')
        .eq('student_id', _currentProfile.id)
        .order('created_at', { ascending: false });

    if (error) { console.error(error); return; }

    const container = document.getElementById('concernsHistory');
    const countBadge = document.querySelector('.count-badge');
    if (countBadge) countBadge.textContent = `${(concerns || []).length} total`;

    if (container && concerns && concerns.length > 0) {
        container.innerHTML = concerns.map(c => {
            const dateStr = new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const statusClass = c.status === 'replied' ? 'replied' : c.status === 'read' ? 'read' : 'unread';
            const statusLabel = c.status === 'replied' ? 'Replied' : c.status === 'read' ? 'Read' : 'Pending';
            return `<div class="concern-item" data-status="${statusClass}">
                <div class="concern-top">
                    <div class="concern-meta">
                        <span class="concern-term">${c.subject || 'General'}</span>
                        <span class="concern-date">Submitted ${dateStr}</span>
                    </div>
                    <span class="concern-status ${statusClass}">${statusLabel}</span>
                </div>
                <p class="concern-message">${(c.message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                ${c.reply ? `<div class="adviser-reply"><strong>Adviser Reply:</strong> ${c.reply.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : ''}
            </div>`;
        }).join('');
    } else if (container) {
        container.innerHTML = '<div style="text-align:center;color:var(--dlsu-gray-400);padding:2rem;">No concerns submitted yet.</div>';
    }
}

function updateCharCount() {
    const len = document.getElementById('concernText').value.length;
    document.getElementById('charCount').textContent = len;
}

async function submitConcern() {
    const text = document.getElementById('concernText').value.trim();
    const termSelect = document.querySelector('select.form-control-custom');
    const subjectInput = document.querySelector('input.form-control-custom');
    if (!text) { alert('Please enter your concern before submitting.'); return; }
    if (!_currentProfile || !_studentData) { alert('Profile not loaded. Please refresh.'); return; }

    const subjectText = subjectInput ? subjectInput.value.trim() : 'General';

    const { error } = await supabaseClient
        .from('concerns')
        .insert({
            student_id: _currentProfile.id,
            adviser_id: _studentData.adviser_id,
            subject: subjectText || 'General',
            message: text,
            status: 'new'
        });

    if (error) { alert('Failed to submit concern. Please try again.'); console.error(error); return; }

    document.getElementById('concernText').value = '';
    if (subjectInput) subjectInput.value = '';
    updateCharCount();

    await loadConcerns();

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
