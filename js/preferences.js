import { supabase } from './supabaseClient.js';

const COOKIE_NAME = 'giacomo_prefs';
const COOKIE_MAX_AGE_DAYS = 365;

// Kept in sync with the inline pre-paint snippet in each page's <head> —
// see applyPrefsFromCookie() there. This module's job is only to reconcile
// the cookie with the server (Supabase is the source of truth so a
// preference follows the rider across devices, not just one browser) and
// to render the actual Accessibility controls on settings.html.

function readCookie() {
    const match = document.cookie.match(new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]*)'));
    if (!match) return null;
    try {
        return JSON.parse(decodeURIComponent(match[1]));
    } catch {
        return null;
    }
}

function writeCookie(prefs) {
    const value = encodeURIComponent(JSON.stringify(prefs));
    const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
    document.cookie = `${COOKIE_NAME}=${value}; max-age=${maxAge}; path=/; samesite=lax`;
}

function applyPrefs(prefs) {
    const html = document.documentElement;
    html.setAttribute('data-text-scale', prefs.textScale || 'normal');
    html.setAttribute('data-high-contrast', prefs.highContrast ? 'true' : 'false');
    html.setAttribute('data-reduce-motion', prefs.reduceMotion ? 'true' : 'false');
}

// Called on every page, after the inline cookie snippet has already applied
// a same-render-frame guess. Reconciles against Supabase (the real source of
// truth) once auth resolves — corrects any stale/missing cookie and re-syncs
// the cookie so the NEXT page load's pre-paint snippet has fresh data.
export async function syncPreferences() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('user_preferences')
        .select('text_scale, high_contrast, reduce_motion')
        .eq('user_id', user.id)
        .maybeSingle();

    if (error || !data) return null;

    const prefs = {
        textScale: data.text_scale,
        highContrast: data.high_contrast,
        reduceMotion: data.reduce_motion,
    };
    applyPrefs(prefs);
    writeCookie(prefs);
    return prefs;
}

export async function savePreferences(prefs) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not signed in') };

    const { error } = await supabase.from('user_preferences').upsert({
        user_id: user.id,
        text_scale: prefs.textScale,
        high_contrast: prefs.highContrast,
        reduce_motion: prefs.reduceMotion,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (!error) {
        applyPrefs(prefs);
        writeCookie(prefs);
    }
    return { error };
}

export function currentPrefsFromCookie() {
    return readCookie() || { textScale: 'normal', highContrast: false, reduceMotion: false };
}
