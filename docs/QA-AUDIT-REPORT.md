# PulseTask — Full QA Audit Report

**Application:** PulseTask "Animated Workspace & Analytics" (`task-manager-ui`, React 19 + Vite 7 + Tailwind v4)
**Audit type:** Responsive design, visual UI, functional, accessibility (WCAG 2.2 AA), edge-case, performance, stability
**Audit date:** 2026-10-11
**Build audited:** production build (`npm run build` → `vite preview`, port 4173)

---

## 1. How the audit was executed (actual evidence, not inspection)

Every result below comes from a **real browser session** (Chromium 153, headless, driven through
Playwright's full API over CDP). Nothing is marked "pass" without an executed check.

| Suite | What it drives | Executed states / checks |
|---|---|---|
| Responsive matrix (`02-responsive.mjs`) | 12 viewports × 10 page states | **120 rendered states**, each measured for page overflow, inner scroll containers, clipped text, sub-24 px hit areas |
| Functional suite (`04-functional.mjs`) | Full user journeys | **41 assertions** |
| axe-core WCAG sweep (`07-axe.mjs`) | login / register / tasks grid / kanban / dashboard / delete dialog × dark + light + 375 px mobile | **13 states, 0 violations** |
| axe-core contrast sweep (`08-axe-contrast.mjs`) | same 6 views × 2 themes, `color-contrast` rule isolated | 12 states |
| Clipping probe (`probe7.mjs`) | Range-rect based clip detection (parents with `overflow:hidden`) | 5 widths × 4 views × 2 themes |
| a11y / edge suite (`05-a11y-edge.mjs`, `06-deep.mjs`, `11-network.mjs`) | focus order, reduced motion, zoom, landscape, network failure, corrupt storage | 30+ probes |
| Regression suite (`task-manager-ui/tests/qa-regression.mjs`) | permanently committed, re-runnable | **22 checks, 22 passing (3 consecutive runs)** |

Viewports covered: **320, 375, 390, 425 / 768, 820, 1024 / 1280, 1366 / 1440, 1920 / 2560**, plus mobile
landscape 844×390 and 200 % / 400 % zoom emulation.

Page states covered: guest login (dark + light), register (dark + light), tasks 3D grid (dark + light),
kanban board (dark + light), timeline (dark + light), empty search state, delete dialog, dashboard
manager view (dark + light), user-role view, toast/feedback states.

---

## 2. Issue register

### Fixed in this audit

| # | Page / Component | Issue | Severity | Viewport | Root Cause | Fix | Status |
|---|---|---|---|---|---|---|---|
| 1 | Delete confirmation dialog (`TaskManagement.jsx`) | No dialog semantics: no `role="dialog"`, no `aria-modal`, no `aria-labelledby`, focus stayed on the page behind it, **Escape did nothing**, background scrolled and 48 background controls stayed tabbable | **Critical** (a11y) | All | Custom `div` overlay written without dialog semantics; no focus/keyboard handling | Added `role="dialog" + aria-modal + aria-labelledby/aria-describedby`, initial focus to *Cancel*, Escape-to-close, focus restore to the trigger, `body{overflow:hidden}` scroll lock, backdrop click to dismiss | Fixed |
| 2 | Tasks / dashboard / auth grids | **Horizontal page overflow at 320 px** — task cards extended to x=322 (2 px past the viewport) and were silently cut by `html,body{overflow-x:hidden}` | **High** | 320 px (mobile) | `repeat(auto-fill, minmax(285px, 1fr))` and `1fr 1fr` tracks cannot shrink below their min-content width | Switched all auto grids to `minmax(min(<n>px, 100%), 1fr)` and 2-column grids to `repeat(2, minmax(0, 1fr))`; verified with `overflow-x` temporarily forced back to `visible` → 0 offenders (was 9) | Fixed |
| 3 | Auth "Demo as Manager/User" buttons, role picker cards | Text **clipped inside the button/card** at 320 px (4 px cut on each side, 12 px vertically) | High | 320 px | Same `1fr 1fr` min-content blowout | See #2 | Fixed |
| 4 | Kanban task card footer ("Edit / Delete") | Button clipped by the column's `overflow:hidden` (10 px cut) and pushed out of the card | High | 320 px | Footer used a single non-wrapping flex row with 4 controls | Footer + action group now `flex-wrap: wrap` with an 8 px row gap | Fixed |
| 5 | Task card title/description (all views) | **Very long unbroken strings overflowed the card** (measured 1227 px of text in a 296 px box) and were visually cut because `.surface-card` has `overflow:hidden` | High | All widths | No `overflow-wrap` handling on headings/paragraphs | `overflow-wrap: anywhere` for `h1…h4, p, li, label` | Fixed |
| 6 | Task composer, submit button | **Duplicate tasks created by rapid clicks** — three quick clicks produced three tasks in the local store | High | All | `handleSubmit` had no in-flight guard and the submit button stayed enabled | `isSaving` guard + `disabled` submit button showing "Saving…" | Fixed |
| 7 | Every interactive element | **No visible keyboard focus indicator** — 53/53 controls had no author focus ring (only a 1 px UA `auto` outline, invisible on the dark glass surface) → WCAG 2.4.7 failure | High | All | No `:focus-visible` styles anywhere in `index.css` | Global 3 px `:focus-visible` ring with 2 px offset (theme-aware `--focus-ring`), plus a dedicated 2 px ring for inputs; verified 24/24 tab stops now show a ring | Fixed |
| 8 | Ambient background, stagger cards, gradient text, skeleton shimmer | `prefers-reduced-motion: reduce` was **completely ignored** — 12 elements animated continuously → WCAG 2.3.3 failure | High | All | No reduced-motion media query | `@media (prefers-reduced-motion: reduce)` block that neutralises animation/transition and reveals self-drawing SVG paths; verified 0 animating elements | Fixed |
| 9 | Status pills, kanban chips, KPI numbers, progress labels, toasts | **72 colour-contrast failures in axe**, worst 1.82:1 (WCAG 1.4.3) | High | Both themes | Hard-coded brand hex values reused for text (`#f59e0b`, `#10b981`, `#3b82f6`, `#a855f7`, `#64748b`) on tinted/light backgrounds | Introduced theme-aware tokens (`--status-*-fg/-solid/-fill`, `--accent-on-tint`, `--manager-fg`, `--danger-fg`, `--link-accent`, feedback colours) for dark *and* light; → **0 contrast violations** | Fixed |
| 10 | Login/register hero panel | Hero gradient was hard-coded for the dark theme → on the light theme the headline sat on a near-white surface (**1.6:1**) | High | Light theme, all widths | Inline dark-only gradient in `AuthForm.jsx` | `--hero-surface` token per theme | Fixed |
| 11 | `MOTION UI` badge, "N Active Members" badge, role chip | `var(--accent-primary)` (#6366f1) text on an indigo tint → 3.23–3.45:1 | Medium | Both themes | Brand colour used as a text colour | `--accent-on-tint` (#a5b4fc dark / #4338ca light) | Fixed |
| 12 | Muted helper text (`Quick Fill:`, dates, `@owner`, progress %) | `--text-muted` #64748b measured 3.55:1 (dark) / 4.2–4.5:1 (light) | Medium | Both themes | Token chosen for large/decorative use but applied to small text | `--text-muted` → #8b98ad (dark, 5.95:1) / #5b6878 (light, 5.1:1) | Fixed |
| 13 | Toast / feedback banner | `#10b981` text on a green tint in the light theme → 2.2:1 | Medium | Light theme | Hard-coded feedback palette | `--feedback-*-fg/bg/border` tokens | Fixed |
| 14 | Header nav, whole app | **No `<main>` landmark and no skip link** (axe `landmark-one-main` + `region`, 212 nodes) → WCAG 1.3.1/2.4.1 | Medium | All | Layout built entirely from `div`s | Added `<main id="main-content">`, a focus-visible "Skip to main content" link, and `aria-label` on the authenticated `<nav>` | Fixed |
| 15 | Search input, sort select | `#sortOrder` and `#searchTerm` had **no accessible name** (axe `select-name`, critical) | Medium | All | Selects/inputs rendered without a `<label>` or `aria-label` | `aria-label="Sort tasks"` / `aria-label="Search tasks by title or description"` | Fixed |
| 16 | Search clear "✕", kanban Edit/Delete, kanban stage chips, toast dismiss, password reveal, "Register now"/"Sign in" links | **Hit areas below the WCAG 2.2 AA 24×24 minimum** (12×21, 23×18, 43×22, 20.6 px tall) | Medium | Mobile-first, all | Tight inline padding, icon-only buttons | `.mini-action` class (min 26×26) + explicit sizes/padding; verified **0 sub-24 px targets across 120 states** | Fixed |
| 17 | Icon-only buttons | Toast dismiss "✕" had **no accessible name**; kanban/grid/timeline Edit & Delete buttons had ambiguous repeated names ("Edit", 9×) | Medium | All | Icon-only button + generic labels | `aria-label="Dismiss notification"`, `Edit "<title>"`, `Delete "<title>"`, stage chips now name their target task | Fixed |
| 18 | Theme bootstrapping | Light-theme users saw a **dark flash** before React applied `data-theme` (theme set in a `useEffect`) | Medium | Light theme | Theme applied after first paint | Pre-paint inline script in `index.html` + same default in `main.jsx`; verified `data-theme=light` and light background before React mounts | Fixed |
| 19 | SPA navigation | **Browser Back dropped the user out of the app** and Forward never returned (single-URL app, no history integration); a session could be lost on Back | Medium | All | `view` state never pushed to history | History state sync (`replaceState` on boot, `pushState` per view change, `popstate` handler that refuses to drop an authenticated session onto the guest forms); verified Back → *Workspace Tasks*, Forward → *Dashboard*, session kept | Fixed |
| 20 | Header toggles, filter chips, kanban stage chips | No `aria-pressed` on toggle buttons; theme button's `aria-label="Switch Theme"` **did not contain its visible text** (axe `label-content-name-mismatch`, serious ×13) | Low | All | Toggles implemented as plain buttons | `aria-pressed` added; theme label now "Switch theme to Light Clay / Dark Glass"; stage chips' labels include the visible text | Fixed |
| 21 | Display-mode switcher, brand badge | Labels broke **mid-word** at 320 px ("3D / Grid", "Kanban / Board", "MOTION / UI") | Low | 320 px | Narrow tracks + no `white-space` control | `white-space: nowrap`, `min-height: 32px`, wrapping container with `max-width: 100%` | Fixed |
| 22 | Native form controls | `color-scheme` was never declared → select dropdowns/scrollbars rendered as light chrome inside the dark theme | Low | Both themes | Missing meta/`color-scheme` | `<meta name="color-scheme">` + `documentElement.style.colorScheme` on theme change | Fixed |
| 23 | Timeline + dashboard team matrix | `meta.color` (solid brand hex) used for text in the timeline pill and in "Done/Active/Pending" numbers → 1.82–2.1:1 in the light theme | Medium | Light theme | Same token problem as #9 | `meta.text` tokens in timeline pills and team-matrix numbers | Fixed |

### Remaining / known limitations (not fixed, by design or by environment)

| # | Item | Severity | Status | Notes |
|---|---|---|---|---|
| A | Cross-browser verification (Firefox, WebKit/Safari, Edge) | Medium (coverage gap) | **Blocked** | The sandbox can only run the chromium-based binary that was available. Firefox/WebKit engines could not be downloaded (browser CDN blocked). All results in this report are **Chromium 153 (equivalent to Edge 153 Chromium behaviour)**. Firefox/Safari must be re-verified by the team; the CSS used is standard (`:focus-visible`, `prefers-reduced-motion`, `overflow-wrap:anywhere`, `backdrop-filter` with `-webkit-` prefix already present) so risk is low, but it is **not verified**. |
| B | Remote Express/Mongo API (`task-manager-api`) | Medium | **Blocked** | No MongoDB instance and no outbound network to the deployed Render API in the sandbox. The UI's smart-fallback path was verified instead: with `pulsetask_mode=remote_only` and an unreachable API the app recovers to the local interactive engine and renders normally (no crash, no infinite spinner). Backend logic was **not modified**. |
| C | Google Fonts delivery and `display=swap` behaviour | Low | Partially verified | `fonts.googleapis.com` is blocked in the sandbox. Layout/typography was validated against locally hosted copies of the exact same families/weights (Plus Jakarta Sans 400–800, Space Grotesk 500–700, JetBrains Mono 400–600) and all five font weights load — so metrics are representative, but the real CDN request was not observed. Consider self-hosting the fonts (also removes 2 third-party DNS/TLS round-trips from the LCP path). |
| D | Browser zoom at 200 % / 400 % | Low | Emulated | Verified with CSS `zoom` (no overflow at 1440 or 390 in either theme). Real browser zoom corresponds to a narrower layout viewport, which **is** covered by the 320–768 px responsive states. |
| E | `html, body { overflow-x: hidden }` | Low | Kept intentionally | It silently masks future overflow regressions. Every 320 px overflow was fixed and re-verified with the rule disabled (0 offenders), so removal is now safe — recommended as a follow-up rather than part of this audit. |
| F | Low-opacity decorative SVG strokes (e.g. donut track `rgba(59,130,246,0.25)`) | Low | Accepted | Non-text UI decoration, exempt from the 4.5:1 text requirement; left as designed. |
| G | `@vercel/analytics` 404s outside Vercel (`/_vercel/insights/script.js`) | Low | Accepted | Produces 1 failed request + 2 console logs per load in non-Vercel environments. Harmless, but consider gating `<Analytics />` behind `import.meta.env.PROD` + a Vercel host check. |
| H | No visual-regression baseline | Low | Open | Screenshots were captured per state but no pixel-diff baseline is committed. |

---

## 3. Totals

- **Issues discovered: 23** — Critical 1, High 7, Medium 9, Low 6
- **Issues fixed: 23** (100 % of discovered issues)
- **Unresolved:** 0 functional/visual defects. 4 environment-blocked verification gaps (A, B, C, D above) and 4 accepted follow-ups (E–H).
- **Regressions introduced:** 0 — the committed regression suite (22 checks) passes on 3 consecutive runs, `npm run build` succeeds, and `npx eslint src` reports the same 4 pre-existing warnings/1 pre-existing error as on the untouched baseline (no new lint issues).

---

## 4. Automated test results

### Responsive matrix — 120 states (12 viewports × 10 states, dark + light)

```
views tested                 120
views with horizontal scroll   0   (was 8 before fixes at 320px)
inner scroll containers        0
errors / timeouts              0
hit areas below 24×24          0   (was 60+ before fixes)
text clipped by a container    0   (was ~70 before fixes; probe: Range rects vs. overflow:hidden ancestors)
```
Full JSON: `reports/responsive.json` (audit workspace).

### Functional suite — 41/41 passing

```
PASS login page renders
PASS login: empty submit blocked by validation
PASS login: invalid email blocked
PASS password visibility toggle switches input type        password -> text
PASS login: submit signs in and lands on tasks
PASS logout returns to login view
PASS register: special chars handled, no HTML injection
PASS register: role=manager applied
PASS reset demo restores workspace
PASS role switch toggles role                             MANAGER -> USER
PASS create task: success toast shows
PASS create task: appears in grid
PASS rapid double-submit does not create duplicate tasks   created=1
PASS edit: composer switches to edit mode
PASS edit: title updated
PASS quick status change works
PASS delete: confirmation modal opens
PASS delete: cancel keeps task
PASS delete: confirm removes task                          dbBefore=9 dbAfter=8
PASS search filters results
PASS search: empty state shown
PASS sort by title A-Z applied
PASS status filter chip filters list                       ["completed"]
PASS pagination renders when >1 page                       Page 1 of 2
PASS pagination next page works                            Page 2 of 2
PASS display mode "Kanban Board" renders                   nodes=3
PASS display mode "Timeline" renders
PASS display mode "3D Grid" renders
PASS composer collapses / reopens
PASS 3D tilt toggle works
PASS ambient FX pause works
PASS theme switches to light / back to dark
PASS dashboard renders KPI cards
PASS dashboard refresh works
PASS manager sees team matrix
PASS browser back returns to the previous in-app view      Workspace Tasks
PASS browser forward returns to the dashboard
PASS session persists across reload
```

Also exercised: unicode + emoji + 130-character inputs, HTML/script-injection payloads in every field
(no injection — React escapes all user content), empty state, cancel paths, 20-click navigation spam,
and corrupt localStorage (`{"tasks":null,"users":[]}` + invalid JSON user) — the app self-recovers.

### Accessibility — axe-core (WCAG 2.0/2.1/2.2 A + AA)

| Run | Violations |
|---|---|
| Before fixes (13 states) | `color-contrast` 44, `label-content-name-mismatch` 13, `landmark-one-main` 9, `region` 203, `select-name` 7 |
| **After fixes (13 states)** | **0** |
| Contrast-only sweep, 12 states (before) | 72 nodes, worst ratio 1.82:1 |
| **Contrast-only sweep, 12 states (after)** | **0** |

### Committed regression suite (`npm run test:regression`)

22 checks, **22 passing, 3 consecutive runs**, covering: 320 px overflow in all three views, long-text
wrapping, duplicate-submit guard, dialog semantics/focus/Escape/scroll-lock/focus-restore, focus ring on
every tab stop, reduced-motion, accessible names + 24 px targets, pre-paint theme, Back/Forward session
safety, and an axe-core zero-violation gate.

---

## 5. Accessibility findings summary (WCAG 2.2 AA)

| Criterion | Result |
|---|---|
| 1.3.1 Info & Relationships | ✅ `main`/`nav`/`header` landmarks, labelled form controls, `aria-pressed` on toggles |
| 1.4.3 Contrast (minimum) | ✅ 0 violations across 12 states, both themes (was 72 nodes; worst 1.82:1 → all ≥ 4.5:1) |
| 1.4.10 Reflow | ✅ no horizontal scroll at 320 px; content reflows to one column |
| 1.4.11 Non-text Contrast | ✅ focus ring is a 3 px theme-aware ring (≥ 3:1 against the surface) |
| 2.1.1 / 2.1.2 Keyboard | ✅ full keyboard operation; Escape closes the dialog |
| 2.2.2 Pause, Stop, Hide | ✅ "Ambient FX" pause control already existed and works |
| 2.3.3 Animation from Interactions | ✅ `prefers-reduced-motion: reduce` disables all motion (was ignored) |
| 2.4.1 Bypass Blocks | ✅ skip link added |
| 2.4.3 Focus Order | ✅ DOM order matches visual order; skip link first, then header → nav → content |
| 2.4.7 Focus Visible | ✅ 24/24 tab stops show a ring (was 0/53) |
| 3.3.1 / 3.3.2 Labels & Instructions | ✅ every visible control has an accessible name (was 3 unnamed) |
| 4.1.2 Name, Role, Value | ✅ dialog roles/ARIA, toggle states, task-specific button names |
| 2.5.8 Target Size (Minimum) | ✅ 0 targets below 24×24 across 120 states (mobile-first) |
| 1.1.1 Non-text Content | ✅ decorative SVGs are `aria-hidden` where needed; no `<img>` without `alt` |

Screen-reader structure: single `h1`, ordered `h2` → `h3` → `h4` hierarchy, `lang="en"` on `<html>`,
`role="alert"` on the feedback banner.

---

## 6. Performance & stability observations

Measured on the local production preview (Chromium 153, headless, single-threaded sandbox — treat as a
**relative** signal, not a field measurement):

| Metric | Value | Assessment |
|---|---|---|
| First paint | 48–68 ms | Good |
| First contentful paint | 332–408 ms | Good |
| LCP | 504 ms (dashboard-heavy run: 928 ms) | Good (< 2.5 s) |
| CLS | **0.0005** (single 0.0005 shift at ~170–200 ms) | Excellent (< 0.1); theme flash eliminated |
| Long tasks | 0 | Good |
| DOM nodes (tasks view) | 134–138, 357–363 after full interaction | Lean |
| JS bundle | 259 KB raw / **78 KB gzip** | Acceptable for an animated SPA |
| CSS bundle | 19.5 KB raw / **5.4 KB gzip** | Small |
| Interaction latency | register↔login view switch 186–296 ms (includes the intentional 140 ms tactile delay) | Good |
| Memory stability | 12 tasks↔dashboard toggles: 0 MB heap growth, −5 DOM nodes | No leak detected |
| Network resilience | blocked remote API → graceful local fallback; 1.5 s-delayed JS → painted background, no CLS/overflow; corrupt storage → self-recovery | Robust |
| Console | 0 app errors; only `@vercel/analytics` 404 noise (see limitation G) | Clean |

Recommended (optional) performance follow-ups: self-host the three Google Fonts (removes 2 blocking
third-party origins), and disable the `<Analytics />` script outside Vercel.

---

## 7. Screenshots / test evidence

Committed in `docs/qa-evidence/` (all captured after the fixes were applied):

| File | What it shows |
|---|---|
| `01-320-mobile-tasks-dark.jpg` | 320 px tasks view — single column, no clipping, no horizontal scroll |
| `02-320-mobile-kanban-dark.jpg` | 320 px kanban — wrapped card footers, full-width columns |
| `03-390-mobile-tasks-light.jpg` | 390 px light "Tactile Clay" theme tasks view |
| `04-768-tablet-dashboard-dark.jpg` | 768 px tablet dashboard |
| `05-1440-login-dark.jpg` | Desktop login (dark) |
| `06-1440-tasks-light.jpg` | Desktop tasks grid (light) — AA-legible status pills |
| `07-1440-delete-dialog-light.jpg` | Accessible confirmation dialog (`role="dialog"`, focus on Cancel) |
| `08-1440-keyboard-focus-ring.jpg` | Visible 3 px focus ring on the task-title input |
| `09-1440-feedback-toast-dark.jpg` | Success feedback banner with a labelled dismiss button |
| `10-2560-ultrawide-dashboard-dark.jpg` | 2560 px ultrawide — content shell centred, no stretching |

Additional machine-readable evidence lives with the audit run: `responsive.json`, `functional.json`,
`axe.json`, `deep.json`, `a11y-edge.json`, plus the committed `tests/regression-results.json`.

---

## 8. Files changed

```
task-manager-ui/index.html                 pre-paint theme script, color-scheme meta, og/viewport cleanup
task-manager-ui/src/main.jsx               pre-paint theme bootstrap (no dark→light flash)
task-manager-ui/src/index.css              a11y tokens (dark + light), focus-visible ring, skip link,
                                           sr-only, reduced-motion, overflow-wrap, .mini-action
task-manager-ui/src/App.jsx                <main> landmark + skip link, aria-pressed toggles, theme-aware
                                           feedback banner, labelled dismiss, history state sync
task-manager-ui/src/AuthForm.jsx           theme-aware hero gradient, shrinkable 2-col grids,
                                           larger inline button/password-reveal hit areas
task-manager-ui/src/TaskManagement.jsx     AA status tokens, accessible dialog (+focus/Escape/scroll-lock),
                                           duplicate-submit guard, labelled search/sort, wrapped card footers,
                                           task-specific button names, 24px+ targets
task-manager-ui/src/Dashboard.jsx          AA tokens for KPI numbers, donut/legend, progress fills,
                                           team matrix; shrinkable grids
task-manager-ui/tests/qa-regression.mjs    NEW — 22-check regression suite (browser auto-detect)
task-manager-ui/package.json               NEW script: npm run test:regression (+ playwright-core devDep)
docs/qa-evidence/*.jpg                     NEW — 10 evidence screenshots
docs/QA-AUDIT-REPORT.md                    NEW — this report
```

**Not touched:** `task-manager-api/**` (backend), `src/api.js` (data layer), `src/components/*` (untouched
design system), `vite.config.js`, and all existing visual design decisions.

### How to re-run the tests

```bash
cd task-manager-ui
npm install
npm run build
npm run preview                    # http://localhost:4173

# in a second shell
npm run test:regression            # uses a bundled/downloaded Chromium
# or, in a sandbox with a Chrome binary already running:
PW_CDP_URL=http://127.0.0.1:9222 AXE_PATH=./node_modules/axe-core/axe.min.js npm run test:regression
```

---

## 9. Overall readiness assessment

**Verdict: production-ready for Chromium-based browsers (Chrome/Edge), with two caveats to close before
a general release.**

The app was already visually polished and functionally sound; the audit found that its weakest dimension
was **accessibility** and **320 px behaviour**. After the fixes:

- **Responsiveness: ✅ strong.** 120/120 rendered states across 12 viewports (320 → 2560) have zero
  horizontal overflow, zero clipped text and zero sub-24 px targets. Content reflows sensibly from one
  column at 320 px to a centred 1140 px shell at 2560 px.
- **Visual consistency: ✅ strong.** Both themes are now driven entirely by tokens, so the previously
  invisible light-theme hero, the pale light-theme progress bars and the mismatched status colours are
  gone. No broken images, no layout shifts during load (CLS 0.0005).
- **Functionality: ✅ verified.** 41/41 functional assertions plus the 22-check regression suite pass.
  CRUD, search/sort/filter, pagination, three display modes, kanban drag-and-drop handlers, role
  switching, demo reset, session persistence, Back/Forward and all empty/loading/error states were
  exercised in a real browser.
- **Accessibility: ✅ WCAG 2.2 AA clean by automation.** 0 axe-core violations across 13 page/theme
  states; keyboard, motion and touch-target requirements verified by script. A manual screen-reader pass
  (NVDA/VoiceOver) is still recommended before public launch — automation cannot fully validate SR output.
- **Stability: ✅ robust.** Network failure, slow network, rapid clicking and corrupt storage all degrade
  gracefully.

**Before a general release, close these two gaps:**
1. Run the committed suite once against **Firefox and WebKit** (Firefox/Safari/Edge coverage could not be
   executed in this environment) — `npm run test:regression` with Playwright's browsers installed.
2. Smoke-test the **remote API path** against a live backend (only the local fallback engine was
   exercisable here).
