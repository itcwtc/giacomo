import { supabase } from './supabaseClient.js';
import { syncPreferences, savePreferences, currentPrefsFromCookie } from './preferences.js';

const scaleGroup = document.getElementById('scaleGroup');
const scaleButtons = Array.from(scaleGroup.querySelectorAll('.scale-btn'));
const contrastToggle = document.getElementById('highContrastToggle');
const motionToggle = document.getElementById('reduceMotionToggle');
const status = document.getElementById('a11yStatus');

let prefs = { textScale: 'normal', highContrast: false, reduceMotion: false };
// Captured once in init() below, reused by persist() — see preferences.js
// for why this isn't re-fetched at click/change time.
let currentUserId = null;

function renderControls() {
    scaleButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.scale === prefs.textScale));
    contrastToggle.checked = !!prefs.highContrast;
    motionToggle.checked = !!prefs.reduceMotion;
}

function showStatus(message) {
    status.textContent = message;
    if (message) setTimeout(() => { if (status.textContent === message) status.textContent = ''; }, 2000);
}

async function persist() {
    showStatus('Saving...');
    const { error } = await savePreferences(prefs, currentUserId);
    showStatus(error ? 'Couldn\'t save — try again.' : 'Saved.');
}

scaleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
        prefs.textScale = btn.dataset.scale;
        renderControls();
        persist();
    });
});

contrastToggle.addEventListener('change', () => {
    prefs.highContrast = contrastToggle.checked;
    persist();
});

motionToggle.addEventListener('change', () => {
    prefs.reduceMotion = motionToggle.checked;
    persist();
});

(async function init() {
    // Cookie value first (already applied to <html> by the pre-paint snippet,
    // this just reflects it in the UI immediately), then the real Supabase
    // round-trip corrects it if the cookie was stale or this is a new device.
    prefs = currentPrefsFromCookie();
    renderControls();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    currentUserId = user.id;

    const synced = await syncPreferences();
    if (synced) {
        prefs = synced;
        renderControls();
    }
})();
