import { supabase } from './supabaseClient.js';

const registerForm = document.getElementById('register-form');

registerForm.onsubmit = async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    // 1. Register user in Supabase Auth
    const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: name }
        }
    });

    if (authError) {
        alert("Registration Error: " + authError.message);
        return;
    }

    // 2. Insert profile record (without 'email')
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
            console.error("Profile creation failed:", profileError);
            alert("Account created, but profile initialization failed: " + profileError.message);
        } else {
            alert("Account created! Redirecting to medical setup...");
            window.location.href = 'medical-onboarding.html';
        }
    }
};