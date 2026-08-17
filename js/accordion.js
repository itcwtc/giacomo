// Generic accordion toggle: any button.acc-toggle with aria-controls pointing
// at a panel id. Independent expand/collapse — sections don't close each
// other (your call in the task was either/or; independent is friendlier for
// a settings form where someone might want two sections open to compare).
//
// Keyboard support (Enter/Space) comes for free from using a real <button>
// element rather than a click handler on a div — no extra keydown wiring
// needed, and it's more robust than reimplementing it by hand.
document.querySelectorAll('.acc-toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
        const panel = document.getElementById(toggle.getAttribute('aria-controls'));
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        if (panel) panel.hidden = expanded;
    });
});
