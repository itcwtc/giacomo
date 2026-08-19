import { supabase } from './supabaseClient.js';
import { ICONS } from './icons.js';

const userContainer = document.getElementById('users-container');
const logContainer = document.getElementById('logs-container');
const statRiders = document.getElementById('stat-riders');
const statAlerts = document.getElementById('stat-alerts');
const searchInput = document.getElementById('admin-search');

let map, markers = {}, currentRiders = [];

let adminStatusTimer = null;
function setAdminStatus(message, kind) {
    const node = document.getElementById('admin-status');
    if (!node) return;
    node.textContent = message;
    node.className = 'admin-status show' + (kind ? ' ' + kind : '');
    clearTimeout(adminStatusTimer);
    adminStatusTimer = setTimeout(() => { node.className = 'admin-status'; }, 4000);
}

// SECURITY DEFINER RPC, not a direct client UPDATE — the direct update was
// silently restricted by RLS's owner-only policy to the admin's own row
// (confirmed live: reported success, changed nothing). The RPC checks
// is_admin() itself and bypasses RLS to actually reach every rider's row.
// Also clears simulated incident_logs history — this absorbed what used
// to be the separate "Reset Simulation Data" button/RPC, so this is now
// the one admin-gated reset action instead of two.
async function resetAllCrashes() {
    const { error } = await supabase.rpc('reset_all_crashes');
    if (error) { console.error("Error resetting crashes:", error); setAdminStatus("Reset failed: " + error.message, 'err'); }
    else setAdminStatus("Crash alerts cleared and simulated history reset.", 'ok');
}

// --- 🛠️ FIXED NOTIFICATION LOGIC ---
async function showCrashNotification(user) {
    if (document.getElementById(`notif-${user.id}`)) return;

    // 1. Audio Alert
    const alertSound = document.getElementById('crash-alert-sound');
    if (alertSound) {
        alertSound.currentTime = 0;
        alertSound.play().catch(() => console.log("Click page once to enable audio."));
    }

    // 2. Visual Alert
    document.body.classList.add('emergency-flash');

    const notif = document.createElement('div');
    notif.id = `notif-${user.id}`;
    notif.className = 'crash-popup';
    notif.innerHTML = `
        <div class="popup-title"><span class="icon">${ICONS.warning}</span> CRASH ALERT</div>
        <div class="popup-name">${user.full_name || 'Rider'}</div>
        <button class="popup-btn view-btn" id="go-${user.id}">Locate Signal</button>
        <button class="popup-btn street-btn" id="street-${user.id}">Street View</button>
        <button class="popup-btn ack-btn" id="dismiss-${user.id}">Dismiss</button>
    `;
    document.body.appendChild(notif);

    // 3. Button Assignments (Wrapped in Timeout to avoid 'null' errors)
    setTimeout(() => {
        const goBtn = document.getElementById(`go-${user.id}`);
        const streetBtn = document.getElementById(`street-${user.id}`);
        const dismissBtn = document.getElementById(`dismiss-${user.id}`);

        if (goBtn) goBtn.onclick = async () => {
            map.flyTo([user.lat, user.lon], 18);
            
            // Telemetry Popup Logic
            const { data: log } = await supabase
                .from('incident_logs')
                .select('*')
                .eq('user_id', user.id)
                .order('timestamp', { ascending: false })
                .limit(1).single();

            if (markers[user.id]) {
                if (log) {
                    const incidentTime = new Date(log.timestamp).toLocaleTimeString();
                    const simTag = log.is_simulated ? `<div style="font-size:9px; color:#eab308; margin-top:4px;"><span class="icon">${ICONS.warning}</span> SIMULATED DATA</div>` : '';
                    markers[user.id].bindPopup(`
                        <div style="text-align:center; min-width:130px;">
                            <b style="color:var(--danger); font-size:10px;">IMPACT DETECTED</b><br>
                            <span style="font-size:22px; font-weight:900;">${log.velocity} G</span><br>
                            <span style="font-size:11px; color:#64748b;">Elev: ${log.elevation}m</span>
                            <hr style="border:0; border-top:1px solid #334155; margin:8px 0;">
                            <span style="font-size:10px; color:#00e5ff;"><span class="icon">${ICONS.clock}</span> ${incidentTime}</span>
                            ${simTag}
                        </div>
                    `).openPopup();
                } else {
                    markers[user.id].bindPopup(`
                        <div style="text-align:center; min-width:130px; font-size:11px; color:#64748b;">
                            No telemetry recorded for this incident yet.
                        </div>
                    `).openPopup();
                }
            }
        };

        if (streetBtn) streetBtn.onclick = () => {
            window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${user.lat},${user.lon}`, '_blank');
        };

        if (dismissBtn) dismissBtn.onclick = () => {
            notif.remove();
            if (document.querySelectorAll('.crash-popup').length === 0) {
                document.body.classList.remove('emergency-flash');
            }
        };
    }, 100);
}

async function renderUI(users) {
    userContainer.innerHTML = '';
    const term = searchInput.value.toLowerCase();
    const { data: { user: adminAuth } } = await supabase.auth.getUser();

    const sorted = [...users].sort((a, b) => b.is_crashed - a.is_crashed);

    sorted.filter(u => (u.full_name || 'Rider').toLowerCase().includes(term)).forEach(user => {
        if (adminAuth && user.id === adminAuth.id) return; 

        const isEm = user.is_crashed;
        let color = isEm ? '#ff2e43' : (user.lat ? '#4ade80' : '#64748b');
        
        const card = document.createElement('div');
        card.style.cssText = `border-left:4px solid ${color}; background:rgba(255,255,255,0.02); margin-bottom:8px; padding:15px; border-radius:8px; cursor:pointer;`;
        
        const serialLabel = user.serial_number || 'NO DEVICE LINKED';
        const simBadge = user.is_simulated ? `<span style="background:#eab308; color:#1a1500; font-size:8px; font-weight:900; padding:1px 5px; border-radius:3px; margin-left:6px;">SIMULATED</span>` : '';
        card.innerHTML = `<b style="color:#fff; font-size:13px;">${user.full_name || 'Rider'}</b>${simBadge}<br><span style="font-size:9px; color:#475569;">${serialLabel}</span>`;
        
        card.onclick = () => { if (user.lat && user.lon) map.flyTo([user.lat, user.lon], 17); };
        userContainer.appendChild(card);
        
        if (markers[user.id]) map.removeLayer(markers[user.id]);
        if (user.lat && user.lon) {
            markers[user.id] = L.marker([user.lat, user.lon], {
                icon: L.divIcon({ 
                    className: isEm ? 'pulse-icon' : '', 
                    html: `<div style="width:12px; height:12px; background:${color}; border-radius:50%; border:2px solid #fff;"></div>`, 
                    iconSize:[12,12] 
                })
            }).addTo(map);
        }
        if (isEm) showCrashNotification(user);
    });
    statRiders.innerText = users.length;
    statAlerts.innerText = users.filter(u => u.is_crashed).length;
}

async function loadHistory() {
    const { data: logs } = await supabase.from('incident_logs').select('*').order('timestamp', { ascending: false });
    logContainer.innerHTML = '<h4 class="stat-lbl" style="margin:20px 0 10px 0">Telemetry Logs</h4>';
    logs?.forEach(l => {
        const div = document.createElement('div');
        div.style.cssText = `background:rgba(255,46,67,0.05); padding:12px; border-radius:8px; margin-bottom:8px; border-left:2px solid var(--danger); font-size:11px;`;
        const simTag = l.is_simulated ? ` <span style="color:#eab308;">(SIMULATED)</span>` : '';
        div.innerHTML = `<b>UID: ${l.user_id.substring(0,8)}</b>${simTag}<br>Impact: ${l.velocity}G | Elev: ${l.elevation}m<br><span style="color:#475569; font-size:9px;">${new Date(l.timestamp).toLocaleString()}</span>`;
        logContainer.appendChild(div);
    });
}

searchInput.oninput = () => { renderUI(currentRiders); setTimeout(highlightMatches, 10); };

async function init() {
    map = L.map('admin-map', { zoomControl: false, attributionControl: false }).setView([8.9500, 125.5300], 13);
    L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { subdomains: ['mt0','mt1','mt2','mt3'] }).addTo(map);
    
    setTimeout(() => { map.invalidateSize(); }, 500);

    // role='user' alone isn't enough — that also matches accounts that
    // registered but never finished onboarding (no device_sealed_at),
    // which would otherwise sit in this list and the "Riders Active"
    // count forever with nothing to show (no serial, no location) and
    // no way to clear them short of a manual DB cleanup. Same
    // device_sealed_at-as-single-source-of-truth rule as the onboarding
    // gate in userDashboard.js's checkOnboarding().
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, lat, lon, is_crashed, serial_number, is_simulated').eq('role', 'user').not('device_sealed_at', 'is', null);
    currentRiders = profiles || [];
    renderUI(currentRiders);

    // Listens to ALL events (INSERTs for new users and UPDATEs for crash status)
    supabase.channel('admin-chan')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async () => {
            const { data: refreshed } = await supabase.from('profiles').select('id, full_name, lat, lon, is_crashed, serial_number, is_simulated').eq('role', 'user').not('device_sealed_at', 'is', null);
            currentRiders = refreshed || [];
            renderUI(currentRiders);
        }).subscribe();
}

// Tab Switching
document.getElementById('btn-tab-live').onclick = (e) => { 
    userContainer.style.display = 'block'; logContainer.style.display = 'none'; 
    e.target.className = 'active-tab'; document.getElementById('btn-tab-logs').className = 'inactive-tab'; 
};

document.getElementById('btn-tab-logs').onclick = (e) => { 
    userContainer.style.display = 'none'; logContainer.style.display = 'block'; 
    e.target.className = 'active-tab'; document.getElementById('btn-tab-live').className = 'inactive-tab'; loadHistory(); 
};

document.getElementById('admin-logout').onclick = async () => { 
    await supabase.auth.signOut(); 
    window.location.href = '../index.html'; 
};

// Reset affects every real rider's crash state, not just test/simulated
// data — in-page confirmation before it fires, same pattern as the
// onboarding seal step (never a native confirm()).
document.getElementById('btn-reset-all').onclick = () => {
    document.getElementById('reset-confirm-overlay').style.display = 'flex';
};
document.getElementById('reset-confirm-cancel').onclick = () => {
    document.getElementById('reset-confirm-overlay').style.display = 'none';
};
document.getElementById('reset-confirm-ok').onclick = async () => {
    document.getElementById('reset-confirm-overlay').style.display = 'none';
    await resetAllCrashes();
};

setInterval(() => {
    const clock = document.getElementById('mission-clock');
    if (clock) clock.innerText = new Date().toTimeString().split(' ')[0];
}, 1000);

const highlightMatches = () => {
    const term = searchInput.value.trim();
    if (!term) return;
    const cards = userContainer.querySelectorAll('b, span');
    cards.forEach(el => {
        const text = el.textContent;
        if (text.toLowerCase().includes(term.toLowerCase())) {
            const regex = new RegExp(`(${term})`, 'gi');
            el.innerHTML = text.replace(regex, `<mark style="background:rgba(0,229,255,0.3); color:#fff; border-radius:2px; padding:0 2px;">$1</mark>`);
        }
    });
};

document.addEventListener('DOMContentLoaded', init);