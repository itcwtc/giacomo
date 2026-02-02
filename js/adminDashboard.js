import { supabase } from './supabaseClient.js';

const userContainer = document.getElementById('users-container');
const logContainer = document.getElementById('logs-container');
const statRiders = document.getElementById('stat-riders');
const statAlerts = document.getElementById('stat-alerts');
const searchInput = document.getElementById('admin-search');

let map, markers = {}, currentRiders = [];

// Static Data for simulation/UI testing
const dummyUsers = [
    { id: 'D-01', full_name: 'Yani Vegafria', is_crashed: false, serial_number: 'GCMO-1001', lat: 8.235, lon: 125.765, status: 'ACTIVE' },
    { id: 'D-02', full_name: 'Harold Jarina', is_crashed: false, serial_number: 'GCMO-1002', lat: 8.210, lon: 125.740, status: 'ACTIVE' },
    { id: 'D-03', full_name: 'Clint Lloyd Bando', is_crashed: false, serial_number: 'GCMO-1003', lat: 8.245, lon: 125.780, status: 'STATIONARY' },
    { id: 'D-04', full_name: 'Drex Villanueva', is_crashed: false, serial_number: 'GCMO-1004', lat: 8.225, lon: 125.755, status: 'ACTIVE' },
    { id: 'D-05', full_name: 'Giacongot Bajao', is_crashed: false, serial_number: 'GCMO-1005', lat: 8.215, lon: 125.790, status: 'PENDING' },
];

// --- 🛠️ RESET FUNCTION ---
async function resetAllCrashes() {
    const { error } = await supabase
        .from('profiles')
        .update({ is_crashed: false })
        .eq('is_crashed', true);

    if (error) {
        console.error("Error resetting crashes:", error);
    } else {
        alert("All crash alerts cleared.");
    }
}

async function showCrashNotification(user) {
    if (document.getElementById(`notif-${user.id}`)) return;
    const notif = document.createElement('div');
    notif.id = `notif-${user.id}`;
    notif.className = 'crash-popup';
    notif.innerHTML = `
        <div class="popup-title">⚠️ CRASH ALERT</div>
        <div class="popup-name">${user.full_name}</div>
        <button class="popup-btn view-btn" id="go-${user.id}">Locate Signal</button>
        <button class="popup-btn street-btn" id="street-${user.id}">Street View</button>
        <button class="popup-btn ack-btn" id="dismiss-${user.id}">Dismiss</button>
    `;
    document.body.appendChild(notif);

    document.getElementById(`go-${user.id}`).onclick = async () => {
        const lat = user.lat || 8.22;
        const lon = user.lon || 125.75;
        map.flyTo([lat, lon], 18);
        const { data: log } = await supabase.from('incident_logs').select('*').eq('user_id', user.id).order('timestamp', { ascending: false }).limit(1).single();
        if (log) {
            markers[user.id].bindPopup(`
                <div style="text-align:center;">
                    <b style="color:var(--danger);">IMPACT DATA</b><br>
                    <span style="font-size:16px;">${log.velocity || 'N/A'} G</span><br>
                    <span style="font-size:10px; color:#64748b;">Elev: ${log.elevation || 0}m</span>
                </div>
            `).openPopup();
        }
    };

    // FIXED: Street View Logic
    document.getElementById(`street-${user.id}`).onclick = () => {
        const lat = user.lat || 8.22;
        const lon = user.lon || 125.75;
        window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`, '_blank');
    };

    document.getElementById(`dismiss-${user.id}`).onclick = () => notif.remove();
}

function renderUI(users) {
    userContainer.innerHTML = '';
    const term = searchInput.value.toLowerCase();
    const allUsers = [...users, ...dummyUsers];
    const sorted = allUsers.sort((a, b) => b.is_crashed - a.is_crashed);

    sorted.filter(u => u.full_name.toLowerCase().includes(term)).forEach(user => {
        const isEm = user.is_crashed;
        let color = isEm ? '#ff2e43' : (user.status === 'ACTIVE' || user.lat ? '#4ade80' : '#64748b');
        const card = document.createElement('div');
        card.style.cssText = `border-left:4px solid ${color}; background:rgba(255,255,255,0.02); margin-bottom:8px; padding:15px; border-radius:8px; cursor:pointer;`;
        
        const serialLabel = user.id && user.id.toString().startsWith('D-') ? user.serial_number : 'REAL-TIME HARDWARE';
        card.innerHTML = `<b style="color:#fff; font-size:13px;">${user.full_name}</b><br><span style="font-size:9px; color:#475569;">${serialLabel}</span>`;
        
        card.onclick = () => {
            if (user.lat && user.lon) {
                map.flyTo([user.lat, user.lon], 17);
            }
        };

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
    statRiders.innerText = allUsers.length;
    statAlerts.innerText = allUsers.filter(u => u.is_crashed).length;
}

async function loadHistory() {
    const { data: logs } = await supabase.from('incident_logs').select('*').order('timestamp', { ascending: false });
    logContainer.innerHTML = '<h4 class="stat-lbl" style="margin:20px 0 10px 0">Telemetry Logs</h4>';
    logs?.forEach(l => {
        const div = document.createElement('div');
        div.style.cssText = `background:rgba(255,46,67,0.05); padding:12px; border-radius:8px; margin-bottom:8px; border-left:2px solid var(--danger); font-size:11px;`;
        div.innerHTML = `<b>UID: ${l.user_id.substring(0,8)}</b><br>Impact: ${l.velocity}G | Elev: ${l.elevation}m<br><span style="color:#475569; font-size:9px;">${new Date(l.timestamp).toLocaleString()}</span>`;
        logContainer.appendChild(div);
    });
}

searchInput.oninput = () => { 
    renderUI(currentRiders); 
    setTimeout(highlightMatches, 10);
};

async function init() {
    map = L.map('admin-map', { zoomControl: false, attributionControl: false }).setView([8.22, 125.75], 13);
    
    // REVERTED: Using standard Google Hybrid tiles instead of Dark Matter
    L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { 
        subdomains: ['mt0','mt1','mt2','mt3'] 
    }).addTo(map);
    
    // FIXED: Filter out Admin accounts here so they don't appear on map/sidebar
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, lat, lon, is_crashed')
        .eq('role', 'user'); 

    currentRiders = profiles || [];
    renderUI(currentRiders);

    supabase.channel('admin-chan')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, async (payload) => {
            // Refetch only riders on update
            const { data: refreshed } = await supabase
                .from('profiles')
                .select('id, full_name, lat, lon, is_crashed')
                .eq('role', 'user');
            currentRiders = refreshed || [];
            renderUI(currentRiders);
        })
        .subscribe();
}

// --- Navigation & Controls ---
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

document.getElementById('btn-reset-all').onclick = resetAllCrashes;

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