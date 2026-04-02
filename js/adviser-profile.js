function showToast(msg) {
    const t = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    t.style.display = 'flex';
    setTimeout(() => t.style.display = 'none', 3000);
}

async function loadProfile() {
    const profile = await requireAuth(['adviser']);
    if (!profile) return;

    window._profileId = profile.id;

    document.getElementById('profileFirstName').value    = profile.first_name        || '';
    document.getElementById('profileLastName').value     = profile.last_name         || '';
    document.getElementById('profileEmail').value        = profile.email             || '';
    document.getElementById('profilePhone').value        = profile.phone             || '';
    document.getElementById('profileOffice').value       = profile.office_location   || '';
    document.getElementById('profileSpecialization').value = profile.specialization  || '';
    document.getElementById('profileYearsService').value = profile.years_of_service  || '';
    document.getElementById('profileMonHours').value     = profile.office_hours_mon  || '';
    document.getElementById('profileWedHours').value     = profile.office_hours_wed  || '';
    document.getElementById('profileFriHours').value     = profile.office_hours_fri  || '';

    if (profile.title) {
        const titleSelect = document.getElementById('profileTitle');
        if (titleSelect) titleSelect.value = profile.title;
    }

    if (profile.consultation_mode) {
        const modeSelect = document.getElementById('profileConsultMode');
        if (modeSelect) modeSelect.value = profile.consultation_mode;
    }

    const { count } = await supabaseClient
        .from('advisees')
        .select('*', { count: 'exact', head: true })
        .eq('adviser_id', profile.id);

    const totalEl = document.getElementById('profileTotalAdvisees');
    if (totalEl) totalEl.value = `${count || 0} students`;
}

async function saveProfile() {
    const id = window._profileId;
    if (!id) { showToast('Profile not loaded yet.'); return; }

    const updates = {
        first_name        : document.getElementById('profileFirstName').value.trim(),
        last_name         : document.getElementById('profileLastName').value.trim(),
        title             : document.getElementById('profileTitle').value,
        phone             : document.getElementById('profilePhone').value.trim(),
        office_location   : document.getElementById('profileOffice').value.trim(),
        specialization    : document.getElementById('profileSpecialization').value.trim(),
        years_of_service  : document.getElementById('profileYearsService').value.trim(),
        office_hours_mon  : document.getElementById('profileMonHours').value.trim(),
        office_hours_wed  : document.getElementById('profileWedHours').value.trim(),
        office_hours_fri  : document.getElementById('profileFriHours').value.trim(),
        consultation_mode : document.getElementById('profileConsultMode').value,
    };

    const { error } = await supabaseClient
        .from('profiles')
        .update(updates)
        .eq('id', id);

    if (error) {
        console.error('Save profile error:', error);
        showToast('Failed to save profile.');
        return;
    }

    const fullName = `${updates.first_name} ${updates.last_name}`.trim();
    const initials = (updates.first_name[0] || '') + (updates.last_name[0] || '');
    document.querySelectorAll('.dropdown-name').forEach(el => el.textContent = fullName);
    document.querySelectorAll('.dropdown-avatar').forEach(el => el.textContent = initials);
    document.querySelectorAll('.profile-avatar-lg').forEach(el => el.textContent = initials);

    showToast('Profile saved successfully!');
}

document.addEventListener('DOMContentLoaded', () => { loadProfile(); });