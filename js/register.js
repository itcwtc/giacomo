import { supabase } from './supabaseClient.js';

const registerForm = document.getElementById('register-form');

registerForm.onsubmit = async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

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

    // Inside your registration submit handler, after successful supabase.auth.signUp
if (signUpData.user) {
    const { error: profileError } = await supabase
        .from('profiles')
        .insert([
            { 
                id: signUpData.user.id, 
                full_name: fullName, // Use the name from your form
                email: email,
                is_crashed: false 
            }
        ]);

    if (profileError) {
        console.error("Profile creation failed:", profileError);
        alert("Account created, but profile initialization failed.");
    } else {
        alert("Account created! Redirecting to medical setup...");
        window.location.href = 'medical-onboarding.html';
    }
}
};