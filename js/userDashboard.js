import { supabase } from './supabaseClient.js';

let map, userMarker, countdownInterval;
const overlay = document.getElementById('emergency-overlay');
const overlayBg = document.getElementById('overlay-bg');
const timerDisplay = document.getElementById('countdown-timer');
const layout = document.getElementById('main-layout');
const simBtn = document.getElementById('sim-crash');

async function checkOnboarding() {
    const { data: { user } } = await supabase.auth.getUser();
    
    // FIXED: Changed 'id' to 'user_id' to match your database column
    const { data: profile, error } = await supabase
        .from('medical_profiles')
        .select('user_id') 
        .eq('user_id', user.id) 
        .single();
    
    // If no profile is found, or if there's an error finding it
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
    
    await checkOnboarding(); // Security check

    const { data: profile } = await supabase.from('profiles').select('serial_number').eq('id', user.id).single();
    
    // Safety check for display-sn element
    const snDisplay = document.getElementById('display-sn');
    if (profile?.serial_number && snDisplay) {
        snDisplay.innerText = `DEVICE: ${profile.serial_number}`;
        generateRiderQR(profile.serial_number); // Generate QR once serial is confirmed
    }

    // Leaflet Map Initialization
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

    // --- LISTENERS ---
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
        // Add layout check to prevent error if layout is missing
        if (layout && !layout.classList.contains('panic-mode')) {
            let speed = Math.floor(Math.random() * 5) + 60; 
            
            // Safety checks for each innerText/innerHTML assignment
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
    // UPDATED: Points to your new Vercel production URL
    const publicUrl = `https://giacomo-beta.vercel.app/status.html?sn=${serialNumber}`;
    
    const qrcodeContainer = document.getElementById("qrcode");
    if (!qrcodeContainer) return;
    
    qrcodeContainer.innerHTML = ""; 
    new QRCode(qrcodeContainer, {
        text: publicUrl, 
        width: 120, height: 120,
        colorDark : "#000000", colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
}

    // Handle Download
    const downloadBtn = document.getElementById('download-qr');
    if (downloadBtn) {
        downloadBtn.onclick = () => {
            const qrImage = qrcodeContainer.querySelector('img');
            if (qrImage) {
                const link = document.createElement('a');
                link.href = qrImage.src;
                link.download = `Giacomo-QR-${serialNumber}.png`;
                link.click();
            }
        };
    }
document.addEventListener('DOMContentLoaded', initDashboard);