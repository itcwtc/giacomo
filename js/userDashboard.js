import { supabase } from './supabaseClient.js';

let map, userMarker, countdownInterval;
const overlay = document.getElementById('emergency-overlay');
const overlayBg = document.getElementById('overlay-bg');
const timerDisplay = document.getElementById('countdown-timer');
const layout = document.getElementById('main-layout');
const simBtn = document.getElementById('sim-crash');

async function checkOnboarding() {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: profile, error } = await supabase
        .from('medical_profiles')
        .select('user_id') 
        .eq('user_id', user.id) 
        .single();
    
    if (!profile || error) {
        console.log("No medical profile found. Redirecting to onboarding...");
        window.location.replace('../medical-onboarding.html');
    } else {
        console.log("Medical profile verified for user:", profile.user_id);
    }
}

async function initDashboard() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '../index.html'; return; }
    
    await checkOnboarding();

    const { data: profile } = await supabase.from('profiles').select('serial_number').eq('id', user.id).single();
    
    const snDisplay = document.getElementById('display-sn');
    if (profile?.serial_number && snDisplay) {
        snDisplay.innerText = `DEVICE: ${profile.serial_number}`;
        generateRiderQR(profile.serial_number); 
    }

    const mapElement = document.getElementById('map');
    if (mapElement) {
        map = L.map('map', { zoomControl: false, attributionControl: false }).setView([8.2200, 125.7500], 16);
        L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { subdomains: ['mt0','mt1','mt2','mt3'] }).addTo(map);
        setTimeout(() => { map.invalidateSize(); }, 200);

        userMarker = L.circleMarker([8.2200, 125.7500], {
            radius: 8, fillColor: "#00e5ff", color: "#fff", weight: 2, fillOpacity: 1
        }).addTo(map);
    }

    startTelemetry();

    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.onclick = () => window.location.href = 'settings.html';
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = async () => { await supabase.auth.signOut(); window.location.href = '../index.html'; };
    }

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

function startTelemetry() {
    const velVal = document.getElementById('vel-display');
    const elevVal = document.getElementById('elev-display');
    const latencyVal = document.getElementById('latency-val');
    const coordsVal = document.getElementById('live-coords');
    let currentElev = 152; 

    setInterval(() => {
        if (layout && !layout.classList.contains('panic-mode')) {
            let speed = Math.floor(Math.random() * 5) + 60; 
            if (velVal) velVal.innerHTML = `${speed} <span style="font-size:12px; color:#475569;">KM/H</span>`;
            currentElev += (Math.random() - 0.5) * 0.4; 
            if (elevVal) elevVal.innerHTML = `${currentElev.toFixed(0)} <span style="font-size:12px; color:#475569;">M</span>`;
            if (latencyVal) latencyVal.innerText = Math.floor(Math.random() * 15) + 30;
            if (coordsVal) coordsVal.innerText = `8.22${Math.floor(Math.random()*99)}° N, 125.75${Math.floor(Math.random()*99)}° E`;
        }
    }, 1000);
}

async function saveBlackBoxData(userId) {
    const velDisp = document.getElementById('vel-display');
    const elevDisp = document.getElementById('elev-display');
    const finalVel = velDisp ? velDisp.innerText : "0 KM/H";
    const finalElev = elevDisp ? elevDisp.innerText : "0 M";
    
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
    await supabase.from('incident_logs').insert({
        user_id: userId,
        rider_name: profile?.full_name || 'Unknown Rider',
        final_velocity: finalVel,
        final_elevation: finalElev
    });
}

function generateRiderQR(serialNumber) {
    const publicUrl = `https://giacomo-beta.vercel.app/status.html?sn=${serialNumber}`;
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
    renderQR(sizeSlider.value);

    // Live Resize
    sizeSlider.oninput = (e) => {
        sizeLabel.innerText = `Size: ${e.target.value}px`;
        renderQR(e.target.value);
    };

    // Print Handler with Emergency Instructions
    document.getElementById('print-qr').onclick = () => {
        const qrContent = qrcodeContainer.querySelector('img') || qrcodeContainer.querySelector('canvas');
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

    // Download Handler
    document.getElementById('download-qr').onclick = () => {
        const qrContent = qrcodeContainer.querySelector('img') || qrcodeContainer.querySelector('canvas');
        const link = document.createElement('a');
        link.href = qrContent.src || qrContent.toDataURL("image/png");
        link.download = `Giacomo-QR-${serialNumber}.png`;
        link.click();
    };
}

document.addEventListener('DOMContentLoaded', initDashboard);