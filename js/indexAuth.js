import { supabase } from './supabaseClient.js';

const loginForm = document.getElementById('login-form');

loginForm.onsubmit = async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // 1. Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        alert("Login failed: " + error.message);
        return;
    }

    if (data.user) {
        redirectByRole(data.user.id, data.user.email);
    }
};

async function redirectByRole(userId, email) {
    // 2. HARDCODED ADMIN CHECK (Your email)
    const myAdminEmail = "jamieralcheon30@gmail.com"; 

    if (email === myAdminEmail) {
        console.log("Admin detected. Redirecting to Command Center...");
        window.location.href = 'dashboard/admin.html';
        return;
    }

    // 3. Check Database Role for others
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (error || !profile) {
        console.error("Error fetching profile:", error);
        // Fallback: If no profile exists yet, treat as user
        window.location.href = 'dashboard/user.html';
        return;
    }

    // 4. Redirect based on the 'role' column in your 'profiles' table
    if (profile.role === 'admin') {
        window.location.href = 'dashboard/admin.html';
    } else {
        window.location.href = 'dashboard/user.html';
    }
}