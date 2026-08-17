import { supabase } from './supabaseClient.js';

const submitBtn = document.getElementById('submitBtn');
const tabUp = document.getElementById('tabUp');
const nameInput = document.getElementById('inName');
const emailInput = document.getElementById('inEmail');
const passInput = document.getElementById('inPass');
const errorBox = document.getElementById('authError');

function showError(message) {
    if (!errorBox) { alert(message); return; }
    errorBox.textContent = message;
    errorBox.style.display = 'block';
}

function clearError() {
    if (!errorBox) return;
    errorBox.style.display = 'none';
    errorBox.textContent = '';
}

function setBusy(busy, label) {
    submitBtn.disabled = busy;
    if (label) submitBtn.textContent = label;
}

submitBtn.addEventListener('click', async () => {
    clearError();
    const isRegister = tabUp.classList.contains('active');
    const email = emailInput.value.trim();
    const password = passInput.value;

    if (!email || !password) {
        showError('Enter both an email and a password.');
        return;
    }

    if (isRegister) {
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
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert([
                {
                    id: data.user.id,
                    full_name: name,
                    is_crashed: false
                }
            ]);

        if (profileError) {
            console.error('Profile creation failed:', profileError);
            setBusy(false, 'Register your device');
            showError('Account created, but profile setup failed: ' + profileError.message);
            return;
        }

        window.location.href = 'medical-onboarding.html';
    }
}

async function handleSignIn(email, password) {
    setBusy(true, 'Signing in...');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        setBusy(false, 'Sign in');
        showError('Login failed: ' + (error.message || 'Please check your email and password.'));
        return;
    }

    if (data.user) {
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
