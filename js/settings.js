import { supabase } from './supabaseClient.js';

const serialRegex = /^(GCMO|ELIT|PROT)-[0-9]{6}$/;
const phoneRegex = /^[0-9]{10}$/;

function validateField(input, regex) {
    const check = input.parentNode.querySelector('.check-icon');
    if (regex.test(input.value.trim())) {
        input.classList.add('valid-input');
        if (check) check.style.display = 'block';
        return true;
    } else {
        input.classList.remove('valid-input');
        if (check) check.style.display = 'none';
        return false;
    }
}

async function loadSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profRes, medRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('medical_profiles').select('*').eq('user_id', user.id).single()
    ]);

    if (profRes.data) {
        document.getElementById('rider-name').value = profRes.data.full_name || '';
        const snInput = document.getElementById('serial-num');
        snInput.value = profRes.data.serial_number || '';
        validateField(snInput, serialRegex);
    }

    if (medRes.data) {
        const m = medRes.data;
        document.getElementById('blood-type').value = m.blood_type || '';
        document.getElementById('allergies').value = m.allergies || '';
        document.getElementById('chronic-conditions').value = m.chronic_conditions || '';
        document.getElementById('organ-donor').checked = m.organ_donor || false;
        
        for (let i = 1; i <= 3; i++) {
            const nameEl = document.getElementById(`c${i}-name`);
            const phoneEl = document.getElementById(`c${i}-phone`);
            if(nameEl) nameEl.value = m[`contact_${i}_name`] || '';
            if(phoneEl) {
                phoneEl.value = (m[`contact_${i}_phone`] || '').replace('+63', '');
                validateField(phoneEl, phoneRegex);
            }
        }
    }
}

document.getElementById('serial-num').addEventListener('input', (e) => {
    let val = e.target.value.toUpperCase();
    if (["GCMO", "ELIT", "PROT"].includes(val) && !val.includes("-")) val += "-";
    if (val.includes("-") && val.split("-")[1].length > 6) val = val.split("-")[0] + "-" + val.split("-")[1].substring(0, 6);
    e.target.value = val;
    validateField(e.target, serialRegex);
});

document.querySelectorAll('.phone-edit').forEach(input => {
    input.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        validateField(e.target, phoneRegex);
    });
});

document.getElementById('save-all').onclick = async () => {
    const btn = document.getElementById('save-all');
    const { data: { user } } = await supabase.auth.getUser();

    btn.innerText = "SYNCING...";
    btn.disabled = true;

    const getPhone = (id) => {
        const el = document.getElementById(id);
        const val = el ? el.value.trim() : "";
        return val ? `+63${val}` : "";
    };

    const profileUpdate = supabase.from('profiles').update({
        full_name: document.getElementById('rider-name').value,
        serial_number: document.getElementById('serial-num').value.toUpperCase()
    }).eq('id', user.id);

    const medicalUpdate = supabase.from('medical_profiles').upsert({
        user_id: user.id,
        blood_type: document.getElementById('blood-type').value,
        allergies: document.getElementById('allergies').value || "None",
        chronic_conditions: document.getElementById('chronic-conditions').value || "None",
        organ_donor: document.getElementById('organ-donor').checked,
        contact_1_name: document.getElementById('c1-name').value,
        contact_1_phone: getPhone('c1-phone'),
        contact_2_name: document.getElementById('c2-name').value,
        contact_2_phone: getPhone('c2-phone'),
        contact_3_name: document.getElementById('c3-name').value,
        contact_3_phone: getPhone('c3-phone'),
        updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    const [r1, r2] = await Promise.all([profileUpdate, medicalUpdate]);

    if (!r1.error && !r2.error) {
        alert("SYNC COMPLETE: Emergency data updated.");
    } else {
        alert("Sync Failed: Check connection.");
    }

    btn.innerText = "Save All Changes";
    btn.disabled = false;
};

document.addEventListener('DOMContentLoaded', loadSettings);