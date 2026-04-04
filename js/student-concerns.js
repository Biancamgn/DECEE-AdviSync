initShared();

let _currentProfile = null;
let _studentData = null;
let _allConcerns = [];
let _concernFilter = 'all';
let _concernPage = 1;
const CONCERNS_PER_PAGE = 6;

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

    // Populate term dropdown dynamically
    const { data: terms } = await supabaseClient
        .from('terms')
        .select('*')
        .order('academic_year', { ascending: false })
        .order('term_name', { ascending: false });
    const termSelect = document.querySelector('select.form-control-custom');
    if (termSelect && terms) {
        const activeTerm = terms.find(t => t.is_active);
        terms.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = `${t.term_name} · AY ${t.academic_year}${t.is_active ? ' (Current)' : ''}`;
            if (t.is_active) opt.selected = true;
            termSelect.appendChild(opt);
        });
    }

    await loadConcerns();
})();

async function loadConcerns() {
    const { data: concerns, error } = await supabaseClient
        .from('concerns')
        .select('*')
        .eq('student_id', _currentProfile.id)
        .order('created_at', { ascending: false });

    if (error) { console.error(error); return; }
    _allConcerns = concerns || [];

    const countBadge = document.querySelector('.count-badge');
    if (countBadge) countBadge.textContent = _allConcerns.length + ' total';

    renderConcernsList();
}

function filterConcerns(chip, status) {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    _concernFilter = status;
    _concernPage = 1;
    renderConcernsList();
}

function getFilteredConcerns() {
    if (_concernFilter === 'all') return _allConcerns;
    if (_concernFilter === 'new') return _allConcerns.filter(c => c.status === 'new');
    if (_concernFilter === 'active') return _allConcerns.filter(c => c.status === 'active' || c.status === 'read' || c.status === 'replied');
    if (_concernFilter === 'resolved') return _allConcerns.filter(c => c.status === 'resolved');
    return _allConcerns;
}

function renderConcernsList() {
    const container = document.getElementById('concernsHistory');
    if (!container) return;

    const filtered = getFilteredConcerns();

    if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:var(--dlsu-gray-400);padding:2rem;">No concerns found.</div>';
        renderPagination(0);
        return;
    }

    const totalPages = Math.ceil(filtered.length / CONCERNS_PER_PAGE);
    if (_concernPage > totalPages) _concernPage = totalPages;
    const start = (_concernPage - 1) * CONCERNS_PER_PAGE;
    const pageData = filtered.slice(start, start + CONCERNS_PER_PAGE);

    container.innerHTML = pageData.map(concern => {
        const dateStr = new Date(concern.created_at).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
        const isNew = concern.status === 'new';
        const isResolved = concern.status === 'resolved';
        const statusLabel = concern.status === 'new' ? 'Pending'
            : (concern.status === 'active' || concern.status === 'read' || concern.status === 'replied') ? 'Active'
            : concern.status === 'resolved' ? 'Resolved'
            : concern.status;
        const statusClass = concern.status === 'new' ? 'new'
            : (concern.status === 'active' || concern.status === 'read' || concern.status === 'replied') ? 'active'
            : concern.status === 'resolved' ? 'resolved'
            : concern.status;

        return '<div class="concern-item ' + (isResolved ? 'resolved' : '') + '" data-id="' + concern.id + '">'
            + '<div class="concern-top">'
            + '<div class="concern-meta">'
            + '<span class="concern-term">' + esc(concern.subject || 'General') + '</span>'
            + '<span class="concern-date">Submitted ' + dateStr + '</span>'
            + '</div>'
            + '<span class="concern-status ' + statusClass + '">' + statusLabel + '</span>'
            + '</div>'
            + '<p class="concern-message">' + esc(concern.message) + '</p>'
            + '<div class="concern-actions">'
            + '<button class="btn-thread" onclick="openThread(\'' + concern.id + '\')"><i class="bi bi-chat-dots"></i> View Thread</button>'
            + (!isResolved ? '<button class="btn-resolve" onclick="resolveOwnConcern(\'' + concern.id + '\', this)"><i class="bi bi-check-circle"></i> Mark Resolved</button>' : '')
            + '</div>'
            + '</div>';
    }).join('');

    renderPagination(totalPages);
}

function esc(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderPagination(totalPages) {
    const container = document.getElementById('concernsPagination');
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = '<button class="pg-btn" ' + (_concernPage <= 1 ? 'disabled' : '') + ' onclick="goConcernPage(' + (_concernPage - 1) + ')"><i class="bi bi-chevron-left"></i></button>';
    for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7 && i > 2 && i < totalPages - 1 && Math.abs(i - _concernPage) > 1) {
            if (i === 3 || i === totalPages - 2) html += '<span class="pg-ellipsis">...</span>';
            continue;
        }
        html += '<button class="pg-btn ' + (i === _concernPage ? 'active' : '') + '" onclick="goConcernPage(' + i + ')">' + i + '</button>';
    }
    html += '<button class="pg-btn" ' + (_concernPage >= totalPages ? 'disabled' : '') + ' onclick="goConcernPage(' + (_concernPage + 1) + ')"><i class="bi bi-chevron-right"></i></button>';
    container.innerHTML = html;
}

function goConcernPage(page) {
    _concernPage = page;
    renderConcernsList();
}

function updateCharCount() {
    const len = document.getElementById('concernText').value.length;
    document.getElementById('charCount').textContent = len;
}

async function submitConcern() {
    const text = document.getElementById('concernText').value.trim();
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

async function openThread(concernId) {
    var concern = _allConcerns.find(function(c) { return c.id === concernId; });
    if (!concern) return;

    var result = await supabaseClient
        .from('concern_replies')
        .select('*, profiles:sender_id(first_name, last_name)')
        .eq('concern_id', concernId)
        .order('created_at', { ascending: true });

    var replies = result.data;
    if (result.error) { console.error('Error loading replies:', result.error); replies = []; }

    var studentName = (_currentProfile.first_name || '') + ' ' + (_currentProfile.last_name || '');
    var studentInitials = (_currentProfile.first_name ? _currentProfile.first_name[0] : '') + (_currentProfile.last_name ? _currentProfile.last_name[0] : '');
    var isResolved = concern.status === 'resolved';

    var modal = document.getElementById('threadModal');
    modal.dataset.concernId = concernId;

    document.getElementById('threadSubject').textContent = concern.subject || 'General';
    var statusEl = document.getElementById('threadStatus');
    var statusLabel = concern.status === 'new' ? 'Pending' : (concern.status === 'active' || concern.status === 'read' || concern.status === 'replied') ? 'Active' : concern.status === 'resolved' ? 'Resolved' : concern.status;
    var statusClass = concern.status === 'new' ? 'new' : (concern.status === 'active' || concern.status === 'read' || concern.status === 'replied') ? 'active' : concern.status;
    statusEl.className = 'concern-status ' + statusClass;
    statusEl.textContent = statusLabel;

    var dateStr = new Date(concern.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

    var messagesHtml = '<div class="thread-msg student">'
        + '<div class="msg-avatar">' + studentInitials + '</div>'
        + '<div class="msg-body">'
        + '<div class="msg-sender">' + esc(studentName) + ' (You) <span class="msg-time">' + dateStr + '</span></div>'
        + '<div class="msg-text">' + esc(concern.message) + '</div>'
        + '</div></div>';

    if (replies && replies.length > 0) {
        replies.forEach(function(r) {
            var isStudent = r.sender_role === 'student';
            var rName = r.profiles ? (r.profiles.first_name || '') + ' ' + (r.profiles.last_name || '') : 'Unknown';
            var rInitials = r.profiles ? ((r.profiles.first_name || '')[0] || '') + ((r.profiles.last_name || '')[0] || '') : '??';
            var rTime = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
            messagesHtml += '<div class="thread-msg ' + (isStudent ? 'student' : 'adviser') + '">'
                + '<div class="msg-avatar">' + rInitials + '</div>'
                + '<div class="msg-body">'
                + '<div class="msg-sender">' + esc(rName) + (isStudent ? ' (You)' : '') + ' <span class="msg-time">' + rTime + '</span></div>'
                + '<div class="msg-text">' + esc(r.message) + '</div>'
                + '</div></div>';
        });
    } else if (concern.reply) {
        var replyDate = concern.replied_at
            ? new Date(concern.replied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
            : '';
        messagesHtml += '<div class="thread-msg adviser">'
            + '<div class="msg-avatar">AD</div>'
            + '<div class="msg-body">'
            + '<div class="msg-sender">Adviser <span class="msg-time">' + replyDate + '</span></div>'
            + '<div class="msg-text">' + esc(concern.reply) + '</div>'
            + '</div></div>';
    }

    document.getElementById('threadMessages').innerHTML = messagesHtml;

    var composeEl = document.getElementById('threadCompose');
    if (isResolved) {
        composeEl.innerHTML = '<div class="resolved-notice"><i class="bi bi-check-circle-fill"></i> This concern has been resolved.</div>';
    } else {
        composeEl.innerHTML = '<textarea id="threadReplyInput" placeholder="Type your reply..."></textarea>'
            + '<div class="thread-compose-actions">'
            + '<button class="btn-resolve" onclick="resolveOwnConcernFromThread(\'' + concernId + '\')"><i class="bi bi-check-circle"></i> Resolve</button>'
            + '<button class="btn-reply" onclick="sendThreadReply(\'' + concernId + '\')"><i class="bi bi-send-fill"></i> Send Reply</button>'
            + '</div>';
    }

    modal.classList.add('open');
    setTimeout(function() {
        document.getElementById('threadMessages').scrollTop = document.getElementById('threadMessages').scrollHeight;
    }, 100);
}

function closeThread() {
    document.getElementById('threadModal').classList.remove('open');
    loadConcerns();
}

async function sendThreadReply(concernId) {
    var input = document.getElementById('threadReplyInput');
    var msg = input ? input.value.trim() : '';
    if (!msg) { alert('Please type a reply first.'); return; }

    var result = await supabaseClient
        .from('concern_replies')
        .insert({
            concern_id: concernId,
            sender_id: _currentProfile.id,
            sender_role: 'student',
            message: msg
        });

    if (result.error) { alert('Failed to send reply.'); console.error(result.error); return; }

    var concern = _allConcerns.find(function(c) { return c.id === concernId; });
    if (concern && concern.status === 'new') {
        await supabaseClient
            .from('concerns')
            .update({ status: 'active' })
            .eq('id', concernId);
    }

    await openThread(concernId);
}

async function resolveOwnConcernFromThread(concernId) {
    if (!confirm('Mark this concern as resolved?')) return;
    var result = await supabaseClient
        .from('concerns')
        .update({ status: 'resolved' })
        .eq('id', concernId);
    if (result.error) { console.error(result.error); alert('Failed to resolve.'); return; }
    await openThread(concernId);
}

async function resolveOwnConcern(id, btn) {
    if (!confirm('Mark this concern as resolved?')) return;
    var result = await supabaseClient
        .from('concerns')
        .update({ status: 'resolved' })
        .eq('id', id);
    if (result.error) { console.error(result.error); alert('Failed to resolve.'); return; }
    btn.closest('.concern-item').style.opacity = '0.4';
    setTimeout(function() { loadConcerns(); }, 400);
}
