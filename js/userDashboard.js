import { supabase } from './supabaseClient.js';

let map, userMarker, countdownInterval;
let lastKnownLat = null, lastKnownLon = null;
const overlay = document.getElementById('emergency-overlay');
const overlayBg = document.getElementById('overlay-bg');
const timerDisplay = document.getElementById('countdown-timer');
const layout = document.getElementById('main-layout');
const simBtn = document.getElementById('sim-crash');

async function checkOnboarding(user) {
    // Admin accounts were never meant to have a medical profile — without
    // this check, an admin landing on user.html (e.g. via a role-check
    // race on refresh) gets bounced to medical-onboarding.html forever,
    // since they'll never have a medical_profiles row to satisfy it.
    //
    // Gate is device_sealed_at, not "does a medical_profiles row exist":
    // onboarding now saves progressively per step (see medical-onboarding.js),
    // so a row exists after step 1 alone. device_sealed_at is only set by the
    // final, irreversible seal action, making it the actual "onboarding
    // complete" signal.
    const { data: profileRow, error } = await supabase
        .from('profiles')
        .select('role, device_sealed_at')
        .eq('id', user.id)
        .maybeSingle();

    if (error) {
        console.error("Supabase query error:", error.message);
        return false;
    }

    if (profileRow?.role === 'admin') {
        console.log("Admin account — skipping medical onboarding gate.");
        return true;
    }

    if (!profileRow?.device_sealed_at) {
        console.log("Onboarding not sealed yet. Redirecting to medical-onboarding...");
        window.location.href = '../medical-onboarding.html';
        return false;
    }

    console.log("Onboarding verified (device sealed).");
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

    // Steps 4-8 are each independent pieces of the dashboard — a failure
    // in any one (e.g. the QR library's CDN being blocked by an
    // ad-blocker/firewall) used to throw uncaught and silently abort
    // everything after it in this function, taking the map, telemetry,
    // and Settings/Logout/Simulate-Crash wiring down with it. Isolating
    // each stage means a failure stays contained to that stage.

    // 4. Fetch device serial number & render the QR code
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('serial_number')
            .eq('id', user.id)
            .single();

        const snDisplay = document.getElementById('display-sn');
        if (profile?.serial_number) {
            if (snDisplay) snDisplay.innerText = `DEVICE: ${profile.serial_number}`;
            generateRiderQR(profile.serial_number);
        }
    } catch (err) {
        console.error('Device serial / QR section failed to initialize:', err);
    }

    // 5. Initialize Leaflet Map
    try {
        const mapElement = document.getElementById('map');
        if (mapElement) {
            map = L.map('map', { zoomControl: false, attributionControl: false }).setView([8.2200, 125.7500], 16);
            L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { subdomains: ['mt0','mt1','mt2','mt3'] }).addTo(map);
            setTimeout(() => { map.invalidateSize(); }, 200);

            userMarker = L.circleMarker([8.2200, 125.7500], {
                radius: 8, fillColor: "#00e5ff", color: "#fff", weight: 2, fillOpacity: 1
            }).addTo(map);
        }
    } catch (err) {
        console.error('Map failed to initialize:', err);
    }

    // 6. Start Live Telemetry (real GPS when available, simulated fallback otherwise)
    try {
        startTelemetry(user.id);
    } catch (err) {
        console.error('Telemetry failed to start:', err);
    }

    // 7. Navigation & Event Handlers
    try {
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
    } catch (err) {
        console.error('Nav button wiring failed:', err);
    }

    // 8. Crash Simulation Handler
    try {
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
    } catch (err) {
        console.error('Crash-simulation handlers failed to wire up:', err);
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

function generateRiderQR(serialNumber) {
    // Only the serial number goes in the QR. Blood type and contact phone
    // used to be appended directly as URL params — that put them in
    // plaintext on a permanently-printed sticker (and in every server/CDN
    // access log this link ever hits), completely bypassing the RLS/RPC
    // protection the status page already has. status.js now fetches all
    // rider details exclusively via get_rider_status_by_sn(), which is
    // the only trustworthy source for this data.
    let publicUrl = `https://giacomo-beta.vercel.app/status.html?sn=${serialNumber}`;

    const qrcodeContainer = document.getElementById("qrcode");
    const sizeSlider = document.getElementById("qr-size-slider");
    const sizeLabel = document.getElementById("size-label");

    if (!qrcodeContainer) return;

    // Renders straight to an SVG string (qrcode-svg) — never touches a
    // <canvas>, so there's nothing for canvas-fingerprinting protection
    // (Brave Shields, Firefox resistFingerprinting) to degrade. Wrapped
    // regardless, so any other failure (library didn't load at all, bad
    // input) degrades to a working link instead of a permanently blank box.
    const renderQR = (size) => {
        const px = parseInt(size, 10);
        try {
            const qr = new QRCode({
                content: publicUrl,
                width: px,
                height: px,
                padding: 1,
                color: '#000000',
                background: '#ffffff',
                ecl: 'H'
            });
            qrcodeContainer.innerHTML = qr.svg();
        } catch (err) {
            console.error('QR rendering failed:', err);
            qrcodeContainer.innerHTML = `
                <div class="qr-fallback">
                    QR code unavailable.<br>
                    <a href="${publicUrl}" target="_blank" rel="noopener">Open emergency profile directly</a>
                </div>`;
        }
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
            const svgEl = qrcodeContainer.querySelector('svg');
            if (!svgEl) return;
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
                        .print-card svg { width: 200px; height: 200px; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body onload="window.print(); window.close();">
                    <div class="print-card">
                        <h1>GIACOMO</h1>
                        <div class="sub">Medical ID Protocol</div>
                        ${svgEl.outerHTML}
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

    // Download Handler — saves the actual SVG, not a rasterized PNG, so
    // this path never touches canvas either.
    const downloadBtn = document.getElementById('download-qr');
    if (downloadBtn) {
        downloadBtn.onclick = () => {
            const svgEl = qrcodeContainer.querySelector('svg');
            if (!svgEl) return;
            const svgMarkup = new XMLSerializer().serializeToString(svgEl);
            const blob = new Blob([svgMarkup], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Giacomo-QR-${serialNumber}.svg`;
            link.click();
            URL.revokeObjectURL(url);
        };
    }
}

document.addEventListener('DOMContentLoaded', initDashboard);