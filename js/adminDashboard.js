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

async function resetAllCrashes() {
    const { error } = await supabase.from('profiles').update({ is_crashed: false }).eq('is_crashed', true);
    if (!error) alert("All crash alerts cleared.");
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

    document.getElementById(`go-${user.id}`).onclick = () => {
        map.flyTo([user.lat, user.lon], 18);
    };

    document.getElementById(`street-${user.id}`).onclick = () => {
        window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${user.lat},${user.lon}`, '_blank');
    };

    document.getElementById(`dismiss-${user.id}`).onclick = () => notif.remove();
}

function renderUI(users) {
    userContainer.innerHTML = '';
    const term = searchInput.value.toLowerCase();
    const allUsers = [...users, ...dummyUsers];
    
    allUsers.filter(u => u.full_name.toLowerCase().includes(term)).forEach(user => {
        const isEm = user.is_crashed;
        let color = isEm ? '#ff2e43' : (user.lat ? '#4ade80' : '#64748b');
        
        const card = document.createElement('div');
        card.style.cssText = `border-left:4px solid ${color}; background:rgba(255,255,255,0.02); margin-bottom:8px; padding:15px; border-radius:8px; cursor:pointer; color: white;`;
        card.innerHTML = `<b>${user.full_name}</b><br><small style="color:#64748b">${user.id.startsWith('D-') ? user.serial_number : 'HARDWARE ACTIVE'}</small>`;
        
        card.onclick = () => { if (user.lat) map.flyTo([user.lat, user.lon], 17); };
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

async function init() {
    // 1. Setup Map
    map = L.map('admin-map', { zoomControl: false, attributionControl: false }).setView([8.22, 125.75], 13);
    
    // 2. USE STANDARD TILES (Presentation Safe)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    // FIX: Forces tiles to load if the container was hidden
    setTimeout(() => map.invalidateSize(), 500);
    
    // 3. Initial Load - FILTER ADMINS OUT
    const { data: profiles } = await supabase.from('profiles').select('*').eq('role', 'user');
    currentRiders = profiles || [];
    renderUI(currentRiders);

    // 4. Realtime Listener
    supabase.channel('admin-chan')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async () => {
            const { data: refreshed } = await supabase.from('profiles').select('*').eq('role', 'user');
            currentRiders = refreshed || [];
            renderUI(currentRiders);
        })
        .subscribe();
}

document.addEventListener('DOMContentLoaded', init);
document.getElementById('btn-reset-all').onclick = resetAllCrashes;
searchInput.oninput = () => renderUI(currentRiders);

// mission clock logic stays the same...
setInterval(() => {
    const clock = document.getElementById('mission-clock');
    if (clock) clock.innerText = new Date().toTimeString().split(' ')[0];
}, 1000);