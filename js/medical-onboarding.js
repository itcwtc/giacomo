import { supabase } from './supabaseClient.js';

const onboardingForm = document.getElementById('profile-form');
const submitBtn = document.getElementById('submit-btn');
const serialInput = document.getElementById('serial_number');

// Strict 6-digit limit check
const serialRegex = /^(GCMO|ELIT|PROT)-[0-9]{6}$/;
const phoneRegex = /^[0-9]{10}$/; 

// --- Validation UI Helper ---
function validateField(input, regex) {
    const val = input.value.trim();
    const check = input.nextElementSibling;
    
    if (regex.test(val)) {
        input.classList.add('valid-input');
        if (check && check.classList.contains('check-icon')) check.style.display = 'block';
    } else {
        input.classList.remove('valid-input');
        if (check && check.classList.contains('check-icon')) check.style.display = 'none';
    }
}

// Serial Formatting: Auto-dash + Force uppercase + Char blocking
serialInput.addEventListener('input', (e) => {
    let val = e.target.value.toUpperCase();
    
    // Auto-insert dash
    if (["GCMO", "ELIT", "PROT"].includes(val) && !val.includes("-")) {
        val = val + "-";
    }
    
    // Prevent more than 6 digits after the dash
    const parts = val.split('-');
    if (parts[1] && parts[1].length > 6) {
        val = parts[0] + "-" + parts[1].substring(0, 6);
    }
    
    e.target.value = val;
    validateField(e.target, serialRegex);
});

// Phone Input: Numbers only + Strength Meter
document.querySelectorAll('.phone-input').forEach(input => {
    input.addEventListener('input', (e) => {
        let val = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = val;
        validateField(e.target, phoneRegex);
    });
});

// --- Submission Logic ---
onboardingForm.onsubmit = async (e) => {
    e.preventDefault();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!user || userError) {
        alert("Session expired. Please log in again.");
        return;
    }

    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : "";
    };

    const serial = getVal('serial_number').toUpperCase();
    const p1 = getVal('contact_phone_1');
    const p2 = getVal('contact_phone_2');
    const p3 = getVal('contact_phone_3');

    submitBtn.innerText = "Saving...";
    submitBtn.disabled = true;

    // 1. Update Profiles (Serial Number)
    const { error: profileErr } = await supabase
        .from('profiles')
        .update({ serial_number: serial })
        .eq('id', user.id);

    // 2. Save Medical Data - FIXED UPSERT
    const { error: medErr } = await supabase
        .from('medical_profiles')
        .upsert({
            user_id: user.id, 
            blood_type: getVal('blood_type'),
            organ_donor: document.getElementById('organ_donor')?.checked || false,
            allergies: getVal('allergies') || "None",
            chronic_conditions: getVal('chronic_conditions') || "None", // ADDED
            current_medications: "None", 
            contact_1_name: getVal('contact_name_1'),
            contact_1_phone: p1 ? `+63${p1}` : "",
            contact_2_name: getVal('contact_name_2'),
            contact_2_phone: p2 ? `+63${p2}` : "",
            contact_3_name: getVal('contact_name_3'), // ADDED
            contact_3_phone: p3 ? `+63${p3}` : ""   // ADDED
        }, { onConflict: 'user_id' });

    if (!profileErr && !medErr) {
        window.location.replace('dashboard/user.html'); 
    } else {
        console.error("--- GIACOMO DIAGNOSTIC ---");
        console.error("Profile Error:", profileErr);
        console.error("Medical Error:", medErr);
        alert(`Save Failed: ${medErr?.message || profileErr?.message}`);
        submitBtn.innerText = "Complete Setup";
        submitBtn.disabled = false;
    }
};