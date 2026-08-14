import { supabase } from './supabaseClient.js';

// STATE STORAGE
let currentRider = {
    fullName: "Rider",
    phone: "",
    serialNumber: "",
    bloodType: "--"
};

// CARAGA REGION INSTITUTIONAL HOTLINE DATASET (WITH GPS COORDINATES)
const CARAGA_HOTLINES = [
    { name: "Manuel J. Santos Hospital (Butuan)", category: "Trauma Hospital", phone: "0858152222", lat: 8.9482, lng: 125.5431 },
    { name: "ACE Medical Center Butuan", category: "Hospital ER", phone: "09270572227", lat: 8.9389, lng: 125.5342 },
    { name: "BCDRRMO Rescue (Butuan City)", category: "Disaster Rescue", phone: "0858151558", lat: 8.9475, lng: 125.5361 },
    { name: "Red Cross Butuan Chapter", category: "Medical Dispatch", phone: "0853415121", lat: 8.9490, lng: 125.5380 },
    { name: "RDRRMC / OCD Caraga", category: "Regional Disaster", phone: "09399381643", lat: 8.9480, lng: 125.5400 },
    { name: "DO Plaza Memorial Hospital (Agusan del Sur)", category: "Provincial Hospital", phone: "0852421061", lat: 8.6015, lng: 125.9080 },
    { name: "Caraga Regional Hospital (Surigao City)", category: "Tertiary Hospital", phone: "0868262459", lat: 9.7891, lng: 125.4921 },
    { name: "Adela Serra Ty Memorial Hospital (Tandag)", category: "Tertiary Hospital", phone: "0862114306", lat: 9.0768, lng: 126.1971 },
    { name: "Siargao Island Medical Center (Dapa)", category: "District Hospital", phone: "09489006922", lat: 9.7571, lng: 126.0526 },
    { name: "PNP Regional Command 13", category: "Police Command", phone: "09985987321", lat: 8.9450, lng: 125.5410 }
];

// LANGUAGE DICTIONARIES
const TRANSLATIONS = {
    en: {
        bannerTitle: "CRITICAL FIRST RESPONDER NOTICE",
        bannerBody: "Do <strong>NOT</strong> remove helmet or move rider's neck unless breathing is blocked. Incorrect removal causes permanent spinal paralysis.",
        guidance: [
            "<strong>Airway Check:</strong> Look through visor for breathing movement without tilting the rider's head.",
            "<strong>Relieve Strain:</strong> Unclip the helmet chin strap if accessible, but leave the outer shell on.",
            "<strong>Vomiting Protocol:</strong> If the rider vomits, log-roll (turn the head, neck, and torso as one solid unit) to prevent choking."
        ]
    },
    tl: {
        bannerTitle: "BABALA SA UNANG PAPAALAM / BYSTANDER",
        bannerBody: "<strong>HUWAG</strong> alisin ang helmet o igalaw ang leeg ng rider maliban kung hindi siya humihinga. Ang maling pag-alis ay nagdudulot ng permanenteng paralisis.",
        guidance: [
            "<strong>Pagsuri ng Hininga:</strong> Tumingin sa visor kung tumataas ang dibdib nang hindi ginagalaw ang ulo.",
            "<strong>Bawasan ang Sakal:</strong> Tanggalin lamang ang lock ng strap ng helmet kung abot, ngunit iwanan ang helmet sa ulo.",
            "<strong>Kapag Sumusuka:</strong> Kung sumusuka ang rider, iikot ang buong katawan (ulo, leeg, at katawan bilang isang buo) upang hindi mabulunan."
        ]
    },
    ceb: {
        bannerTitle: "PAHAMGNO SA UNANG TABANG",
        bannerBody: "<strong>AYAW</strong> kuhaa ang helmet o lihoka ang liog sa rider gawas kon dili siya naginhawa. Ang sayop nga pagkuha makadaut sa bukit ug kasina.",
        guidance: [
            "<strong>Susiha ang Ginhawa:</strong> Tan-awa sa visor kon naglihok ang dughan nga wala gilihok ang ulo.",
            "<strong>Luhagi ang Strap:</strong> Tangtanga ang lock sa strap kon maabot, apan ibabilin ang helmet sa ulo.",
            "<strong>Kon Magsuka:</strong> Kon mag-suka ang rider, ilingin ang tibuok lawas (ulo, liog, ug lawas nga magtinabangay) para dili matuk-an."
        ]
    }
};

let currentLang = 'en';

// HAVERSINE DISTANCE FORMULA IN KILOMETERS
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// RENDER REGIONAL HOTLINES (OPTIONALLY SORTED BY DISTANCE)
function renderRegionalHotlines(userLat = null, userLng = null) {
    const container = document.getElementById('regional-hotlines-container');
    const recSection = document.getElementById('recommended-responder-section');
    const recCard = document.getElementById('recommended-responder-card');
    
    let list = [...CARAGA_HOTLINES];

    if (userLat !== null && userLng !== null) {
        list = list.map(item => ({
            ...item,
            distance: calculateDistance(userLat, userLng, item.lat, item.lng)
        })).sort((a, b) => a.distance - b.distance);

        // Highlight nearest responder
        const nearest = list[0];
        recSection.style.display = 'block';
        recCard.innerHTML = `
            <a href="tel:${nearest.phone}" class="contact-btn recommended-btn">
                <div class="contact-info">
                    <span class="badge-nearest">⚡ NEAREST RESPONDER (${nearest.distance.toFixed(1)} km)</span>
                    <div class="facility-name">${nearest.name.toUpperCase()}</div>
                    <span class="facility-cat">${nearest.category}</span>
                </div>
                <div class="call-icon">📞</div>
            </a>
        `;

        // Render remaining facilities
        list = list.slice(1);
    }

    container.innerHTML = "";
    list.forEach(facility => {
        const distTag = facility.distance !== undefined ? `<span class="dist-pill">${facility.distance.toFixed(1)} km</span>` : '';
        container.innerHTML += `
            <a href="tel:${facility.phone}" class="contact-btn secondary-contact">
                <div class="contact-info">
                    <span>${facility.category.toUpperCase()} ${distTag}</span>
                    <div>${facility.name}</div>
                </div>
                <div class="call-icon secondary">📞</div>
            </a>
        `;
    });
}

// ZERO-SIGNAL OFFLINE URL FALLBACK PARSER
function parseUrlFallback() {
    const params = new URLSearchParams(window.location.search);
    const sn = params.get('sn');
    const blood = params.get('blood');
    const contact = params.get('contact');

    if (sn) currentRider.serialNumber = sn.toUpperCase();
    if (blood) {
        document.getElementById('blood-type').innerText = blood.toUpperCase();
        currentRider.bloodType = blood.toUpperCase();
    }
    if (contact) {
        currentRider.phone = contact;
        const container = document.getElementById('contacts-container');
        container.innerHTML = `
            <a href="tel:${contact}" class="contact-btn personal-contact">
                <div class="contact-info">
                    <span>PRIMARY EMERGENCY CONTACT (OFFLINE DATA)</span>
                    <div>EMERGENCY CALL</div>
                </div>
                <div class="call-icon">📞</div>
            </a>`;
        document.getElementById('download-vcard-btn').style.display = 'block';
    }
}

// MAIN DATA FETCHING FUNCTION
async function fetchStatus() {
    const params = new URLSearchParams(window.location.search);
    const sn = params.get('sn');
    
    // Parse offline URL parameters immediately for zero-signal fallback
    parseUrlFallback();

    if (!sn) { 
        if (!currentRider.phone) showErr(); 
        return; 
    }

    const { data, error } = await supabase.rpc('get_rider_status_by_sn', { target_sn: sn.toUpperCase() });

    if (error || !data || data.length === 0) { 
        if (!currentRider.phone) showErr(); 
        return; 
    }

    const rider = data[0];

    currentRider.fullName = rider.full_name;
    document.getElementById('rider-name').innerText = rider.full_name;
    document.getElementById('blood-type').innerText = rider.blood_type || 'UNKNOWN';
    document.getElementById('allergies').innerText = rider.allergies || 'NONE';
    document.getElementById('chronic-conditions').innerText = rider.chronic_conditions || 'NONE';
    
    if (rider.organ_donor) {
        document.getElementById('donor-badge').style.display = 'inline-block';
    }

    if (rider.is_crashed) {
        const { data: log } = await supabase
            .from('incident_logs')
            .select('timestamp') 
            .eq('rider_name', rider.full_name)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();

        if (log) {
            const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            document.getElementById('impact-time').innerText = time;
            document.getElementById('impact-section').style.display = 'block';
        }
    }

    // RENDER PINNED PERSONAL CONTACTS
    const container = document.getElementById('contacts-container');
    container.innerHTML = ""; 

    let hasContact = false;
    for (let i = 1; i <= 3; i++) {
        const name = rider[`contact_${i}_name`];
        const phone = rider[`contact_${i}_phone`];
        
        if (name && phone) {
            if (i === 1) currentRider.phone = phone;
            hasContact = true;
            container.innerHTML += `
                <a href="tel:${phone}" class="contact-btn personal-contact">
                    <div class="contact-info">
                        <span>PERSONAL EMERGENCY CONTACT ${i}</span>
                        <div>${name.toUpperCase()}</div>
                    </div>
                    <div class="call-icon">📞</div>
                </a>`;
        }
    }

    if (hasContact) {
        document.getElementById('download-vcard-btn').style.display = 'block';
    }

    renderRegionalHotlines();
}

function showErr() {
    document.getElementById('status-content').style.display = 'none';
    document.getElementById('error-screen').style.display = 'block';
}

// LANGUAGE SWITCHER HANDLER
function applyLanguage(lang) {
    currentLang = lang;
    const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
    
    document.getElementById('banner-title-text').innerText = t.bannerTitle;
    document.getElementById('banner-body-text').innerHTML = t.bannerBody;

    const guidanceList = document.getElementById('guidance-list-container');
    guidanceList.innerHTML = t.guidance.map(item => `<li>${item}</li>`).join('');

    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.dataset.lang === lang) {
            btn.style.background = '#ff2e43';
            btn.style.color = '#ffffff';
        } else {
            btn.style.background = 'transparent';
            btn.style.color = '#94a3b8';
        }
    });
}

document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.onclick = () => applyLanguage(btn.dataset.lang);
});

// TRIAGE QUICK SELECTOR HANDLERS
document.getElementById('triage-conscious').onclick = () => {
    document.getElementById('banner-title-text').innerText = "🟢 TRIAGE: CONSCIOUS RIDER";
    document.getElementById('banner-body-text').innerHTML = "Keep the rider seated and calm. Do <strong>NOT</strong> remove helmet unless requested. Check for hidden fractures or numbness.";
};

document.getElementById('triage-unconscious').onclick = () => {
    document.getElementById('banner-title-text').innerText = "🟡 TRIAGE: UNCONSCIOUS RIDER";
    document.getElementById('banner-body-text').innerHTML = "CRITICAL: Do <strong>NOT</strong> move head or neck. Check if chest is rising. Call 911 / Caraga Emergency Hospital immediately!";
};

document.getElementById('triage-bleeding').onclick = () => {
    document.getElementById('banner-title-text').innerText = "🔴 TRIAGE: SEVERE BLEEDING";
    document.getElementById('banner-body-text').innerHTML = "Apply firm, direct pressure on the bleeding wound using a clean cloth immediately. Keep rider still and elevated if possible.";
};

// NIGHTTIME ROAD STROBE BEACON
let strobeInterval = null;
let strobeState = false;

document.getElementById('toggle-strobe-btn').onclick = () => toggleStrobe();
document.getElementById('strobe-overlay').onclick = () => toggleStrobe();

function toggleStrobe() {
    const overlay = document.getElementById('strobe-overlay');
    if (strobeInterval) {
        clearInterval(strobeInterval);
        strobeInterval = null;
        overlay.style.display = 'none';
    } else {
        overlay.style.display = 'block';
        strobeInterval = setInterval(() => {
            if (strobeState) {
                overlay.style.backgroundColor = '#dc2626';
                overlay.style.color = '#ffffff';
            } else {
                overlay.style.backgroundColor = '#ffffff';
                overlay.style.color = '#000000';
            }
            strobeState = !strobeState;
        }, 180);
    }
}

// VCARD GENERATOR
document.getElementById('download-vcard-btn').onclick = () => {
    const vcardData = 
`BEGIN:VCARD
VERSION:3.0
FN:ICE - ${currentRider.fullName}
TEL;TYPE=CELL:${currentRider.phone}
NOTE:Giacomo Emergency Contact | Blood Type: ${currentRider.bloodType} | SN: ${currentRider.serialNumber}
END:VCARD`;

    const blob = new Blob([vcardData], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ICE-${currentRider.fullName.replace(/\s+/g, '_')}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
};

// FIRST-AID GUIDANCE DRAWER TOGGLE
document.getElementById('toggle-guidance-btn').onclick = () => {
    const drawer = document.getElementById('guidance-drawer');
    const btn = document.getElementById('toggle-guidance-btn');
    if (drawer.style.display === 'block') {
        drawer.style.display = 'none';
        btn.querySelector('span').innerText = 'SHOW FIRST-AID STEPS';
    } else {
        drawer.style.display = 'block';
        btn.querySelector('span').innerText = 'HIDE FIRST-AID STEPS';
    }
};

// BYSTANDER LOCATION TRIGGER & PROXIMITY CALCULATOR
document.getElementById('share-location').onclick = () => {
    const statusText = document.getElementById('location-status');
    if (!navigator.geolocation) { statusText.innerText = "GPS NOT SUPPORTED"; return; }
    statusText.innerText = "ACQUIRING SATELLITE FIX...";
    
    navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        renderRegionalHotlines(lat, lng);

        const mapLink = `https://www.google.com/maps?q=${lat},${lng}`;
        const msg = `EMERGENCY: I found a crashed rider (${currentRider.fullName}). Location: ${mapLink}`;
        
        if (navigator.share) {
            navigator.share({ title: 'Giacomo Emergency Location', text: msg, url: mapLink });
        } else { 
            window.open(`sms:?body=${encodeURIComponent(msg)}`, '_blank'); 
        }
        statusText.innerText = "LOCATION SENT & HOTLINES SORTED BY PROXIMITY";
    }, () => { statusText.innerText = "LOCATION PERMISSION DENIED"; });
};

// REGISTER SERVICE WORKER FOR OFFLINE PWA CACHING
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('./js/sw.js', { scope: '/' })
            .catch(err => console.log('SW registration failed:', err));
    });
}

// INITIALIZE
fetchStatus();