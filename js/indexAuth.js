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
    alert("Login failed: " + (error.message || JSON.stringify(error)));
    return;
}

    if (data.user) {
        redirectByRole(data.user.id);
    }
};

async function redirectByRole(userId) {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (error || !profile) {
        console.error("Error fetching profile role:", error);
        window.location.href = 'dashboard/user.html';
        return;
    }

    if (profile.role === 'admin') {
        window.location.href = 'dashboard/admin.html';
    } else {
        window.location.href = 'dashboard/user.html';
    }
}