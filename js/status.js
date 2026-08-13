import { supabase } from './supabaseClient.js';

let currentRiderData = {
    fullName: "Rider",
    phone: "",
    serialNumber: "",
    bloodType: "--"
};

let currentCoords = { lat: 8.2200, lng: 125.7500 };

// LANGUAGE DICTIONARIES (EN / TL / CEB)
const translations = {
    en: {
        warnTitle: "WARNING TO BYSTANDER",
        warnText: "DO NOT remove the rider's helmet unless they are not breathing. Risk of severe spinal injury!",
        blood: "Blood Type",
        donor: "Organ Donor",
        allergies: "Severe Allergies",
        aidTitle: "Bystander First-Aid Steps",
        locTitle: "Location & GPS Dispatch",
        teleTitle: "BlackBox Crash Telemetry",
        contactTitle: "PH Hotlines & Save Contact",
        aidSteps: `
            <li><strong>1. Airway:</strong> Ensure rider is breathing. Do NOT move their neck.</li>
            <li><strong>2. Bleeding:</strong> Apply firm, direct pressure to heavy bleeding using a clean cloth.</li>
            <li><strong>3. Seizures:</strong> Clear hazards around the rider. Do not put anything in their mouth.</li>
        `
    },
    tl: {
        warnTitle: "BABALA SA MAKAKAKITA",
        warnText: "HUWAG alisin ang helmet ng rider maliban kung hindi siya humihinga. Mapanganib sa leeg at likod!",
        blood: "Uri ng Dugo",
        donor: "Organ Donor",
        allergies: "Malalang Allergen",
        aidTitle: "Unang Lunas (First-Aid)",
        locTitle: "Lokasyon at GPS Dispatch",
        teleTitle: "BlackBox Crash Telemetry",
        contactTitle: "PH Hotlines at I-save ang Contact",
        aidSteps: `
            <li><strong>1. Paghinga:</strong> Siguraduhing humihinga ang rider. HUWAG igalaw ang leeg.</li>
            <li><strong>2. Pagdurugo:</strong> Diinan nang maigi ang sugat gamit ang malinis na tela.</li>
            <li><strong>3. Panginginig:</strong> Hawiin ang mga mapanganib na bagay sa paligid. Huwag lagyan ng kahit ano ang bibig.</li>
        `
    },
    ceb: {
        warnTitle: "PAHAMGNO SA MGA TAO",
        warnText: "AYAW kuhaa ang helmet sa rider gawas kon dili siya naginhawa. Delikado sa ilang olok ug bukit!",
        blood: "Talaan sa Dugo",
        donor: "Organ Donor",
        allergies: "Seryosong Allergy",
        aidTitle: "Unang Tabang (First-Aid)",
        locTitle: "Lokasyon ug GPS Dispatch",
        teleTitle: "BlackBox Crash Telemetry",
        contactTitle: "PH Hotlines ug I-save ang Contact",
        aidSteps: `
            <li><strong>1. Paginjawa:</strong> Siguroha nga naginhawa ang rider. AYAW lihoka ang liog.</li>
            <li><strong>2. Pagdugo:</strong> Pukpukag pag-ayo ang samad gamit ang limpyo nga panapton.</li>
            <li><strong>3. Pagkirig:</strong> Ipahilayo ang mga cundisyon nga makadaut. Ayaw butangi ug unsa sa baba.</li>
        `
    }
};

// 1. ACCORDION TOGGLE
window.toggleAccordion = function(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('open');
};

// 2. LANGUAGE SWITCHER
window.setLanguage = function(lang) {
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    const t = translations[lang] || translations.en;
    document.getElementById('warn-title').innerText = t.warnTitle;
    document.getElementById('warn-text').innerText = t.warnText;
    document.getElementById('label-blood').innerText = t.blood;
    document.getElementById('label-donor').innerText = t.donor;
    document.getElementById('label-allergies').innerText = t.allergies;
    document.getElementById('acc-title-aid').innerText = t.aidTitle;
    document.getElementById('acc-title-loc').innerText = t.locTitle;
    document.getElementById('acc-title-telemetry').innerText = t.teleTitle;
    document.getElementById('acc-title-contacts').innerText = t.contactTitle;
    document.getElementById('aid-steps-content').innerHTML = t.aidSteps;
};

// 3. ZERO-SIGNAL URL FALLBACK PARSER
function parseURLFallback() {
    const params = new URLSearchParams(window.location.search);
    const sn = params.get('sn') || "UNKNOWN";
    const blood = params.get('blood') || "--";
    const contact = params.get('contact') || "";

    document.getElementById('display-sn').innerText = `SN: ${sn}`;
    document.getElementById('val-blood').innerText = blood.toUpperCase();

    if (contact) {
        document.getElementById('btn-main-ice').href = `tel:${contact}`;
        currentRiderData.phone = contact;
    }
}

// 4. FETCH FULL PROFILE FROM SUPABASE
async function fetchEmergencyProfile() {
    const params = new URLSearchParams(window.location.search);
    const serialNumber = params.get('sn');

    if (!serialNumber) return;

    // Fetch profile by serial number
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('serial_number', serialNumber)
        .maybeSingle();

    if (!profile) return;

    // Fetch medical profile using user_id
    const { data: medProfile } = await supabase
        .from('medical_profiles')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();

    // Fetch latest crash telemetry if exists
    const { data: incident } = await supabase
        .from('incident_logs')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    // Populate UI
    currentRiderData.fullName = profile.full_name || "Giacomo Rider";
    currentRiderData.serialNumber = profile.serial_number;

    document.getElementById('rider-name').innerText = currentRiderData.fullName;
    
    if (medProfile) {
        document.getElementById('val-blood').innerText = medProfile.blood_type || "--";
        document.getElementById('val-donor').innerText = medProfile.organ_donor ? "YES" : "NO";
        document.getElementById('val-allergies').innerText = medProfile.allergies || "None Listed";

        if (medProfile.contact_1_phone) {
            document.getElementById('btn-main-ice').href = `tel:${medProfile.contact_1_phone}`;
            currentRiderData.phone = medProfile.contact_1_phone;
        }
    }

    if (incident) {
        document.getElementById('tele-speed').innerText = incident.final_velocity || "N/A";
        document.getElementById('tele-elev').innerText = incident.final_elevation || "N/A";
        
        // Calculate Golden Hour Timer
        if (incident.created_at) {
            const crashTime = new Date(incident.created_at);
            const now = new Date();
            const diffMins = Math.floor((now - crashTime) / (1000 * 60));
            document.getElementById('timer-val').innerText = `${diffMins}m AGO`;
        }
    }
}

// 5. GEOLOCATION & GPS FUNCTIONS
function initGeolocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                currentCoords.lat = pos.coords.latitude.toFixed(4);
                currentCoords.lng = pos.coords.longitude.toFixed(4);
                document.getElementById('loc-coords-display').innerText = `Live Coords: ${currentCoords.lat}° N, ${currentCoords.lng}° E`;
            },
            () => {
                document.getElementById('loc-coords-display').innerText = `Live Coords: 8.2200° N, 125.7500° E (Default)`;
            }
        );
    }
}

window.shareLocationSMS = function() {
    const text = `EMERGENCY: I am with rider ${currentRiderData.fullName}. Location: https://maps.google.com/?q=${currentCoords.lat},${currentCoords.lng}`;
    window.location.href = `sms:${currentRiderData.phone}?body=${encodeURIComponent(text)}`;
};

window.openGoogleMaps = function() {
    window.open(`https://maps.google.com/?q=${currentCoords.lat},${currentCoords.lng}`, '_blank');
};

window.copyCoordinates = function() {
    const coordsStr = `${currentCoords.lat}, ${currentCoords.lng}`;
    navigator.clipboard.writeText(coordsStr).then(() => {
        alert("GPS Coordinates copied to clipboard!");
    });
};

// 6. VCARD GENERATOR (.vcf)
window.downloadVCard = function() {
    const vcardData = 
`BEGIN:VCARD
VERSION:3.0
FN:ICE - ${currentRiderData.fullName}
TEL;TYPE=CELL:${currentRiderData.phone}
NOTE:Giacomo Emergency Contact for Device SN: ${currentRiderData.serialNumber}
END:VCARD`;

    const blob = new Blob([vcardData], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ICE-${currentRiderData.fullName}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    parseURLFallback();      // Instant load offline data from query params
    fetchEmergencyProfile(); // Fetch verified data from Supabase
    initGeolocation();       // Acquire live GPS position
});