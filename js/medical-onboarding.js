import { supabase } from './supabaseClient.js';

// Device serial prefixes currently valid for sealing. Only GCMO- is confirmed
// live today (100% of real sealed serials use it, per Task 0's DB audit).
// ELIT-/PROT- are reserved for future device model lines that don't exist
// yet — add them here (one line) once a model actually ships under that
// prefix. Do not add them speculatively; the format list is a fact about
// hardware, not a guess.
const SERIAL_PREFIXES = ['GCMO'];
const SERIAL_DIGITS = 6;
const serialRegex = new RegExp(`^(${SERIAL_PREFIXES.join('|')})-[0-9]{${SERIAL_DIGITS}}$`);

const phoneRegex = /^[0-9]{10}$/;
const RELATIONSHIPS = ['Parent', 'Spouse', 'Sibling', 'Friend', 'Other'];

let currentUser = null;
let unlockedStep = 1;
let currentStep = 1;

const el = (id) => document.getElementById(id);
const announcer = () => el('announcer');

function announce(message) {
    const a = announcer();
    if (a) a.textContent = message;
}

function setHint(id, message, state) {
    const node = el(id);
    if (!node) return;
    node.textContent = message || '';
    node.classList.toggle('field-error', state === 'error');
    node.classList.toggle('field-ok', state === 'ok');
}

function setStatus(stepStatusId, message, kind) {
    const node = el(stepStatusId);
    if (!node) return;
    node.textContent = message;
    node.className = 'save-status show' + (kind ? ' ' + kind : '');
    announce(message);
}

function clearStatus(stepStatusId) {
    const node = el(stepStatusId);
    if (!node) return;
    node.className = 'save-status';
    node.textContent = '';
}

function isNetworkError(error) {
    // Supabase/PostgREST errors carry a structured code; a plain fetch
    // failure (offline, DNS, CORS) does not — that distinction is what
    // separates "couldn't reach the server" from "the server rejected this."
    return !!error && !error.code && !error.details;
}

// --- Init / resume ------------------------------------------------------

async function init() {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
        window.location.href = 'index.html';
        return;
    }
    currentUser = user;

    const { data: profile } = await supabase
        .from('profiles')
        .select('serial_number, device_sealed_at, role')
        .eq('id', user.id)
        .maybeSingle();

    if (profile?.device_sealed_at) {
        // Nothing left to do here.
        window.location.href = profile.role === 'admin' ? 'dashboard/admin.html' : 'dashboard/user.html';
        return;
    }

    const { data: med } = await supabase
        .from('medical_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

    prefill(med);

    if (med?.medical_completed_at && med?.contacts_completed_at) {
        unlockedStep = 3;
    } else if (med?.medical_completed_at) {
        unlockedStep = 2;
    } else {
        unlockedStep = 1;
    }
    currentStep = unlockedStep;

    if (profile?.serial_number) el('serialInput').value = profile.serial_number;

    el('page-root').style.display = 'block';
    renderStep(currentStep);
    updateLivePreview();
}

function prefill(med) {
    if (!med) return;
    if (med.blood_type) el('bloodType').value = med.blood_type;
    if (med.allergies) el('allergies').value = med.allergies;
    if (med.current_medications && med.current_medications !== 'None') el('medications').value = med.current_medications;
    if (med.chronic_conditions && med.chronic_conditions !== 'None') el('chronicConditions').value = med.chronic_conditions;

    if (med.contact_1_name) el('c1Name').value = med.contact_1_name;
    if (med.contact_1_relationship) el('c1Rel').value = med.contact_1_relationship;
    if (med.contact_1_phone) el('c1Phone').value = med.contact_1_phone.replace(/^\+63/, '');
    if (med.contact_2_name) el('c2Name').value = med.contact_2_name;
    if (med.contact_2_relationship) el('c2Rel').value = med.contact_2_relationship;
    if (med.contact_2_phone) el('c2Phone').value = med.contact_2_phone.replace(/^\+63/, '');
    if (med.contact_3_name) el('c3Name').value = med.contact_3_name;
    if (med.contact_3_relationship) el('c3Rel').value = med.contact_3_relationship;
    if (med.contact_3_phone) el('c3Phone').value = med.contact_3_phone.replace(/^\+63/, '');
}

// --- Step rendering -------------------------------------------------------

function renderStep(step) {
    currentStep = step;
    [1, 2, 3].forEach((n) => {
        el(`panel${n}`).classList.toggle('active', n === step);
        const tab = el(`tabStep${n}`);
        const isUnlocked = n <= unlockedStep;
        tab.classList.toggle('unlocked', isUnlocked && n !== step);
        tab.classList.toggle('current', n === step);
        tab.classList.toggle('done', n < unlockedStep || (n === 3 && false));
        tab.disabled = !isUnlocked;
        tab.setAttribute('aria-selected', n === step ? 'true' : 'false');
    });
    el('livePreview').classList.toggle('step3-hidden', step === 3);
    announce(`Step ${step} of 3`);
}

[1, 2, 3].forEach((n) => {
    el(`tabStep${n}`).addEventListener('click', () => {
        if (n <= unlockedStep) renderStep(n);
    });
});

// --- Why-we-ask tooltips ---------------------------------------------------

document.querySelectorAll('.why-ask').forEach((btn) => {
    btn.addEventListener('click', () => {
        const target = el(btn.dataset.target);
        const open = target.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
});

// --- Live preview ----------------------------------------------------------

function updateLivePreview() {
    const name = currentUser?.user_metadata?.full_name || '';
    el('lpName').textContent = name || '—';

    const blood = el('bloodType').value;
    const bloodEl = el('lpBlood');
    bloodEl.textContent = blood || '—';
    bloodEl.classList.toggle('empty', !blood);

    const allergies = el('allergies').value.trim();
    const allergyEl = el('lpAllergies');
    allergyEl.textContent = allergies || '—';
    allergyEl.classList.toggle('empty', !allergies);

    const c1Name = el('c1Name').value.trim();
    const c1Rel = el('c1Rel').value;
    const contactEl = el('lpContact');
    if (c1Name) {
        contactEl.textContent = c1Rel ? `${c1Name} (${c1Rel})` : c1Name;
        contactEl.classList.remove('empty');
    } else {
        contactEl.textContent = '—';
        contactEl.classList.add('empty');
    }
}

['bloodType', 'allergies', 'c1Name', 'c1Rel'].forEach((id) => {
    el(id).addEventListener('input', updateLivePreview);
    el(id).addEventListener('change', updateLivePreview);
});

// --- Phone inputs: digits only ---------------------------------------------

['c1Phone', 'c2Phone', 'c3Phone'].forEach((id) => {
    el(id).addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
});

// --- Serial number live mask + validation ----------------------------------

const serialInput = el('serialInput');
serialInput.addEventListener('input', (e) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (SERIAL_PREFIXES.includes(val) && !val.includes('-')) val += '-';
    const parts = val.split('-');
    if (parts[1] && parts[1].length > SERIAL_DIGITS) {
        val = parts[0] + '-' + parts[1].slice(0, SERIAL_DIGITS);
    }
    e.target.value = val;
    if (!val) { setHint('serialHint', ''); return; }
    setHint('serialHint', serialRegex.test(val) ? '' : `Format: ${SERIAL_PREFIXES[0]}-XXXXXX`, serialRegex.test(val) ? 'ok' : 'error');
});

// --- Enter key submits current step -----------------------------------------

function bindEnter(ids, buttonId) {
    ids.forEach((id) => {
        el(id).addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && el(id).tagName !== 'TEXTAREA') {
                e.preventDefault();
                el(buttonId).click();
            }
        });
    });
}
bindEnter(['bloodType', 'allergies', 'medications', 'chronicConditions'], 'continue1');
bindEnter(['c1Name', 'c1Rel', 'c1Phone', 'c2Name', 'c2Rel', 'c2Phone', 'c3Name', 'c3Rel', 'c3Phone'], 'continue2');
bindEnter(['serialInput'], 'sealBtn');

// --- Step 1: Medical --------------------------------------------------------

el('continue1').addEventListener('click', async () => {
    clearStatus('status1');
    const bloodType = el('bloodType').value;
    const allergies = el('allergies').value.trim();

    if (!bloodType) {
        setHint('allergiesHint', '');
        setStatus('status1', 'Select a blood type before continuing.', 'err');
        return;
    }
    if (!allergies) {
        setHint('allergiesHint', 'Required — enter "None" if you have no known allergies.', 'error');
        setStatus('status1', 'Allergies can\'t be left blank — enter "None" if that\'s accurate.', 'err');
        return;
    }
    setHint('allergiesHint', '', 'ok');

    const btn = el('continue1');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const { error } = await supabase.from('medical_profiles').upsert({
        user_id: currentUser.id,
        blood_type: bloodType,
        allergies,
        current_medications: el('medications').value.trim() || 'None',
        chronic_conditions: el('chronicConditions').value.trim() || 'None',
        medical_completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    btn.disabled = false;
    btn.textContent = 'Save & Continue';

    if (error) {
        setStatus('status1', isNetworkError(error)
            ? 'Couldn\'t reach the server. Your entries are kept — try again.'
            : 'Save failed: ' + error.message, isNetworkError(error) ? 'network' : 'err');
        return;
    }

    setStatus('status1', 'Saved.', 'ok');
    if (unlockedStep < 2) unlockedStep = 2;
    setTimeout(() => renderStep(2), 400);
});

// --- Step 2: Contacts --------------------------------------------------------

el('back2').addEventListener('click', () => renderStep(1));

el('continue2').addEventListener('click', async () => {
    clearStatus('status2');
    const c1Name = el('c1Name').value.trim();
    const c1Rel = el('c1Rel').value;
    const c1Phone = el('c1Phone').value.trim();

    if (!c1Name || !c1Rel || !phoneRegex.test(c1Phone)) {
        setHint('c1Hint', 'Contact 1 needs a name, relationship, and a valid 10-digit phone number.', 'error');
        setStatus('status2', 'Fill in all required fields for Contact 1.', 'err');
        return;
    }
    setHint('c1Hint', '', 'ok');

    const btn = el('continue2');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const c2Name = el('c2Name').value.trim();
    const c2Phone = el('c2Phone').value.trim();
    const c3Name = el('c3Name').value.trim();
    const c3Phone = el('c3Phone').value.trim();

    const { error } = await supabase.from('medical_profiles').upsert({
        user_id: currentUser.id,
        contact_1_name: c1Name,
        contact_1_relationship: c1Rel,
        contact_1_phone: `+63${c1Phone}`,
        contact_2_name: c2Name || null,
        contact_2_relationship: el('c2Rel').value || null,
        contact_2_phone: c2Phone ? `+63${c2Phone}` : null,
        contact_3_name: c3Name || null,
        contact_3_relationship: el('c3Rel').value || null,
        contact_3_phone: c3Phone ? `+63${c3Phone}` : null,
        contacts_completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    btn.disabled = false;
    btn.textContent = 'Save & Continue';

    if (error) {
        setStatus('status2', isNetworkError(error)
            ? 'Couldn\'t reach the server. Your entries are kept — try again.'
            : 'Save failed: ' + error.message, isNetworkError(error) ? 'network' : 'err');
        return;
    }

    setStatus('status2', 'Saved.', 'ok');
    if (unlockedStep < 3) unlockedStep = 3;
    setTimeout(() => renderStep(3), 400);
});

// --- Step 3: Device + Consent + Seal -----------------------------------------

el('back3').addEventListener('click', () => renderStep(2));

el('sealBtn').addEventListener('click', () => {
    clearStatus('status3');
    const serial = serialInput.value.trim();

    if (!serialRegex.test(serial)) {
        setHint('serialHint', `Format: ${SERIAL_PREFIXES[0]}-XXXXXX`, 'error');
        setStatus('status3', 'Enter a valid serial number before sealing.', 'err');
        return;
    }
    if (!el('consentCheck').checked) {
        setStatus('status3', 'You need to agree to the consent statement before sealing.', 'err');
        return;
    }

    el('modalSerial').textContent = serial;
    el('sealModal').classList.add('show');
});

el('modalCancel').addEventListener('click', () => {
    el('sealModal').classList.remove('show');
});

el('modalConfirm').addEventListener('click', async () => {
    const serial = serialInput.value.trim();
    const confirmBtn = el('modalConfirm');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Sealing...';

    const { data: claimed, error: claimError } = await supabase.rpc('claim_device', { p_serial: serial });

    if (claimError) {
        el('sealModal').classList.remove('show');
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Seal it';
        setStatus('status3', isNetworkError(claimError)
            ? 'Couldn\'t reach the server. Nothing was changed — try again.'
            : 'Could not check that serial number: ' + claimError.message, isNetworkError(claimError) ? 'network' : 'err');
        return;
    }

    if (!claimed) {
        el('sealModal').classList.remove('show');
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Seal it';
        setStatus('status3', 'That serial number wasn\'t accepted — it may already be linked to another account, or the sticker may have been misread. Double-check the digits and try again.', 'err');
        return;
    }

    const { error: profileError } = await supabase
        .from('profiles')
        .update({ serial_number: serial, device_sealed_at: new Date().toISOString() })
        .eq('id', currentUser.id);

    el('sealModal').classList.remove('show');
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Seal it';

    if (profileError) {
        setStatus('status3', 'Your device was claimed, but saving it to your profile failed (' + profileError.message + '). Please contact support rather than retrying — the serial is already reserved for you.', 'err');
        return;
    }

    el('preSealContent').style.display = 'none';
    el('sealedState').style.display = 'block';
    announce('Device sealed. Onboarding complete.');
});

// --- Logout ------------------------------------------------------------------

el('logoutBtn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
});

document.addEventListener('DOMContentLoaded', init);
