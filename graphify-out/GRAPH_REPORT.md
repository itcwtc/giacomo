# Graph Report - giacomo  (2026-08-16)

## Corpus Check
- Corpus is ~9,305 words - fits in a single context window. You may not need a graph.

## Summary
- 86 nodes · 94 edges · 14 communities (8 shown, 6 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.75)
- Token cost: 0 input · 67,877 output

## Community Hubs (Navigation)
- Admin Dashboard Logic
- Auth & Onboarding Flow
- Public Status Page Logic
- Rider Dashboard Logic
- PWA Manifest
- Auth & Page Navigation
- Shared Medical Data & Access Control
- Emergency Triage Concept
- Admin Visibility Scope
- Service Worker Caching
- Consent & Onboarding Docs
- Emergency Contact Sharing
- Crash Simulation
- VCard Export

## God Nodes (most connected - your core abstractions)
1. `supabase` - 8 edges
2. `initDashboard()` - 5 edges
3. `fetchStatus()` - 4 edges
4. `Emergency ID / Status Page` - 4 edges
5. `renderUI()` - 3 edges
6. `renderRegionalHotlines()` - 3 edges
7. `showCrashNotification()` - 2 edges
8. `init()` - 2 edges
9. `validateField()` - 2 edges
10. `loadSettings()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Settings Save-All Form` --shares_data_with--> `Rider Medical Profile Form`  [INFERRED]
  dashboard/settings.html → medical-onboarding.html
- `Emergency ID / Status Page` --shares_data_with--> `Rider Medical Profile Form`  [INFERRED]
  status.html → medical-onboarding.html
- `Administrator Data Visibility Scope` --conceptually_related_to--> `Admin Command Terminal Dashboard`  [INFERRED]
  privacy.html → dashboard/admin.html
- `Manual Account Deletion Process` --conceptually_related_to--> `Tactical Settings Page`  [INFERRED]
  privacy.html → dashboard/settings.html
- `Emergency ID / Status Page` --shares_data_with--> `Settings Save-All Form`  [INFERRED]
  status.html → dashboard/settings.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Shared Medical Profile Data Model (Settings, Onboarding, Public Status)** — dashboard_settings_saveallform, medical_onboarding_profileform, status_page [INFERRED 0.85]
- **Authentication & Role-Gate Flow** — index_page, register_page, dashboard_admin_checksecurity [INFERRED 0.75]
- **Emergency Bystander Response Flow** — status_triage_selector, status_firstaid_guidance, status_share_location, status_regional_hotlines [EXTRACTED 1.00]

## Communities (14 total, 6 thin omitted)

### Community 0 - "Admin Dashboard Logic"
Cohesion: 0.14
Nodes (11): currentRiders, init(), logContainer, markers, renderUI(), resetSimBtn, searchInput, showCrashNotification() (+3 more)

### Community 1 - "Auth & Onboarding Flow"
Cohesion: 0.18
Nodes (8): loginForm, onboardingForm, serialInput, submitBtn, registerForm, loadSettings(), validateField(), supabase

### Community 2 - "Public Status Page Logic"
Cohesion: 0.25
Nodes (8): calculateDistance(), CARAGA_HOTLINES, currentRider, fetchStatus(), parseUrlFallback(), renderRegionalHotlines(), showErr(), TRANSLATIONS

### Community 3 - "Rider Dashboard Logic"
Cohesion: 0.25
Nodes (10): checkOnboarding(), generateRiderQR(), initDashboard(), layout, overlay, overlayBg, saveBlackBoxData(), simBtn (+2 more)

### Community 4 - "PWA Manifest"
Cohesion: 0.22
Nodes (8): background_color, display, icons, name, orientation, short_name, start_url, theme_color

### Community 5 - "Auth & Page Navigation"
Cohesion: 0.33
Nodes (6): checkSecurity() Admin Role Gate, Tactical Settings Page, Rider Tactical Terminal Dashboard, Login Page (index.html), Manual Account Deletion Process, Registration Page

### Community 6 - "Shared Medical Data & Access Control"
Cohesion: 0.50
Nodes (5): Settings Save-All Form, Helmet & Bike QR Code Section, Rider Medical Profile Form, Row-Level Access Control / Restricted Public Lookup Function, Emergency ID / Status Page

### Community 7 - "Emergency Triage Concept"
Cohesion: 0.67
Nodes (3): Minimal Emergency-Triage View via QR Scan, First-Aid Guidance Drawer, Bystander Triage Quick Selector

## Knowledge Gaps
- **41 isolated node(s):** `userContainer`, `logContainer`, `statRiders`, `statAlerts`, `searchInput` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `supabase` connect `Auth & Onboarding Flow` to `Admin Dashboard Logic`, `Public Status Page Logic`, `Rider Dashboard Logic`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Emergency ID / Status Page` (e.g. with `Helmet & Bike QR Code Section` and `Row-Level Access Control / Restricted Public Lookup Function`) actually correct?**
  _`Emergency ID / Status Page` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `userContainer`, `logContainer`, `statRiders` to the rest of the system?**
  _41 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin Dashboard Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.14166666666666666 - nodes in this community are weakly interconnected._