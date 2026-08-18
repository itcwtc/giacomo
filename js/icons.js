// Minimal inline-SVG icon set — replaces emoji used in an icon role across
// status.html/status.js/adminDashboard.js. Reason: emoji glyph shape,
// color, and even presence vary by OS/browser/font (a status/warning icon
// on a first-aid page shouldn't depend on which emoji font rendered),
// where a single-color inline SVG renders identically everywhere. Kept
// deliberately plain (line/solid icons, no gradients or multi-color
// glyphs) to match this page's existing high-contrast aesthetic exactly —
// this is a reliability fix, not a redesign.
export const ICONS = {
    siren: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a5 5 0 0 0-5 5v6h10V7a5 5 0 0 0-5-5Z"/><path d="M5 13h14v3a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3Z"/><path d="M9 20h6"/><path d="M12 2v2"/><path d="M5.5 6.5 4 5"/><path d="M18.5 6.5 20 5"/></svg>',
    // Fixed dark octagon (not currentColor) — this sits on the red banner
    // itself, so it needs its own contrast against that background rather
    // than inheriting the surrounding (already-red-on-red) text color.
    stop: '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path d="M7.5 2h9L22 7.5v9L16.5 22h-9L2 16.5v-9L7.5 2Z" fill="#1a0605"/><rect x="11" y="6.5" width="2" height="7.5" fill="#fff"/><rect x="11" y="15.5" width="2" height="2" fill="#fff"/></svg>',
    warning: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 21h20L12 3Z"/><path d="M12 10v5"/><path d="M12 17.5v.01"/></svg>',
    pin: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s7-7.58 7-12.5A7 7 0 0 0 5 9.5C5 14.42 12 22 12 22Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    save: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h11l3 3v15H5V3Z"/><path d="M8 3v6h8V3"/><path d="M8 21v-7h8v7"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/></svg>',
    phone: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h4l2 5-2.5 1.5a12 12 0 0 0 6 6L15 14l5 2v4a2 2 0 0 1-2 2C9.3 22 2 14.7 2 6a2 2 0 0 1 2-2Z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>'
};

// Solid color-coded dot used for the triage selector (was 🟢🟡🔴).
export function dotIcon(color) {
    return `<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="${color}"/></svg>`;
}

// Populates every `<span data-icon="name">` in the document from the map
// above. Called once on page load for the icons baked into static markup;
// icons inserted dynamically (e.g. into innerHTML template strings) use
// ICONS/dotIcon directly instead.
export function hydrateIcons(root = document) {
    root.querySelectorAll('[data-icon]').forEach(node => {
        const name = node.dataset.icon;
        if (name.startsWith('dot:')) {
            node.innerHTML = dotIcon(name.slice(4));
        } else if (ICONS[name]) {
            node.innerHTML = ICONS[name];
        }
    });
}
