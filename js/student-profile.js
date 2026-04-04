initShared();

(async function () {
    const profile = await requireAuth(['student']);
    if (!profile) return;
    await loadUserProfile();

    const { data: student } = await supabaseClient
        .from('students')
        .select('*')
        .eq('id', profile.id)
        .single();

    const { data: adviser } = student?.adviser_id
        ? await supabaseClient
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', student.adviser_id)
            .single()
        : { data: null };

    const hero = document.querySelector('.profile-hero');
    if (hero) {
        const initials = (profile.first_name?.[0] || '') + (profile.last_name?.[0] || '');
        const fullName = `${profile.first_name} ${profile.last_name}`;
        hero.querySelector('.profile-avatar-lg').textContent = initials;
        hero.querySelector('h2').textContent = fullName;
        hero.querySelector('.id-text').textContent = `ID No. ${profile.school_id} · ${student?.program || 'N/A'}`;
    }

    const inputs = document.querySelectorAll('.form-control-custom');
    const setInput = (idx, val) => { if (inputs[idx]) inputs[idx].value = val || ''; };

    setInput(0, profile.first_name);
    setInput(1, profile.last_name);
    setInput(2, profile.email);
    setInput(3, profile.phone || '');
    setInput(4, profile.date_of_birth || '');

    if (inputs[5] && profile.gender) {
        const select = inputs[5];
        for (const opt of select.options) {
            if (opt.value === profile.gender) { opt.selected = true; break; }
        }
    }

    setInput(6, profile.school_id);
    setInput(7, student?.program || '');
    setInput(8, 'Gokongwei College of Engineering');
    setInput(9, 'DECEE');
    setInput(10, `Year ${student?.year_level || 'N/A'}`);

    const { data: activeTerm } = await supabaseClient
        .from('terms')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();
    setInput(11, activeTerm ? `AY ${activeTerm.academic_year}` : '');
    setInput(12, '');
    setInput(13, adviser ? `${adviser.first_name} ${adviser.last_name}` : 'Not assigned');
})();
