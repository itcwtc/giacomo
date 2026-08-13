import { supabase } from './supabaseClient.js';

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

// MAIN DATA FETCHING FUNCTION
async function fetchStatus() {
    const params = new URLSearchParams(window.location.search);
    const sn = params.get('sn');
    if (!sn) { showErr(); return; }

    const { data, error } = await supabase.rpc('get_rider_status_by_sn', { target_sn: sn.toUpperCase() });

    if (error || !data || data.length === 0) { 
        showErr(); 
        return; 
    }

    const rider = data[0];

    document.getElementById('rider-name').innerText = rider.full_name;
    document.getElementById('blood-type').innerText = rider.blood_type || 'UNKNOWN';
    document.getElementById('allergies').innerText = rider.allergies || 'NONE';
    document.getElementById('chronic-conditions').innerText = rider.chronic_conditions || 'NONE';
    
    if (rider.organ_donor) {
        document.getElementById('donor-badge').style.display = 'block';
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

    for (let i = 1; i <= 3; i++) {
        const name = rider[`contact_${i}_name`];
        const phone = rider[`contact_${i}_phone`];
        
        if (name && phone) {
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

    renderRegionalHotlines();
}

function showErr() {
    document.getElementById('status-content').style.display = 'none';
    document.getElementById('error-screen').style.display = 'block';
}

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
        const msg = `EMERGENCY: I found a crashed rider. Location: ${mapLink}`;
        
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
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
    });
}

fetchStatus();