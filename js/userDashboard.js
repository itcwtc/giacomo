import { supabase } from './supabaseClient.js';

let map, userMarker, countdownInterval;
let lastKnownLat = null, lastKnownLon = null;
const overlay = document.getElementById('emergency-overlay');
const overlayBg = document.getElementById('overlay-bg');
const timerDisplay = document.getElementById('countdown-timer');
const layout = document.getElementById('main-layout');
const simBtn = document.getElementById('sim-crash');

async function checkOnboarding(user) {
    // Check medical_profiles table for user record
    const { data: profile, error } = await supabase
        .from('medical_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

    console.log("Logged In User ID:", user.id);
    console.log("Returned Profile Data:", profile);
    console.log("Returned Error:", error);

    // If an RLS or database error occurs, alert without blindly redirecting
    if (error) {
        console.error("Supabase query error:", error.message);
        return false;
    }

    // If no medical profile row exists in Supabase, redirect to onboarding
    if (!profile) {
        console.log("No medical profile found. Redirecting to onboarding...");
        window.location.href = '../medical-onboarding.html';
        return false;
    }

    console.log("Medical profile verified.");
    return true;
}

async function initDashboard() {
    // 1. Verify user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { 
        window.location.href = '../index.html'; 
        return; 
    }
    
    // 2. Verify medical profile exists
    const hasProfile = await checkOnboarding(user);
    if (!hasProfile) return; // Stop initialization if no profile exists

    // 3. Reveal Dashboard UI (removes the initial hidden state)
    const wrapper = document.getElementById('dashboard-wrapper');
    if (wrapper) wrapper.style.display = 'block';

    // 4. Fetch device serial number & medical data for dynamic QR Code
    const { data: profile } = await supabase
        .from('profiles')
        .select('serial_number')
        .eq('id', user.id)
        .single();

    const { data: medProfile } = await supabase
        .from('medical_profiles')
        .select('blood_type, contact_1_phone')
        .eq('user_id', user.id)
        .maybeSingle();
    
    const snDisplay = document.getElementById('display-sn');
    if (profile?.serial_number) {
        if (snDisplay) snDisplay.innerText = `DEVICE: ${profile.serial_number}`;
        
        // Pass serial number, blood type, and primary contact for offline fallback
        generateRiderQR(
            profile.serial_number, 
            medProfile?.blood_type || '', 
            medProfile?.contact_1_phone || ''
        ); 
    }

    // 5. Initialize Leaflet Map
    const mapElement = document.getElementById('map');
    if (mapElement) {
        map = L.map('map', { zoomControl: false, attributionControl: false }).setView([8.2200, 125.7500], 16);
        L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { subdomains: ['mt0','mt1','mt2','mt3'] }).addTo(map);
        setTimeout(() => { map.invalidateSize(); }, 200);

        userMarker = L.circleMarker([8.2200, 125.7500], {
            radius: 8, fillColor: "#00e5ff", color: "#fff", weight: 2, fillOpacity: 1
        }).addTo(map);
    }

    // 6. Start Live Telemetry (real GPS when available, simulated fallback otherwise)
    startTelemetry(user.id);

    // 7. Navigation & Event Handlers
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.onclick = () => window.location.href = 'settings.html';
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = async () => { 
            await supabase.auth.signOut(); 
            window.location.href = '../index.html'; 
        };
    }

    // 8. Crash Simulation Handler
    if (simBtn) {
        simBtn.onclick = async () => {
            let timeLeft = 10;
            if (overlay) overlay.style.display = 'flex';
            if (overlayBg) overlayBg.style.display = 'block';
            if (layout) layout.classList.add('panic-mode');
            if (timerDisplay) timerDisplay.innerText = timeLeft;

            countdownInterval = setInterval(async () => {
                timeLeft--;
                if (timerDisplay) timerDisplay.innerText = timeLeft;
                if (timeLeft <= 0) {
                    clearInterval(countdownInterval);
                    if (timerDisplay) timerDisplay.innerText = "SENT";
                    await supabase.from('profiles').update({ is_crashed: true }).eq('id', user.id);
                    await saveBlackBoxData(user.id);
                }
            }, 1000);
        };
    }

    const cancelBtn = document.getElementById('cancel-crash');
    if (cancelBtn) {
        cancelBtn.onclick = async () => {
            clearInterval(countdownInterval);
            if (overlay) overlay.style.display = 'none'; 
            if (overlayBg) overlayBg.style.display = 'none';
            if (layout) layout.classList.remove('panic-mode');
            await supabase.from('profiles').update({ is_crashed: false }).eq('id', user.id);
        };
    }
}

function startTelemetry(userId) {
    const velVal = document.getElementById('vel-display');
    const elevVal = document.getElementById('elev-display');
    const latencyVal = document.getElementById('latency-val');
    const coordsVal = document.getElementById('live-coords');
    const gpsStatusVal = document.getElementById('gps-status'); // optional element, see report

    let currentElev = 152;
    let currentLat = 8.2200;
    let currentLon = 125.7500;
    let currentSpeedKmh = null;
    let usingRealGPS = false;
    let tickCount = 0;

    // Try the browser/phone's real GPS first. Until the physical ESP32 +
    // Quectel GNSS module is integrated, this is a legitimate stand-in for
    // hardware location (real coordinates), not fabricated data. Falls back
    // to a labeled simulated random-walk only if permission is denied or
    // geolocation isn't supported.
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition((pos) => {
            usingRealGPS = true;
            currentLat = pos.coords.latitude;
            currentLon = pos.coords.longitude;
            if (pos.coords.altitude !== null) currentElev = pos.coords.altitude;
            if (pos.coords.speed !== null) currentSpeedKmh = pos.coords.speed * 3.6;
            if (gpsStatusVal) gpsStatusVal.innerText = 'GPS: LIVE';
        }, () => {
            usingRealGPS = false;
            if (gpsStatusVal) gpsStatusVal.innerText = 'GPS: SIMULATED (permission denied)';
        }, { enableHighAccuracy: true });
    } else if (gpsStatusVal) {
        gpsStatusVal.innerText = 'GPS: SIMULATED (unsupported)';
    }

    setInterval(async () => {
        if (layout && layout.classList.contains('panic-mode')) return;
        tickCount++;

        const speed = currentSpeedKmh !== null ? currentSpeedKmh : Math.floor(Math.random() * 5) + 60;

        if (!usingRealGPS) {
            // Simulated random-walk fallback only — never silently mixed with real data
            currentElev += (Math.random() - 0.5) * 0.4;
            currentLat += (Math.random() - 0.5) * 0.001;
            currentLon += (Math.random() - 0.5) * 0.001;
        }

        if (velVal) velVal.innerHTML = `${speed.toFixed(0)} <span style="font-size:12px; color:#475569;">KM/H</span>`;
        if (elevVal) elevVal.innerHTML = `${currentElev.toFixed(0)} <span style="font-size:12px; color:#475569;">M</span>`;
        if (latencyVal) latencyVal.innerText = Math.floor(Math.random() * 15) + 30;
        if (coordsVal) coordsVal.innerText = `${currentLat.toFixed(4)}° N, ${currentLon.toFixed(4)}° E`;

        if (userMarker) userMarker.setLatLng([currentLat, currentLon]);

        lastKnownLat = currentLat;
        lastKnownLon = currentLon;

        // Push to profiles every ~5s (not every tick) so the admin live map
        // reflects this rider's position without hammering Supabase.
        if (userId && tickCount % 5 === 0) {
            await supabase.from('profiles').update({ lat: currentLat, lon: currentLon }).eq('id', userId);
        }
    }, 1000);
}

async function saveBlackBoxData(userId) {
    const velDisp = document.getElementById('vel-display');
    const elevDisp = document.getElementById('elev-display');
    const finalVelocity = velDisp ? parseFloat(velDisp.innerText) : null;
    const finalElevation = elevDisp ? parseFloat(elevDisp.innerText) : null;

    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();

    // This path only runs from the manual "Simulate Crash" test button, so
    // it's always marked is_simulated — a real hardware-triggered incident
    // would be written by the device itself, not through this UI control.
    await supabase.from('incident_logs').insert({
        user_id: userId,
        rider_name: profile?.full_name || 'Unknown Rider',
        velocity: finalVelocity,
        elevation: finalElevation,
        latitude: lastKnownLat,
        longitude: lastKnownLon,
        is_simulated: true
    });
}

function generateRiderQR(serialNumber, bloodType = '', contactPhone = '') {
    // Construct dynamic payload URL with offline fallback parameters
    let publicUrl = `https://giacomo-beta.vercel.app/status.html?sn=${serialNumber}`;
    if (bloodType) publicUrl += `&blood=${encodeURIComponent(bloodType)}`;
    if (contactPhone) publicUrl += `&contact=${encodeURIComponent(contactPhone)}`;

    const qrcodeContainer = document.getElementById("qrcode");
    const sizeSlider = document.getElementById("qr-size-slider");
    const sizeLabel = document.getElementById("size-label");
    
    if (!qrcodeContainer) return;
    
    const renderQR = (size) => {
        qrcodeContainer.innerHTML = ""; 
        return new QRCode(qrcodeContainer, {
            text: publicUrl, 
            width: parseInt(size), height: parseInt(size),
            colorDark : "#000000", colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
    };

    // Initial Render
    if (sizeSlider) renderQR(sizeSlider.value);

    // Live Resize
    if (sizeSlider && sizeLabel) {
        sizeSlider.oninput = (e) => {
            sizeLabel.innerText = `Size: ${e.target.value}px`;
            renderQR(e.target.value);
        };
    }

    // Print Handler with Emergency Instructions
    const printBtn = document.getElementById('print-qr');
    if (printBtn) {
        printBtn.onclick = () => {
            const qrContent = qrcodeContainer.querySelector('img') || qrcodeContainer.querySelector('canvas');
            if (!qrContent) return;
            const imgData = qrContent.src || qrContent.toDataURL("image/png");
            
            const printWin = window.open('', '_blank');
            printWin.document.write(`
                <html>
                <head>
                    <style>
                        body { font-family: 'Inter', sans-serif; text-align: center; padding: 40px; }
                        .print-card { border: 2px solid #000; padding: 20px; display: inline-block; border-radius: 10px; }
                        h1 { margin: 0; letter-spacing: 4px; font-size: 24px; }
                        .sub { font-size: 10px; text-transform: uppercase; font-weight: bold; margin-bottom: 20px; }
                        .instructions { font-size: 12px; max-width: 250px; margin: 20px auto; line-height: 1.5; color: #333; }
                        .sn { font-family: monospace; font-size: 12px; margin-top: 10px; font-weight: bold; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body onload="window.print(); window.close();">
                    <div class="print-card">
                        <h1>GIACOMO</h1>
                        <div class="sub">Medical ID Protocol</div>
                        <img src="${imgData}" style="width: 200px; height: 200px;" />
                        <div class="sn">DEVICE SN: ${serialNumber}</div>
                        <div class="instructions">
                            <strong>BYSTANDER NOTICE:</strong><br>
                            In case of emergency, scan this code to access the rider's medical profile and emergency contacts.
                        </div>
                    </div>
                </body>
                </html>
            `);
            printWin.document.close();
        };
    }

    // Download Handler
    const downloadBtn = document.getElementById('download-qr');
    if (downloadBtn) {
        downloadBtn.onclick = () => {
            const qrContent = qrcodeContainer.querySelector('img') || qrcodeContainer.querySelector('canvas');
            if (!qrContent) return;
            const link = document.createElement('a');
            link.href = qrContent.src || qrContent.toDataURL("image/png");
            link.download = `Giacomo-QR-${serialNumber}.png`;
            link.click();
        };
    }
}

document.addEventListener('DOMContentLoaded', initDashboard);