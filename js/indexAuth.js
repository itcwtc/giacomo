import { supabase } from './supabaseClient.js';

const submitBtn = document.getElementById('submitBtn');
const tabUp = document.getElementById('tabUp');
const nameInput = document.getElementById('inName');
const emailInput = document.getElementById('inEmail');
const passInput = document.getElementById('inPass');
const confirmInput = document.getElementById('inConfirm');
const errorBox = document.getElementById('authError');

const emailHint = document.getElementById('emailHint');
const passHint = document.getElementById('passHint');
const confirmHint = document.getElementById('confirmHint');
const pwdStrength = document.getElementById('pwdStrength');
const pwdStrengthLabel = document.getElementById('pwdStrengthLabel');
const pwdBarSegments = pwdStrength ? Array.from(pwdStrength.querySelectorAll('.pwd-bar span')) : [];

// Informative only, not a submission gate — Supabase's own auth policy is the
// real minimum-length enforcement. 6 matches Supabase's default.
const MIN_PASSWORD_LENGTH = 6;

function showError(message, isNetworkError) {
    errorBox.textContent = message;
    errorBox.style.display = 'block';
    errorBox.classList.toggle('network-error', !!isNetworkError);
}

function clearError() {
    errorBox.style.display = 'none';
    errorBox.textContent = '';
    errorBox.classList.remove('network-error');
}

function setHint(el, message, state) {
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('field-error', state === 'error');
    el.classList.toggle('field-ok', state === 'ok');
}

function setBusy(busy, label) {
    submitBtn.disabled = busy;
    submitBtn.classList.remove('success');
    if (label) submitBtn.textContent = label;
}

function showSuccess(label) {
    submitBtn.disabled = true;
    submitBtn.classList.remove('stamp');
    submitBtn.classList.add('success');
    submitBtn.textContent = label;
}

// --- Live validation -------------------------------------------------

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

emailInput.addEventListener('input', () => {
    const val = emailInput.value.trim();
    if (!val) { setHint(emailHint, ''); return; }
    setHint(emailHint, isValidEmail(val) ? '' : 'That doesn\'t look like a valid email.', isValidEmail(val) ? 'ok' : 'error');
});

function passwordScore(pw) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
}

const STRENGTH_LABELS = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_CLASSES = ['on-weak', 'on-weak', 'on-fair', 'on-good', 'on-strong'];

function updateStrengthMeter(pw) {
    if (!pwdStrength) return;
    const isRegisterMode = tabUp.classList.contains('active');
    if (!isRegisterMode || !pw) {
        pwdStrength.classList.add('hidden');
        return;
    }
    pwdStrength.classList.remove('hidden');
    const score = passwordScore(pw);
    pwdBarSegments.forEach((seg, i) => {
        seg.className = '';
        if (i < score) seg.classList.add(STRENGTH_CLASSES[score]);
    });
    if (pwdStrengthLabel) pwdStrengthLabel.textContent = STRENGTH_LABELS[score];
}

function validatePasswordLength() {
    const pw = passInput.value;
    if (!pw) { setHint(passHint, ''); return; }
    if (pw.length < MIN_PASSWORD_LENGTH) {
        setHint(passHint, `At least ${MIN_PASSWORD_LENGTH} characters.`, 'error');
    } else {
        setHint(passHint, '', 'ok');
    }
}

function validateConfirmMatch() {
    if (!confirmInput) return;
    const confirmVal = confirmInput.value;
    if (!confirmVal) { setHint(confirmHint, ''); return; }
    if (confirmVal !== passInput.value) {
        setHint(confirmHint, 'Passwords don\'t match.', 'error');
    } else {
        setHint(confirmHint, 'Matches.', 'ok');
    }
}

passInput.addEventListener('input', () => {
    updateStrengthMeter(passInput.value);
    validatePasswordLength();
    validateConfirmMatch();
});

if (confirmInput) {
    confirmInput.addEventListener('input', validateConfirmMatch);
}

// --- Show/hide password toggles --------------------------------------

function wireToggle(buttonId, inputEl) {
    const btn = document.getElementById(buttonId);
    if (!btn || !inputEl) return;
    btn.addEventListener('click', () => {
        const showing = inputEl.type === 'text';
        inputEl.type = showing ? 'password' : 'text';
        btn.textContent = showing ? 'SHOW' : 'HIDE';
        btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    });
}
wireToggle('pwdToggle', passInput);
wireToggle('confirmToggle', confirmInput);

// --- Enter key submits ------------------------------------------------

[nameInput, emailInput, passInput, confirmInput].forEach((el) => {
    if (!el) return;
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitBtn.click();
        }
    });
});

// --- Submit -------------------------------------------------------------

submitBtn.addEventListener('click', async () => {
    clearError();
    const isRegister = tabUp.classList.contains('active');
    const email = emailInput.value.trim();
    const password = passInput.value;

    if (!email || !isValidEmail(email)) {
        showError('Enter a valid email address.');
        return;
    }
    if (!password) {
        showError('Enter a password.');
        return;
    }

    if (isRegister) {
        if (confirmInput && password !== confirmInput.value) {
            showError('Passwords don\'t match.');
            return;
        }
        await handleRegister(email, password);
    } else {
        await handleSignIn(email, password);
    }
});

async function handleRegister(email, password) {
    const name = nameInput.value.trim();
    if (!name) {
        showError('Enter your full name to register.');
        return;
    }

    setBusy(true, 'Registering...');

    const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: name }
        }
    });

    if (authError) {
        setBusy(false, 'Register your device');
        showError(authError.message);
        return;
    }

    if (data && data.user) {
        // profiles row is created automatically by the on_auth_user_created ->
        // handle_new_user() trigger (confirmed live in the database) — no
        // manual insert/upsert needed here.
        showSuccess('Account created — redirecting...');
        setTimeout(() => { window.location.href = 'medical-onboarding.html'; }, 500);
    }
}

async function handleSignIn(email, password) {
    setBusy(true, 'Signing in...');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        setBusy(false, 'Sign in');
        // A failed network request (no response at all) surfaces differently
        // than a rejected credential — treat anything without Supabase's
        // structured error shape as a connectivity problem.
        const isNetworkError = !error.status;
        showError(
            isNetworkError
                ? 'Couldn\'t reach the server. Check your connection and try again.'
                : 'Login failed: ' + (error.message || 'Please check your email and password.'),
            isNetworkError
        );
        return;
    }

    if (data.user) {
        showSuccess('Signed in — redirecting...');
        await redirectByRole(data.user.id);
    }
}

async function redirectByRole(userId) {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (error || !profile) {
        console.error('Error fetching profile role:', error);
        window.location.href = 'dashboard/user.html';
        return;
    }

    if (profile.role === 'admin') {
        window.location.href = 'dashboard/admin.html';
    } else {
        window.location.href = 'dashboard/user.html';
    }
}
