# Graph Report - giacomo  (2026-08-17)

## Corpus Check
- 6 files · ~28,652 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 166 nodes · 227 edges · 17 communities (10 shown, 7 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.84)
- Token cost: 0 input · 185,481 output

## Community Hubs (Navigation)
- Helmet Module Hardware Design
- Data Consent & Onboarding Flow
- Registry Auth Form Logic
- Landing Page & Manual
- Admin Dashboard Logic
- Public Status Page Logic
- Rider Dashboard Logic
- Onboarding, Settings & Supabase Client
- PWA Manifest
- Shared Medical Data & Access Control
- Service Worker Caching
- Emergency Contact Sharing
- Admin Visibility Scope
- Crash Simulation
- First-Aid Guidance
- Bystander Triage Selector
- VCard Export

## God Nodes (most connected - your core abstractions)
1. `Bill of Materials` - 18 edges
2. `Data Collection & Consent Statement` - 17 edges
3. `Giacomo Landing & Rider Safety Registry Page (index.html)` - 16 edges
4. `Exploded 5-Layer Module Assembly Diagram` - 12 edges
5. `Giacomo Technical Manual (manual.html)` - 12 edges
6. `Sign In / Register Auth Card` - 10 edges
7. `supabase` - 7 edges
8. `Engineering Rationale, by Subsystem` - 7 edges
9. `Interruptible Crash-Alert Interface Design` - 6 edges
10. `initDashboard()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `MicroSD Black-Box Storage` --semantically_similar_to--> `MicroSD Module (Black-Box Storage)`  [INFERRED] [semantically similar]
  index.html → manual.html
- `Giacomo Landing & Rider Safety Registry Page (index.html)` --references--> `Giacomo Brand Logo (SVG)`  [EXTRACTED]
  index.html → assets/logo.svg
- `ESP32-S3 (Main MCU)` --semantically_similar_to--> `ESP32-S3-WROOM-1 (Main MCU)`  [INFERRED] [semantically similar]
  index.html → manual.html
- `LSM6DSOX IMU` --semantically_similar_to--> `ST LSM6DSOX (6-Axis IMU)`  [INFERRED] [semantically similar]
  index.html → manual.html
- `SIM A7670C Cellular Module` --semantically_similar_to--> `SIM A7670C (4G LTE Cat-1 Module)`  [INFERRED] [semantically similar]
  index.html → manual.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Crash-Detection-to-Alert Hardware Chain** — manual_lsm6dsox, manual_esp32_s3_wroom_1, manual_sim_a7670c, manual_ip5306 [INFERRED 0.85]
- **Bystander QR Emergency-Lookup Flow** — index_qr_scan_demo, privacy_qr_triage_view, privacy_row_level_access_control, privacy_medical_information [INFERRED 0.85]
- **Interruptible Crash-Alert Interface Pattern** — index_abort_button, index_piezo_buzzer, index_ws2812b_led, manual_enclosure_rationale [INFERRED 0.80]
- **Emergency Bystander Response Flow** — status_triage_selector, status_firstaid_guidance, status_share_location, status_regional_hotlines [EXTRACTED 1.00]
- **Authentication & Role-Gate Flow** — index_page, register_page, dashboard_admin_checksecurity [INFERRED 0.75]
- **Shared Medical Profile Data Model (Settings, Onboarding, Public Status)** — dashboard_settings_saveallform, medical_onboarding_profileform, status_page [INFERRED 0.85]

## Communities (17 total, 7 thin omitted)

### Community 0 - "Helmet Module Hardware Design"
Cohesion: 0.08
Nodes (38): Sealed Abort Button, Exploded 5-Layer Module Assembly Diagram, ESP32-S3 (Main MCU), Interruptible Crash-Alert Interface Design, IP5306 Power Management IC, IP67 Gasket Seam / Weather Seal, 3.7V LiPo Battery, LSM6DSOX IMU (+30 more)

### Community 1 - "Data Consent & Onboarding Flow"
Cohesion: 0.11
Nodes (21): What Happens in a Crash (4-Step Sequence), No App, No Login, No Excess (Bystander Lookup Design), Bystander QR-Scan Emergency Lookup Demo, Local Black-Box Impact Logging, MicroSD Module (Black-Box Storage), Medical Onboarding Page, Account Information (Name & Login Credentials), Administrator Data Visibility Scope (+13 more)

### Community 2 - "Registry Auth Form Logic"
Cohesion: 0.13
Nodes (17): Auth Error Message Box (id=authError), Email Input (id=inEmail), Full Name Input (id=inName), Password Input (id=inPass), Submit Button (id=submitBtn), Register Tab (id=tabUp), emailInput, errorBox (+9 more)

### Community 3 - "Landing Page & Manual"
Cohesion: 0.15
Nodes (18): Giacomo Brand Logo (SVG), checkSecurity() Admin Role Gate, Tactical Settings Page, Rider Tactical Terminal Dashboard, The Apparatus (Hero Section), Audiences: Riders, Families, First Responders, Sign In / Register Auth Card, Giacomo (Helmet-Mounted Emergency-Response System) (+10 more)

### Community 4 - "Admin Dashboard Logic"
Cohesion: 0.14
Nodes (11): currentRiders, init(), logContainer, markers, renderUI(), resetSimBtn, searchInput, showCrashNotification() (+3 more)

### Community 5 - "Public Status Page Logic"
Cohesion: 0.25
Nodes (8): calculateDistance(), CARAGA_HOTLINES, currentRider, fetchStatus(), parseUrlFallback(), renderRegionalHotlines(), showErr(), TRANSLATIONS

### Community 6 - "Rider Dashboard Logic"
Cohesion: 0.25
Nodes (10): checkOnboarding(), generateRiderQR(), initDashboard(), layout, overlay, overlayBg, saveBlackBoxData(), simBtn (+2 more)

### Community 7 - "Onboarding, Settings & Supabase Client"
Cohesion: 0.27
Nodes (6): onboardingForm, serialInput, submitBtn, loadSettings(), validateField(), supabase

### Community 8 - "PWA Manifest"
Cohesion: 0.22
Nodes (8): background_color, display, icons, name, orientation, short_name, start_url, theme_color

### Community 9 - "Shared Medical Data & Access Control"
Cohesion: 0.67
Nodes (4): Settings Save-All Form, Helmet & Bike QR Code Section, Rider Medical Profile Form, Emergency ID / Status Page

## Ambiguous Edges - Review These
- `DSTF (Sponsoring Program, Placeholder)` → `ASNHS (Project Institution)`  [AMBIGUOUS]
  privacy.html · relation: conceptually_related_to

## Knowledge Gaps
- **52 isolated node(s):** `currentRiders`, `logContainer`, `markers`, `resetSimBtn`, `searchInput` (+47 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `DSTF (Sponsoring Program, Placeholder)` and `ASNHS (Project Institution)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Giacomo Landing & Rider Safety Registry Page (index.html)` connect `Landing Page & Manual` to `Helmet Module Hardware Design`, `Data Consent & Onboarding Flow`, `Registry Auth Form Logic`?**
  _High betweenness centrality (0.442) - this node is a cross-community bridge._
- **Why does `supabase` connect `Onboarding, Settings & Supabase Client` to `Registry Auth Form Logic`, `Admin Dashboard Logic`, `Public Status Page Logic`, `Rider Dashboard Logic`?**
  _High betweenness centrality (0.192) - this node is a cross-community bridge._
- **Why does `Giacomo Technical Manual (manual.html)` connect `Landing Page & Manual` to `Helmet Module Hardware Design`, `Data Consent & Onboarding Flow`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._
- **What connects `currentRiders`, `logContainer`, `markers` to the rest of the system?**
  _52 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Helmet Module Hardware Design` be split into smaller, more focused modules?**
  _Cohesion score 0.08392603129445235 - nodes in this community are weakly interconnected._
- **Should `Data Consent & Onboarding Flow` be split into smaller, more focused modules?**
  _Cohesion score 0.10952380952380952 - nodes in this community are weakly interconnected._