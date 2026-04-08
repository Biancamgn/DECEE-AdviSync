/**
 * File:        adviser-student-concerns.js
 * Description: Adviser Student Concerns page: loads, filters, paginates, and threads concern messages between advisers and students. Handles status updates and replies.
 * Author:      Erin M. Quiazon
 * Date:        2026-04-05
 */

let _adviserProfile = null;
let _allConcerns = [];
let _concernFilter = 'all';
let _concernPage = 1;
const CONCERNS_PER_PAGE = 6;

async function initConcerns() {
    const profile = await requireAuth(['adviser']);
    if (!profile) return;
    _adviserProfile = profile;
    await loadConcerns();
}

async function loadConcerns() {
    const { data, error } = await supabaseClient
        .from('concerns')
        .select('*, profiles!concerns_student_id_fkey(first_name, last_name, school_id)')
        .eq('adviser_id', _adviserProfile.id)
        .order('created_at', { ascending: false });

    if (error) { console.error('Error loading concerns:', error); return; }
    _allConcerns = data || [];

    const newCount = _allConcerns.filter(c => c.status === 'new').length;
    const activeCount = _allConcerns.filter(c => c.status === 'active' || c.status === 'read').length;
    const resolvedCount = _allConcerns.filter(c => c.status === 'resolved').length;
    const el = (sel) => document.querySelector(sel);
    if (el('.chip-count.amber')) el('.chip-count.amber').textContent = newCount;
    if (el('.chip-count.blue'))  el('.chip-count.blue').textContent = activeCount;
    if (el('.chip-count.green')) el('.chip-count.green').textContent = resolvedCount;

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
    if (_concernFilter === 'active') return _allConcerns.filter(c => c.status === 'active' || c.status === 'read');
    if (_concernFilter === 'resolved') return _allConcerns.filter(c => c.status === 'resolved');
    return _allConcerns;
}

function renderConcernsList() {
    const container = document.getElementById('concernsContainer');
    if (!container) return;

    const filtered = getFilteredConcerns();

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="bi bi-chat-left-text"></i><p>No concerns found.</p></div>';
        renderPagination(0);
        return;
    }

    const totalPages = Math.ceil(filtered.length / CONCERNS_PER_PAGE);
    if (_concernPage > totalPages) _concernPage = totalPages;
    const start = (_concernPage - 1) * CONCERNS_PER_PAGE;
    const pageData = filtered.slice(start, start + CONCERNS_PER_PAGE);

    container.innerHTML = pageData.map(concern => {
        const p = concern.profiles;
        if (!p) return '';
        const fullName = (p.first_name || '') + ' ' + (p.last_name || '');
        const initials = (p.first_name?.[0] || '') + (p.last_name?.[0] || '');
        const date = new Date(concern.created_at).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
        const isNew = concern.status === 'new';
        const isResolved = concern.status === 'resolved';
        const statusLabel = concern.status === 'new' ? 'New'
            : (concern.status === 'active' || concern.status === 'read') ? 'Active'
            : concern.status === 'resolved' ? 'Resolved'
            : concern.status;

        return '<div class="concern-card ' + (isNew ? 'unread' : '') + ' ' + (isResolved ? 'resolved' : '') + '" data-id="' + concern.id + '">' 
            + '<div class="concern-top">'
            + '<div class="concern-student">'
            + '<div class="concern-avatar">' + esc(initials) + '</div>'
            + '<div><div class="concern-name">' + esc(fullName) + '</div>'
            + '<div class="concern-id">' + esc(p.school_id || '') + '</div></div>'
            + '</div>'
            + '<div class="concern-meta">'
            + '<span class="concern-term">' + esc(concern.subject || 'General') + '</span>'
            + '<span class="concern-date">' + date + '</span>'
            + '<span class="concern-status ' + concern.status + '">' + statusLabel + '</span>'
            + '</div></div>'
            + '<div class="concern-message">' + esc(concern.message) + '</div>'
            + '<div class="concern-actions split-actions d-flex flex-wrap gap-2 align-items-center mt-2">'
            + '<div class="left-actions">'
            + '<button class="btn btn-outline-primary btn-sm btn-thread" onclick="openThread(\'' + concern.id + '\')"><i class="bi bi-chat-dots"></i> View Thread</button>'
            + (isNew ? '<button class="btn btn-outline-secondary btn-sm btn-mark-read" onclick="markRead(\'' + concern.id + '\', this)"><i class="bi bi-check"></i> Mark as Read</button>' : '')
            + '</div>'
            + '<div class="right-actions ms-auto">'
            + (!isResolved ? '<button class="btn btn-success btn-sm btn-resolve" onclick="resolveConcern(\'' + concern.id + '\', this)"><i class="bi bi-check-circle"></i> Resolve</button>' : '')
            + '</div>'
            + '</div></div>';
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

async function openThread(concernId) {
    var concern = _allConcerns.find(function(c) { return c.id === concernId; });
    if (!concern) return;

    if (concern.status === 'new') {
        await supabaseClient
            .from('concerns')
            .update({ status: 'active', read_at: new Date().toISOString() })
            .eq('id', concernId);
        concern.status = 'active';
    }

    var result = await supabaseClient
        .from('concern_replies')
        .select('*, profiles:sender_id(first_name, last_name)')
        .eq('concern_id', concernId)
        .order('created_at', { ascending: true });

    var replies = result.data;
    if (result.error) { console.error('Error loading replies:', result.error); replies = []; }

    var p = concern.profiles;
    var studentName = ((p && p.first_name) || '') + ' ' + ((p && p.last_name) || '');
    var studentInitials = ((p && p.first_name) ? p.first_name[0] : '') + ((p && p.last_name) ? p.last_name[0] : '');
    var adviserName = (_adviserProfile.first_name || '') + ' ' + (_adviserProfile.last_name || '');
    var adviserInitials = (_adviserProfile.first_name ? _adviserProfile.first_name[0] : '') + (_adviserProfile.last_name ? _adviserProfile.last_name[0] : '');
    var isResolved = concern.status === 'resolved';

    var modal = document.getElementById('threadModal');
    modal.dataset.concernId = concernId;

    document.getElementById('threadStudentName').textContent = studentName.trim();
    document.getElementById('threadSubject').textContent = concern.subject || 'General';
    var statusEl = document.getElementById('threadStatus');
    statusEl.className = 'concern-status ' + concern.status;
    statusEl.textContent = concern.status === 'new' ? 'New' : (concern.status === 'active' || concern.status === 'read') ? 'Active' : concern.status === 'resolved' ? 'Resolved' : concern.status;

    var dateStr = new Date(concern.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

    var messagesHtml = '<div class="thread-msg student">'
        + '<div class="msg-avatar">' + studentInitials + '</div>'
        + '<div class="msg-body">'
        + '<div class="msg-sender">' + esc(studentName) + ' <span class="msg-time">' + dateStr + '</span></div>'
        + '<div class="msg-text">' + esc(concern.message) + '</div>'
        + '</div></div>';

    if (replies && replies.length > 0) {
        replies.forEach(function(r) {
            var isAdv = r.sender_role === 'adviser';
            var rName = r.profiles ? (r.profiles.first_name || '') + ' ' + (r.profiles.last_name || '') : (isAdv ? adviserName : studentName);
            var rInitials = isAdv ? adviserInitials : studentInitials;
            var rTime = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
            messagesHtml += '<div class="thread-msg ' + (isAdv ? 'adviser' : 'student') + '">'
                + '<div class="msg-avatar">' + rInitials + '</div>'
                + '<div class="msg-body">'
                + '<div class="msg-sender">' + esc(rName) + ' <span class="msg-time">' + rTime + '</span></div>'
                + '<div class="msg-text">' + esc(r.message) + '</div>'
                + '</div></div>';
        });
    } else if (concern.reply) {
        var replyDate = concern.replied_at
            ? new Date(concern.replied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
            : '';
        messagesHtml += '<div class="thread-msg adviser">'
            + '<div class="msg-avatar">' + adviserInitials + '</div>'
            + '<div class="msg-body">'
            + '<div class="msg-sender">' + esc(adviserName) + ' <span class="msg-time">' + replyDate + '</span></div>'
            + '<div class="msg-text">' + esc(concern.reply) + '</div>'
            + '</div></div>';
    }

    document.getElementById('threadMessages').innerHTML = messagesHtml;

    var composeEl = document.getElementById('threadCompose');
    if (isResolved) {
        composeEl.innerHTML = '<div class="resolved-notice"><i class="bi bi-check-circle-fill"></i> This concern has been resolved.</div>';
    } else {
        composeEl.innerHTML = '<textarea id="threadReplyInput" placeholder="Type your reply to ' + esc((p && p.first_name) || 'student') + '..."></textarea>'
            + '<div class="thread-compose-actions">'
            + '<button class="btn-resolve" onclick="resolveConcernFromThread(\'' + concernId + '\')"><i class="bi bi-check-circle"></i> Resolve</button>'
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
            sender_id: _adviserProfile.id,
            sender_role: 'adviser',
            message: msg
        });

    if (result.error) { alert('Failed to send reply.'); console.error(result.error); return; }

    var concern = _allConcerns.find(function(c) { return c.id === concernId; });
    if (concern && (concern.status === 'new' || concern.status === 'read')) {
        await supabaseClient
            .from('concerns')
            .update({ status: 'active', reply: msg, replied_at: new Date().toISOString() })
            .eq('id', concernId);
    }

    await openThread(concernId);
}

async function resolveConcernFromThread(concernId) {
    if (!confirm('Mark this concern as resolved?')) return;
    var result = await supabaseClient
        .from('concerns')
        .update({ status: 'resolved' })
        .eq('id', concernId);
    if (result.error) { console.error(result.error); alert('Failed to resolve concern.'); return; }
    await openThread(concernId);
}

async function markRead(id, btn) {
    var result = await supabaseClient
        .from('concerns')
        .update({ status: 'active', read_at: new Date().toISOString() })
        .eq('id', id);
    if (result.error) { console.error(result.error); return; }
    btn.textContent = 'Read';
    btn.disabled = true;
    setTimeout(function() { loadConcerns(); }, 400);
}

async function resolveConcern(id, btn) {
    if (!confirm('Mark this concern as resolved?')) return;
    var result = await supabaseClient
        .from('concerns')
        .update({ status: 'resolved' })
        .eq('id', id);
    if (result.error) { console.error(result.error); alert('Failed to resolve.'); return; }
    btn.closest('.concern-card').style.opacity = '0.4';
    setTimeout(function() { loadConcerns(); }, 400);
}

document.addEventListener('DOMContentLoaded', function() { initConcerns(); });

document.addEventListener('DOMContentLoaded', () => { loadConcerns(); });