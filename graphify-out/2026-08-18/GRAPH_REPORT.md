# Graph Report - giacomo  (2026-08-18)

## Corpus Check
- 24 files · ~36,646 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 209 nodes · 293 edges · 20 communities (12 shown, 8 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `41d6468a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Landing Page Accessibility Fixes
- Registry Auth Form Logic
- Settings Accordion & Case-File UI
- Accessibility Controls Logic
- Medical Onboarding Flow Logic
- Dashboard Accessibility Bootstrap
- Admin Dashboard Logic
- Public Status Page Logic
- Rider Dashboard Logic
- PWA Manifest
- Graphify Meta Documentation
- Service Worker Caching
- Emergency Contact Sharing
- Giacomo Brand Logo
- Register Redirect Stub
- First-Aid Guidance
- Public Status Page
- Bystander Triage Selector
- VCard Export

## God Nodes (most connected - your core abstractions)
1. `el()` - 10 edges
2. `supabase` - 9 edges
3. `Accessibility accordion section` - 8 edges
4. `graphify Knowledge Graph` - 7 edges
5. `handleSignIn()` - 5 edges
6. `init()` - 5 edges
7. `savePreferences()` - 5 edges
8. `initDashboard()` - 5 edges
9. `js/accordion.js` - 5 edges
10. `Step 3: Device & consent panel` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Row-level access control / restricted lookup function` --semantically_similar_to--> `checkSecurity admin-role gate`  [INFERRED] [semantically similar]
  privacy.html → dashboard/admin.html
- `Accessibility accordion section` --conceptually_related_to--> `SHOW/HIDE reserved-width fix`  [INFERRED]
  dashboard/settings.html → index.html
- `Accessibility accordion section` --conceptually_related_to--> `Phone-screen overflow:hidden removal`  [INFERRED]
  dashboard/settings.html → index.html
- `Accessibility accordion section` --conceptually_related_to--> `Two-column field-row flex-wrap fix`  [INFERRED]
  dashboard/settings.html → medical-onboarding.html
- `Accessibility accordion section` --conceptually_related_to--> `Missing mobile breakpoint rem fix`  [INFERRED]
  dashboard/settings.html → privacy.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Site-wide Accessibility-Prefs Cookie Bootstrap** — dashboard_admin_cookie_prefs_script, dashboard_user_cookie_prefs_script, dashboard_settings_cookie_prefs_script, index_cookie_prefs_script, medical_onboarding_cookie_prefs_script, manual_cookie_prefs_script, privacy_cookie_prefs_script [EXTRACTED 1.00]
- **Emergency Bystander Response Flow** — status_triage_selector, status_firstaid_guidance, status_share_location, status_regional_hotlines [EXTRACTED 1.00]
- **Settings Page Accordion Restructuring** — dashboard_settings_accordion_js, dashboard_settings_rider_identity_section, dashboard_settings_medical_data_section, dashboard_settings_emergency_contacts_section, dashboard_settings_accessibility_section [EXTRACTED 1.00]
- **Bystander Emergency-Record Scan Flow** — index_scan_card, medical_onboarding_live_preview, privacy_who_can_see, dashboard_user_qr_section [INFERRED 0.85]

## Communities (20 total, 8 thin omitted)

### Community 0 - "Landing Page Accessibility Fixes"
Cohesion: 0.09
Nodes (26): js/accessibility-controls.js, Accessibility accordion section, Scroll-driven exploded hardware assembly view, Registry sign-in/register card, Index accessibility-prefs cookie bootstrap, js/indexAuth.js, rem-based mobile caption floor fix (index), js/preferences.js syncPreferences (index) (+18 more)

### Community 1 - "Registry Auth Form Logic"
Cohesion: 0.09
Nodes (25): confirmHint, confirmInput, emailHint, emailInput, errorBox, handleRegister(), handleSignIn(), nameInput (+17 more)

### Community 2 - "Settings Accordion & Case-File UI"
Cohesion: 0.12
Nodes (22): Admin Live Feed/History tab-nav, accessibility.css link (settings), js/accordion.js, File-tab accordion pattern (design rationale), Settings accessibility-prefs cookie bootstrap, Emergency Contacts accordion section, Medical Data accordion section, Rider Identity accordion section (+14 more)

### Community 3 - "Accessibility Controls Logic"
Cohesion: 0.19
Nodes (14): contrastToggle, motionToggle, persist(), prefs, scaleButtons, scaleGroup, showStatus(), status (+6 more)

### Community 4 - "Medical Onboarding Flow Logic"
Cohesion: 0.23
Nodes (15): announce(), announcer(), bindEnter(), clearStatus(), el(), init(), prefill(), RELATIONSHIPS (+7 more)

### Community 5 - "Dashboard Accessibility Bootstrap"
Cohesion: 0.13
Nodes (14): accessibility.css link (admin), js/adminDashboard.js, checkSecurity admin-role gate, Admin accessibility-prefs cookie bootstrap, Admin crash-popup alert UI, js/preferences.js syncPreferences (admin), js/supabaseClient.js (admin), accessibility.css link (user) (+6 more)

### Community 6 - "Admin Dashboard Logic"
Cohesion: 0.16
Nodes (13): currentRiders, init(), logContainer, markers, renderUI(), resetAllCrashes(), resetSimulationData(), searchInput (+5 more)

### Community 7 - "Public Status Page Logic"
Cohesion: 0.20
Nodes (13): dotIcon(), hydrateIcons(), ICONS, calculateDistance(), CARAGA_HOTLINES, currentRider, fetchStatus(), parseUrlFallback() (+5 more)

### Community 8 - "Rider Dashboard Logic"
Cohesion: 0.17
Nodes (13): loadSettings(), validateField(), supabase, checkOnboarding(), generateRiderQR(), initDashboard(), layout, overlay (+5 more)

### Community 9 - "PWA Manifest"
Cohesion: 0.22
Nodes (8): background_color, display, icons, name, orientation, short_name, start_url, theme_color

### Community 10 - "Graphify Meta Documentation"
Cohesion: 0.46
Nodes (7): GRAPH_REPORT.md, graphify explain command, graphify Knowledge Graph, graphify path command, graphify query command, graphify update command, graphify wiki index

## Knowledge Gaps
- **85 isolated node(s):** `scaleGroup`, `scaleButtons`, `contrastToggle`, `motionToggle`, `status` (+80 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `supabase` connect `Rider Dashboard Logic` to `Registry Auth Form Logic`, `Accessibility Controls Logic`, `Medical Onboarding Flow Logic`, `Admin Dashboard Logic`, `Public Status Page Logic`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `Accessibility accordion section` connect `Landing Page Accessibility Fixes` to `Settings Accordion & Case-File UI`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `js/accordion.js` connect `Settings Accordion & Case-File UI` to `Landing Page Accessibility Fixes`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `Accessibility accordion section` (e.g. with `rem-based mobile caption floor fix (index)` and `SHOW/HIDE reserved-width fix`) actually correct?**
  _`Accessibility accordion section` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `scaleGroup`, `scaleButtons`, `contrastToggle` to the rest of the system?**
  _85 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Landing Page Accessibility Fixes` be split into smaller, more focused modules?**
  _Cohesion score 0.08866995073891626 - nodes in this community are weakly interconnected._
- **Should `Registry Auth Form Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.09359605911330049 - nodes in this community are weakly interconnected._