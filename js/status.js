import { supabase } from './supabaseClient.js';

async function loadEmergencyData() {
    // 1. Get Serial Number from URL (e.g., status.html?sn=GCMO-1001)
    const urlParams = new URLSearchParams(window.location.search);
    const serial = urlParams.get('sn');

    if (!serial) {
        document.body.innerHTML = "<h1>No Device ID Found</h1>";
        return;
    }

    // 2. Find the User ID linked to this Serial Number
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('serial_number', serial)
        .single();

    if (pError || !profile) {
        document.body.innerHTML = "<h1>Rider Not Found</h1>";
        return;
    }

    // 3. Get the Medical Data for that User
    const { data: med, error: mError } = await supabase
        .from('medical_profiles')
        .select('*')
        .eq('id', profile.id)
        .single();

    if (med) {
        document.getElementById('rider-name').innerText = profile.full_name;
        document.getElementById('blood-type').innerText = med.blood_type;
        document.getElementById('allergies').innerText = med.allergies;
        document.getElementById('meds').innerText = med.current_medications;
        document.getElementById('contact').innerText = `${med.emergency_contact_name}: ${med.emergency_contact_phone}`;
    }
}

loadEmergencyData();