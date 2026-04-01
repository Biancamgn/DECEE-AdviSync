async function loadConcerns() {
    const profile = await requireAuth(['adviser']);
    if (!profile) return;

    const { data, error } = await supabaseClient
        .from('concerns')
        .select(`
            *,
            profiles!concerns_student_id_fkey (
                first_name, last_name, school_id
            ),
            students!inner ( program )
        `)
        .eq('adviser_id', profile.id)
        .order('created_at', { ascending: false });

    if (error) { console.error(error); return; }

    // Update summary chips
    const total = data.length;
    const newCount = data.filter(c => c.status === 'new').length;
    const repliedCount = data.filter(c => c.status === 'replied').length;
    document.querySelector('.chip-count.amber').textContent = newCount;
    document.querySelector('.chip-count.blue').textContent = repliedCount;
    document.querySelector('.chip-count.green').textContent = total;

    window._allConcerns = data;
    renderConcerns(data);
}

function renderConcerns(data) {
    const container = document.getElementById('concernsContainer');
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="bi bi-chat-left-text"></i> No concerns found.</div>';
        return;
    }

    container.innerHTML = data.map(concern => {
        const p = concern.profiles;
        const fullName = `${p.first_name} ${p.last_name}`;
        const initials = (p.first_name[0] || '') + (p.last_name[0] || '');
        const program = concern.students?.program || '—';
        const date = new Date(concern.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const isUnread = concern.status === 'new';

        return `
        <div class="concern-card ${isUnread ? 'unread' : ''}" data-status="${concern.status}" data-id="${concern.id}">
            <div class="concern-top">
                <div class="concern-student">
                    <div class="concern-avatar">${initials}</div>
                    <div>
                        <div class="concern-name">${fullName}</div>
                        <div class="concern-id">${p.school_id} · ${program}</div>
                    </div>
                </div>
                <div class="concern-meta">
                    <span class="concern-term">${concern.subject}</span>
                    <span class="concern-date">${date}</span>
                    <span class="concern-status ${concern.status}">${concern.status.charAt(0).toUpperCase() + concern.status.slice(1)}</span>
                </div>
            </div>
            <div class="concern-message">${concern.message}</div>
            ${concern.status !== 'replied' ? `
                <div style="display:flex;gap:0.5rem;margin-bottom:0.75rem;">
                    <button class="btn-mark-read" onclick="markRead('${concern.id}', this)">
                        <i class="bi bi-check"></i> Mark as Read
                    </button>
                </div>
                <div class="reply-compose">
                    <textarea placeholder="Type your reply to ${p.first_name}..."></textarea>
                    <button class="btn-reply" onclick="sendReply('${concern.id}', this)">
                        <i class="bi bi-reply-fill"></i> Reply
                    </button>
                </div>` : ''}
        </div>`;
    }).join('');
}

async function markRead(id, btn) {
    const { error } = await supabaseClient
        .from('concerns')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('id', id);
    if (error) { console.error(error); return; }
    btn.textContent = '✓ Marked as read';
    btn.disabled = true;
    setTimeout(() => loadConcerns(), 500);
}

async function sendReply(id, btn) {
    const card = btn.closest('.concern-card');
    const textarea = card.querySelector('textarea');
    const reply = textarea.value.trim();
    if (!reply) { alert('Please write a reply first.'); return; }

    const { error } = await supabaseClient
        .from('concerns')
        .update({ status: 'replied', reply, replied_at: new Date().toISOString() })
        .eq('id', id);
    if (error) { console.error(error); return; }

    btn.textContent = '✓ Sent';
    btn.disabled = true;
    textarea.disabled = true;
    setTimeout(() => loadConcerns(), 800);
}

function filterConcerns(chip, status) {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const all = window._allConcerns || [];
    const filtered = status === 'all' ? all : all.filter(c => c.status === status);
    renderConcerns(filtered);
}

document.addEventListener('DOMContentLoaded', () => { loadConcerns(); });