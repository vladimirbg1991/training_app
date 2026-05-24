# Pulse — Design Specification

A production-ready UI and UX specification for the Pulse fitness training app.

---

**Document version:** 1.0
**Date:** May 2026
**Status:** Design-locked, pre-implementation
**Audience:** Engineering, Design, Product, anyone Claude Code reads context from

---

## Table of contents

- [Why this document exists](#why-this-document-exists)
- [Product overview](#product-overview)
- [Design philosophy and direction](#design-philosophy-and-direction)
- [The Pulse design system](#the-pulse-design-system)
- [Universal Pulse idioms](#universal-pulse-idioms)
- [The smart logger — design IP](#the-smart-logger--design-ip)
- [Screen catalog](#screen-catalog)
  - [Batch 1 — Core lifter journey](#batch-1--core-lifter-journey)
    - [Screen 1 — Welcome and user-type selection](#screen-1--welcome-and-user-type-selection)
    - [Screen 2 — Home](#screen-2--home)
    - [Screen 3 — Active workout, three states](#screen-3--active-workout-three-states)
    - [Screen 4 — Routine builder](#screen-4--routine-builder)
    - [Screen 5 — Exercise library](#screen-5--exercise-library)
    - [Screen 6 — Exercise detail](#screen-6--exercise-detail)
    - [Screen 7 — Sign-in](#screen-7--sign-in)
  - [Smart logger surface](#smart-logger-surface)
    - [Screen 8 — Gym selection in settings](#screen-8--gym-selection-in-settings)
    - [Screen 9 — Smart exercise selector](#screen-9--smart-exercise-selector)
    - [Screen 10 — Smart set logger, two equipment models](#screen-10--smart-set-logger-two-equipment-models)
    - [Screen 11 — Implicit-confirm sequence](#screen-11--implicit-confirm-sequence)
  - [Logging edge cases](#logging-edge-cases)
    - [Screen 12 — Stepped reps logger](#screen-12--stepped-reps-logger)
    - [Screen 13 — Superset logger](#screen-13--superset-logger)
    - [Screen 14 — Drop set logger](#screen-14--drop-set-logger)
  - [Logging surface completion](#logging-surface-completion)
    - [Screen 16 — Routine pre-flight check](#screen-16--routine-pre-flight-check)
    - [Screen 17 — QR scan to log](#screen-17--qr-scan-to-log)
    - [Screen 18 — Rest state, three views](#screen-18--rest-state-three-views)
  - [Batch 2 — Progress and analytics](#batch-2--progress-and-analytics)
    - [Screen 19 — Progress dashboard](#screen-19--progress-dashboard)
    - [Screen 20 — History feed](#screen-20--history-feed)
    - [Screen 21 — Exercise progress chart](#screen-21--exercise-progress-chart)
    - [Screen 22 — Body measurements](#screen-22--body-measurements)
    - [Screen 23 — Personal records](#screen-23--personal-records)
    - [Screen 24 — Calendar and streak](#screen-24--calendar-and-streak)
  - [Batch 3 — Power features](#batch-3--power-features)
    - [Screen 25 — Paywall](#screen-25--paywall)
    - [Screen 26 — Notifications inbox](#screen-26--notifications-inbox)
    - [Screen 27 — Settings and profile](#screen-27--settings-and-profile)
    - [Screen 28 — Offline routine download](#screen-28--offline-routine-download)
    - [Screen 29 — Apple Health integration detail](#screen-29--apple-health-integration-detail)
  - [Batch 4 — Multi-tenant surfaces](#batch-4--multi-tenant-surfaces)
    - [Screen 30 — Trainer dashboard](#screen-30--trainer-dashboard)
    - [Screen 31 — Client list](#screen-31--client-list)
    - [Screen 32 — Client detail](#screen-32--client-detail)
    - [Screen 33 — Gym operator dashboard](#screen-33--gym-operator-dashboard)
    - [Screen 34 — Gym leaderboard](#screen-34--gym-leaderboard)
    - [Screen 35 — Share or PR moment](#screen-35--share-or-pr-moment)
- [Data model implications](#data-model-implications)
- [Behavioural rules baked into the design](#behavioural-rules-baked-into-the-design)
- [Patch 8 — what the agent files need to know](#patch-8--what-the-agent-files-need-to-know)
- [What's next](#whats-next)

---

## Why this document exists

This is the complete UI and UX specification for Pulse, captured at the moment of design lock and before implementation begins.

Two reasons this document is worth its weight. First, it preserves every design decision — colour values, layout choices, copy, behavioural rules — so that anyone implementing this app (a designer in Figma, a developer in Claude Code, a contractor picking up the work in three months) is working from one source of truth rather than reconstructing intent from a chat history. Second, it captures the rationale behind each decision, not just the decision. A button at 56px tall is meaningless without knowing it's that tall because the user's hand is sweaty mid-workout and 44px is the absolute floor for Apple's HIG. A subtitle reading "step 5 kg" is meaningless without knowing the increment is per-exercise and overridable, encoded in `user_exercise_preferences`. Decisions decay; rationale propagates.

The document is structured to be read either linearly (it tells a coherent story from the philosophy through the data model) or as a reference (the screen catalog is exhaustive and each screen entry is self-contained). The screen images themselves are not embedded as raster — they were generated as interactive HTML widgets in the design conversation, and where they're referenced here, the layout is described in enough detail that the design is fully reconstructible.

---

## Product overview

Pulse is a cross-platform iOS and Android fitness training app that competes with Hevy, Strong, Fitbod, JEFIT, and Gymshark Training. It serves three user types — lifters tracking their own training, personal trainers managing rosters of clients, and gym operators running facilities — from one codebase, with role-determined UI and RLS-determined data access.

The core promises are speed, offline reliability, and privacy. Logging a set takes one tap in the dominant case. The app works without signal. Personal data is private by default with explicit sharing seams. Apple Watch integration via a native SwiftUI companion app ships in a later phase but the schema is ready in v1.

The product is positioned in App Store category "Health & Fitness" — not "Medical." HIPAA does not apply; GDPR, MHMDA, and CCPA do, and every body-composition surface carries the "for personal fitness tracking only" disclaimer mandated by the fitness-domain-expert agent.

The tech stack underneath the design is React Native with Expo SDK 54+, NativeWind v4, Zustand and TanStack Query persisted via MMKV, FlashList for lists, Reanimated 4 for animation, and Hermes V1 with the New Architecture enabled. Sync is PowerSync over Supabase Postgres with Sync Streams (the new beta, not legacy YAML rules) and Clerk as the identity provider — Clerk Organizations carry the user-type and trainer-client-gym relationships, with PowerSync verifying Clerk JWTs via JWKS. Workers run on Fly.io or Railway with Node 22 LTS, BullMQ on Redis Cloud or Upstash Fixed (not PAYG — the rate dynamics break workouts in progress), and direct Postgres connections on port 5432 IPv4 (not Supavisor, due to its connection leak). Subscriptions are handled by RevenueCat from day one, with Superwall layered in at roughly $25K MTR. Media is Mux with expo-video and expo-video-cache for iOS HLS offline. EAS Build, Sentry with Hermes source maps and UI Profiling enabled, PostHog EU for analytics and feature flags and session replay, and Postmark for transactional email round out the operational stack.

None of this is visible in the screens — that's by design — but it shapes what's possible. The smart logger commits to local SQLite via PowerSync's optimistic write path the moment a set is logged, with the network sync handled in the background. The QR scan flow uses signed JWTs verified locally before the gym context binds. Live Activities use the iOS-native expo-live-activity bridge. Each screen's UX assumes the underlying capability is there.

---

## Design philosophy and direction

Two design directions were explored side-by-side at the start of the project. **Iron** was a dense, monochrome, almost utilitarian language inspired by Linear and Things 3 — serious, focused, made for the lifter who finds every other fitness app "fine but a bit busy." **Pulse** was a confident, premium, modern fitness aesthetic inspired by Whoop, the latest Strava direction, and Apple Fitness — larger numbers, more colour, more energy, still flat and disciplined.

Pulse was chosen as the canonical direction. The reasoning: it is the cleaner, more premium version of the broader fitness-app aesthetic and serves a wider market than Iron would. Iron was the more differentiated bet — there is no app that looks like Iron in the App Store's fitness category — but Pulse is the safer, broader, more emotionally resonant choice for a v1.

Pulse, as a design language, commits to a small number of strong choices.

The product is **dark by default**. The interior of a gym is darker than a sunlit room, screens at 9 PM are bright, and the colour palette is built around training intensity rather than productivity. Light mode is supported but is not the canonical view.

The accent is **one saturated training-green** — `#1D9E75` — used for exactly one element per screen. The user's eye is trained, screen after screen, to find the next action in this colour. Inside the workout screen the accent is "Log set"; on home it's "Start workout"; on the routine builder it's "Save routine." This single-accent discipline is the most important visual decision in the entire spec.

Other colours appear only with **genuine semantic meaning**. Amber for personal records and warnings of the celebratory kind. Coral for caution. Light teal for body weight and chart fills. White, grey, and black are not present in the palette in any meaningful quantity.

Typography is **two weights only** — 500 medium and 400 regular. Numbers are **tabular** and tracked tighter at `letter-spacing: -0.02em` so they read as data, not as text. Labels above numbers are small (10–11px) and use the mid-teal `#5DCAA5`. The number always dominates the label.

Density is **between Apple Fitness and Hevy**. Card padding is 14px. Vertical rhythm between cards is 12px. Primary readouts run 32–40px (set logger, dashboard stats). Large headlines run 22–26px (dashboard "you're 14% stronger" pattern). Body text is 12–13px. Nothing is below 10px.

Cards have **rounded corners at 14px or 16px**. Buttons at 10–14px. Pills (tags, status indicators) at 6–8px. There is no shadow on any card — depth is communicated by colour layering against the page background.

Iconography is **Tabler outline** throughout. Outline icons feel lighter against the dark surfaces; filled icons feel heavy and obstruct the data. The single exception is `circle-check-filled` which is used to mark completed sets — a green dot is more readable than a green ring.

The fifth and last commitment is **language**. Pulse speaks to the user like a sportscaster. Headlines on the progress dashboard read "You're 14% stronger this quarter," not "Strength gain: +14%." Insight pills read "You're adding ~3 kg of est. 1RM per month. At this pace you'll hit 135 kg in ~3 weeks," not "Linear regression projects 135 kg in three weeks." Notifications read "12 days strong. 6 to beat your record," not "Streak: 12 days. Best: 18 days." Every piece of microcopy is the version a friend would say.

---

## The Pulse design system

### Surface stack

The Pulse interface is built on a four-tier surface model. Each tier sits on the one below it visually, and the colour values are tuned so that nesting deeper means a stronger green tint, not a darker shade.

| Tier | Colour | Role |
|---|---|---|
| Page background | `#0A1410` | The deepest layer. The phone's screen. Nothing should match this. |
| Card surface | `#0E1F19` | The default card colour. Where most content lives. |
| Hero card | `#0F6E56` | The active context — "what the user is doing right now." One per screen. |
| Nested stat tile | `#08402F` | Used inside hero cards for label-above-number stat clusters. |

Text on these surfaces is also tiered. On `#0A1410` and `#0E1F19`, headings are off-white `#E1F5EE`, labels are `#5DCAA5` mid-teal, and ambient text is `#9FE1CB` light teal. On `#0F6E56` (the hero), headings stay `#E1F5EE` but labels brighten to `#9FE1CB` for contrast.

### Accent and semantic colours

The single canonical accent is `#1D9E75` saturated training-green. Text on this accent is always `#04342C` darkest-teal — the contrast ratio is comfortably above WCAG AA at any size, and it gives accent buttons a satisfying weight that pure white text wouldn't.

Semantic colours are used sparingly and always for a real meaning, never decoration.

| Purpose | Colour | Text on it | Where it appears |
|---|---|---|---|
| Personal record / celebration | Amber `#FAC775` background, `#412402` text | High-contrast | PR badges, trophy icons, streak fire-flames |
| Warning / attention | Coral `#F0997B` background, `#4A1B0C` text | High-contrast | Stuck-lift detection, attention-needed clients, low-grade alerts |
| Positive delta / gain | Green `#97C459` text on dark | — | "+12%", "+25 kg" arrows beside stats |
| Critical / destructive | Coral `#F0997B` text on dark | — | Delete account, disconnect integration |

### Typography

The product uses a single font family — system default (San Francisco on iOS, Roboto on Android) — at two weights only. Medium 500 and Regular 400.

| Type | Size | Weight | Letter-spacing | Use |
|---|---|---|---|---|
| Display number | 32–40px | 500 | -0.02em | Primary set logger, weight readout, daily stats |
| Hero number | 22–28px | 500 | -0.02em | Dashboard headline numbers, body weight |
| Title | 18–22px | 500 | normal | Screen titles |
| Subtitle | 14–16px | 500 | normal | Card headers, exercise names |
| Body | 11–13px | 400 | normal | Captions, secondary text, metadata |
| Label | 9–11px | 400 | 0.04em–0.06em | Above-number labels in stat tiles, section headers |

Numbers use the `tabular-nums` font-feature so columns of numbers in lists (history feed, set list) align visually. Labels in uppercase use a positive letter-spacing of 0.04–0.06em to add air; titles and body text use normal spacing.

### Spacing and rhythm

| Token | Value | Use |
|---|---|---|
| Card outer padding | 12–14px | Inside any card or surface |
| Card stack gap | 8–12px | Between vertically adjacent cards |
| Section spacing | 14–18px | Between distinct content sections |
| Element internal gap | 6–10px | Inside a card, between rows |
| Element minimum tap size | 44px | Apple HIG floor; many controls run larger |
| Primary action height | 50–56px | "Log set", "Start workout", "Save" |
| Secondary action height | 36–42px | Adjustment buttons, skip, restore |

### Corners and borders

| Element | Border radius |
|---|---|
| Cards (default) | 14px |
| Cards (hero) | 16px |
| Buttons (primary) | 12–14px |
| Buttons (secondary) | 9–11px |
| Pills and chips | 6–8px |
| Image and video tiles | 10–14px |
| Avatar squares | 10–18px (size-dependent) |

Borders are 0.5px hairline in `#08402F` for most card outlines on the dark surface, escalating to 1.5px `#5DCAA5` for selected or active elements. There is no thicker border anywhere in the system; thicker borders read as defensive rather than confident.

### Iconography

Tabler outline at 14–22px depending on context. Common icons used in this spec:

| Icon | Meaning |
|---|---|
| `ti-barbell` | Workout, training, exercise |
| `ti-trophy` | Personal record, achievement |
| `ti-flame` | Streak, intensity |
| `ti-clock` | Rest timer, duration |
| `ti-trending-up` | Improvement, gain |
| `ti-trending-down` | Drop set (intentional), decline (in stuck-lift) |
| `ti-link` | Superset connection |
| `ti-circle-check-filled` | Completed set or exercise |
| `ti-info-circle` | Disclaimer, explanatory note |
| `ti-shield-check` | Verified gym sticker |
| `ti-qrcode` | Scan equipment |
| `ti-bolt` | Power, premium |
| `ti-bulb` | Insight, recommendation |

---

## Universal Pulse idioms

Six visual patterns repeat across the catalog. Recognising these makes the rest of the spec easy to implement consistently.

### 1. The hero card

A card with background `#0F6E56`, padding 14–16px, and a small uppercase 10–11px label at the top in `#9FE1CB` mid-teal. Below the label comes the title (17–22px, weight 500, `#E1F5EE`), then either action content or a row of nested stat tiles. The hero card represents *what the user is doing right now* — the current exercise mid-workout, today's planned routine on home, the currently-selected gym in settings. There is at most one hero card per screen.

### 2. The nested stat tile

A small tile with background `#08402F`, padding 8–10px, used inside hero cards for "label-above-number" stat clusters. The label is 9–10px in `#9FE1CB`, the number is 14–16px weight 500 in `#E1F5EE`. Stat tiles are arranged in groups of 2–4 across the bottom of a hero card. Used to surface three to four facts at a glance.

### 3. The stepped input pair

The canonical numeric input. Two columns, each with a label (WEIGHT / REPS), the current value as a large number (24–32px), and −/+ buttons either side. The user does not see the system keyboard; the stepper is the input method. Each column has a "step" footer ("step 5 kg", "step 1 rep") that documents the increment for this exercise. The increment is per-exercise and overridable via the `user_exercise_preferences` table.

### 4. The single accent button

The primary CTA on every screen, rendered at 50–60px height with `#1D9E75` background and `#04342C` text, weight 500, label specific to the action ("Log 80 × 8", not "Save"; "Log and move to B", not "Next"). At most one accent button is visible at any moment. Secondary actions are rendered with `#0E1F19` background and `#9FE1CB` text, at 36–42px height — clearly subordinate.

### 5. The dashed border with amber chip

The universal "draft" or "unsaved" signal, used by the implicit-confirm pattern. A card transitions from a solid 0.5px `#08402F` border to a 1.5px dashed `#5DCAA5` border, and a small amber chip ("unsaved") appears in the top-right corner. This appears whenever the user has modified a value but not yet confirmed it via the primary action. The dashed border is unique to this state — no other element in the system uses dashed borders.

### 6. The chevron-left header with breadcrumb subtitle

The universal header for any stack screen, with a `ti-chevron-left` at 20–22px on the left, a context block in the centre (a small 10–11px breadcrumb in `#5DCAA5` ambient teal showing the parent context, and a 12–14px subtitle showing the current screen state), and an optional secondary action on the right. The breadcrumb subtitle is always two lines, never one — the top line is the program/routine context ("push day · exercise 2 of 5") and the bottom line is the immediate state ("28:14" elapsed time, or the screen name).


---

## The smart logger — design IP

The smart logger is the single most important innovation in this app, and the reason a serious lifter would switch from Hevy or Strong. It is built around four principles, each of which is encoded in specific UI behaviour.

### Principle 1 — Match last session by default

The dominant case for any working set is "do what you did last time, plus or minus." This is true for somewhere between 70 and 85 percent of all sets in any structured strength program. The app should treat that case as the default, not as a configuration the user has to opt into.

When the user taps "Begin first set" on an exercise, the weight and reps input is pre-filled with the values from their last completed set of that exercise on this equipment. The big primary button reads "Log 80 × 8" (or whatever the last values were) — not "Log set." Tapping it commits a new set with those exact values and advances the user to the next set or exercise. This is the **one-tap path**, and the friction budget for this path is exactly 1 tap.

### Principle 2 — Stepped, contextual adjustment

If the user wants to go heavier or lighter than last session, the next-most-common adjustment is by one increment — one plate, one pin, one small dumbbell jump. The system encodes these increments per exercise.

| Exercise category | Default increment | Note |
|---|---|---|
| Barbell compound (squat, bench, deadlift) | ±5 kg | Long-press: ±2.5 kg |
| Selectorized cable machine | ±1 pin | Approximate kg shown in muted text |
| Cable / pulley with proper kg stack | ±5 kg | |
| Dumbbells | ±2.5 kg | Reflects how dumbbell racks step |
| Bodyweight + load | ±1.25 kg | Weighted vests, dipping belts |
| Isolation barbell (curl, lateral) | ±2.5 kg | |

These defaults are encoded in the catalog. Each user can override per exercise in `user_exercise_preferences` with columns `default_weight_increment` and `default_increment_unit` (one of `kg`, `lb`, `pin`, `plate`). The override is persisted locally first via PowerSync and synced to the server on next online cycle.

The set logger's secondary buttons show the *resulting weight* labelled with the delta — "75 kg (−5 kg)" and "85 kg (+5 kg)" — not just "−" and "+". The user reads the future state, not the operation. This is two taps for the stepped path: one to step, one to log.

For machines with pin-based selectorized weight stacks (lat pulldown, leg press in some gyms, seated row), the primary readout is the *pin position*, not the kilogram value. The user remembers "pin 9," not "65 kg." Below the pin number, a muted "≈ 65 kg" line provides the conversion for context. Step buttons read "pin 8" and "pin 10," with the kg conversion as a sub-label. The data model stores both — the canonical value is the pin position, the kg value is a derived approximation per machine.

### Principle 3 — Implicit confirm

Hevy and Strong both require the user to actively confirm each set with a checkbox or a +1-set tap. This is friction. It is also the wrong mental model — the user *did* the set in the gym; they're not asking permission to record it, they're notifying the system that it happened.

Pulse uses an implicit-confirm pattern instead. The rule:

> Every set is provisional until the user either taps "Log" or starts a new set, at which point the previous set's last-shown values become canonical. Moving to a different exercise without confirming discards the in-progress set with a small undo affordance.

The behavioural sequence:

1. The user lands on the set logger. Weight and reps are pre-filled. The card has a solid 0.5px border. This is the **resting state**.
2. The user adjusts weight or reps. The card's border becomes 1.5px dashed `#5DCAA5`, and a small amber "unsaved" chip appears top-right. This is the **draft state**. The set is provisional.
3. The user taps "Log 80 × 8" (or the adjusted equivalent). The set is committed to local SQLite, the set list at the bottom updates, the card returns to its resting state with the next set's values pre-filled.

If at step 2 the user instead navigates away — taps "Next exercise" in the bottom navigation, or "Finish workout," or the back chevron — the draft set is silently discarded. A small amber-coloured note appears in the previous exercise's collapsed summary: "set 3 discarded · undo". Tapping "undo" restores the draft for one more chance to confirm. This is the safety net for the rare case where the user intended to confirm but didn't.

The implicit-confirm pattern saves an entire tap per set across the entire app, which over a 21-set workout is 21 taps the user didn't have to make. In aggregate this is the difference between "this app feels fast" and "this app feels like Hevy."

### Principle 4 — Per-equipment binding

The user does not "do bench press." They "do bench press on Bench 3 at Iron Hub Belgrade." The leverage of one machine is different from another. The cable run on a selectorized stack is different across manufacturers. The user's perception of progress is anchored to the specific machine.

Every logged set carries three foreign keys: `exercise_id` (the abstract exercise, e.g., "barbell back squat"), `gym_id` (the facility), and `gym_equipment_instance_id` (the specific machine or rack). Last-session matching, PR detection, and history all default to the per-equipment scope when the user is at the same gym, and fall back to per-exercise across gyms when the user is travelling.

This is what makes the QR-scan flow work — the user scans a sticker on a specific machine, the app resolves the `gym_equipment_instance_id` from a signed JWT, and the smart logger opens with last-session values from *this exact machine*. It's also what makes the "Power rack 2" annotation in the exercise selector meaningful — the app remembers which rack the user typically uses.

### Edge case — supersets

A superset is two or more exercises performed back-to-back with no rest between, then a longer rest after the round, then repeat. The user thinks of this as one unit ("3 rounds of pull-ups + dumbbell rows"), not as two independent exercises.

The data model encodes this with a `set_group` row that ties multiple `workout_sets` together. The `set_group` has a `kind` field set to `superset`, and stores the round number. Each `workout_set` in the group gets a `set_group_id` and a `set_group_position` (0 for A, 1 for B, etc.). The rest timer is associated with the *group*, not the individual sets — it suppresses between A and B, and fires after both are logged.

The UI renders a superset as one hero card showing both exercises stacked. Exercise A is active first (with a green border and "now" pill), exercise B is queued below (muted). The primary button reads "Log and move to B." After A is logged, the card flips — A becomes the muted-completed state, B becomes active with its own pre-filled values from last round, and the primary button reads "Log and finish round." Only after both are logged does the rest timer card appear, labelled "Rest before round 3."

The "no rest between A and B" rule is documented inline on the first round as a small info pill — after the user completes their third superset (tracked locally), the hint is hidden because the pattern is understood.

### Edge case — drop sets

A drop set is one set followed immediately by lighter weight and continued reps, often two or three drops in sequence. The user thinks of this as one extended set with multiple weights, not three separate sets.

The same `set_group` pattern handles this with `kind = drop_set`. Position 0 is the top set, positions 1, 2, 3... are the drops. Rest happens only after the last drop. The UI shows the top set as a collapsed confirmed row at the top, then the active drop's stepped weight/reps input below it, with queued future drops shown muted underneath. The primary button reads "Log drop and continue" (mid-sequence) or "Log final drop" (last in sequence).

After the drop set completes, the rest timer card shows "Rest before final set · 3 min · earned after drop set" — the longer rest duration is encoded as a property of the set_group, recognizing that drop sets are more metabolically taxing.

PR detection on drop sets is interesting: traditional PRs on a drop set's top weight are detected normally, but the app also detects "drop PRs" — improvement on the same drop weight versus last time. A small celebratory pill ("+4 reps on drop 1 vs last time") appears in the summary, providing emotional payoff for the harder work the user actually did.


---

## Screen catalog

Thirty-five screens, organised by user journey. Each entry contains the screen's role in the product, the layout description in enough detail to reconstruct it, the design rationale, and any data-model or behavioural implications.

### Batch 1 — Core lifter journey

The seven foundational screens of the lifter experience. These cover everything from cold launch through first workout completion.

#### Screen 1 — Welcome and user-type selection

##### Role

The first 60 seconds of the app, broken into two sequential screens. Welcome introduces the product's three pillars. User-type selection determines the Clerk Organization the user joins, the sync streams they get, and the UI variant they see for the rest of their session.

##### Layout — welcome screen

Single-column composition. At the top of the safe area, a system clock and battery icon row in muted teal `#5DCAA5`. Below that, vertical centring throughout the content area.

Centred at roughly 30% from the top: a 56×56 rounded square icon (`#0F6E56` background, white barbell glyph). Below it, a 30px display heading "Train with intent." in `#E1F5EE`. Below that, a 14px subtitle "A workout log that respects your time, works in any gym, and never loses a set." in `#9FE1CB`.

A 40px gap, then three feature pillars stacked vertically with 10px gap. Each pillar is one row: a 16px tabler icon (bolt, wifi-off, shield-check) in mid-teal, followed by a short label in `#9FE1CB`.

- "Log a set in two taps"
- "Works without signal"
- "Your data stays yours"

At the bottom of the safe area, two stacked buttons. Primary "Get started" at 54px height, `#1D9E75` background, `#04342C` text. Secondary "I already have an account" at 44px height with a hairline `#08402F` border and `#9FE1CB` text.

##### Layout — user-type selection

The same header (system row, then breadcrumb). Below the breadcrumb, a three-dot progress indicator (one dot filled `#1D9E75`, two muted `#08402F`).

Title "How will you use this?" at 22px weight 500. Subtitle "Pick one. You can change it later." at 13px in `#5DCAA5`.

Three large selection cards stacked vertically with 10px gap. Each card is 80px tall with a 36×36 rounded icon on the left (`#08402F` background, mid-teal icon), title and subtitle in the middle, and a radio-button indicator on the right (a `circle-check-filled` for selected, an empty `circle` for unselected).

The three options:
- **Lifter** — Track my own training. (Default selected on first launch.)
- **Personal trainer** — Manage clients and programs.
- **Gym operator** — Run a facility, members, equipment.

The selected card uses `#0F6E56` background with a 1.5px `#5DCAA5` border. Unselected cards use `#0E1F19` background with a 0.5px `#08402F` border.

Primary button at the bottom reads "Continue."

##### Rationale

User-type selection is the most consequential decision in the entire app — it changes the schema visible to the user, the RLS policies enforced server-side, and the UI variant rendered. So it earns its own screen rather than being buried in a dropdown deep in settings.

The welcome screen's three pillars are not random marketing fluff. Each one is a real promise tied to a real feature, and each one is the answer to a different competitor pain point: Hevy is slow for power users (we promise two taps); Strong and Fitbod struggle in basement gyms with no signal (we promise offline); every competitor sells data in some form (we promise private-by-default). These pillars also become the App Store screenshot captions.

##### Data and behavioural implications

The user-type selection is persisted in the user's Clerk public metadata as `userType: "lifter" | "trainer" | "gym_operator"`, and the Clerk Organization is auto-created (for trainer and gym_operator) or auto-joined (for lifter) immediately on confirmation. PowerSync sync streams are activated based on this value:

- `user_data` — always active, covers personal logs and routines
- `catalog` — always active, covers exercise library
- `trainer_clients` — active for trainer userType
- `gym_aggregates` — active for gym_operator userType

This Clerk-driven sync-stream activation is what makes the three user types feel like distinct apps without requiring three separate builds.

#### Screen 2 — Home

##### Role

The default landing surface for the lifter. Tells the user what to do next without making them think — a primary "Start" action, today's planned routine surfaced if it exists, glance at this week's training cadence, recent achievements.

##### Layout

System row at top in `#5DCAA5`. Header band with date string ("Tuesday, May 7") at 12px, greeting "Good morning, Marko" at 22px, and a 36×36 user avatar square top-right.

Hero card: today's planned routine. Background `#0F6E56`, 16px padding. A small label row reads "TODAY, PUSH DAY" with a "week 3" pill on the right. Below it, the routine name at 18px weight 500 ("Upper hypertrophy, 5 exercises"). Three stat tiles stripe across the middle — est. time, total sets, last done — in `#08402F` tiles. The full-width primary button "Start workout" with a play icon glyph.

Below the hero, two equal-weight secondary action buttons in a row: "Empty workout" (with a plus icon) and "Scan equipment" (with a QR icon). These cover the two off-plan cases — starting from scratch or starting from a machine sticker.

A "THIS WEEK" section: small uppercase label and a date-range subtitle. Inside a `#0E1F19` card, a left-aligned 28px display number ("8,420 kg" total volume with "kg" superscripted) above a sub-label "total volume · 3 sessions." On the right, a delta "+12% vs last week" in muted green. Below, a 7-bar histogram representing the week, with today's bar in `#E1F5EE` and other completed days in `#1D9E75`. Day-of-week labels (M T W T F S S) sit below the bars.

A "RECENT MILESTONES" section with two compact action rows. First row: a `#633806` amber tile holds a trophy icon, with text "New 1RM · barbell back squat" and a subtitle "125 kg, yesterday." Second row: an `#08402F` teal tile holds a flame icon, with text "12 day streak" and the subtitle "Don't break the chain."

Bottom tab bar with five tabs: Home (active in `#1D9E75`), Library, Workout, Progress, Profile.

##### Rationale

The home screen's job is "tell me what to do next." Today's planned routine occupies the largest card with the single accent button — eyes find it instantly. The two secondary buttons handle the off-plan cases without competing for attention. The this-week histogram is glanceable; the user sees their training cadence in 0.2 seconds and either feels good (lots of green bars) or has a soft motivator to train today (gaps in the histogram). Recent milestones are celebratory but not actions — they live below the fold to reward scrolling.

We deliberately omit a "social feed" and an "explore" tab. Pulse is private by default; we don't have a feed. Pulse trusts the user to know what they want; we don't need to push explore content at them. The home screen says exactly what's needed and stops.

##### Data and behavioural implications

The "today's planned routine" card surfaces the next scheduled session from a `scheduled_workouts` table joined against the user's active program. If no schedule exists, the card collapses to "No routine scheduled. Train freely." with the empty-workout button promoted.

The 7-bar histogram queries `workout_sets` grouped by `local_date` (using the user's timezone, not UTC) and sums volume per day. The aggregation is local-first via PowerSync; the query runs against the local SQLite directly with no network round-trip.

The "Recent milestones" rows pull from a `personal_records` view that updates on each set commit via a server-side trigger. The local cache is denormalized to keep the home screen reading from a single small table — important on cold launch when SQLite is warming up.

#### Screen 3 — Active workout, three states

##### Role

The screen the user spends 60–90 minutes per day inside. If this screen is wrong, the app fails regardless of how the rest looks. Three states are documented: just started (no sets logged yet, exercise picker visible), between exercises (collapsed view of completed exercise, next one queued), and post-workout summary.

##### Layout — just started state

Compact header: chevron-left, then a context block reading "push day · week 3" on top and "00:42 · 0 of 5" below (the elapsed time and overall progress). Dots-vertical menu on the right.

Hero card: the first exercise. Background `#0F6E56`. Label "up first" then exercise name "Barbell back squat" at 17px. Two nested stat tiles — "target" (4 × 8) and "last best" (100 × 8). Primary button "Begin first set."

A small "UP NEXT" label introduces the queued exercises. Each queued exercise is a compact row in `#0E1F19`: a 28×28 numbered badge (2, 3, 4...), the exercise name, and a "3 × 8" rep/set summary.

At the bottom, a "+ Add exercise" button with a dashed border, allowing the user to inject an exercise mid-workout.

##### Layout — between exercises state

The same header style. The completed exercise (e.g., "Barbell back squat") collapses to a single muted row with a green check icon and four set summary chips ("60×8", "100×8", "100×8", "100×7").

Below it, the next exercise is promoted to the hero position with its own stat tiles and primary button "Start bench press."

A rest timer card appears between the completed and queued exercises. It shows a 36×36 progress ring with "1:24" inside, labelled "resting between exercises · extended rest, 2 min." This is the only place where the rest timer fires with an "extended rest" label — between exercises is intentionally longer than between sets.

##### Layout — post-workout summary

A celebratory layout. At the top, a 56×56 `#0F6E56` square with a large check glyph, followed by "Workout complete" at 20px and a subtitle "Push day · 51 minutes."

Below, if any PR was set: an amber PR pill (`#633806` background) with the trophy icon and the PR description ("Barbell back squat · 100 kg × 8 reps").

A 2×2 grid of stat tiles: total volume, sets logged, duration, avg RPE.

A "HOW DID IT FEEL?" card with four emoji buttons (struggle, neutral, strong, fire). The selected emotion is encoded green and accent-bordered. This is the optional effort capture — feeds into the workout's `subjective_effort` field.

Primary button "Save workout" at the bottom, with a secondary "Add note" below it.

##### Rationale

The three states encode the natural arc of a workout — beginning, middle, end. Each has different information needs. At the beginning the user needs to know what comes first and what's queued. In the middle the user needs to know what just happened and what's next. At the end the user needs reward and capture.

The "between exercises" state collapses the completed exercise to one line precisely because the user does not need to dwell on what they just did — they need to focus on what's next. The four set-chips on the collapsed row give a 0.2-second glance summary in case they want to verify.

The completion summary leads with the PR badge (when one exists) because that's the emotional payoff of the session. The 2×2 stat grid is the data nerd's reward. The how-did-it-feel emoji row is the soft RPE capture — it doesn't ask the user to think about RPE in numbers, just to pick a face. The mapping to a 1–10 RPE happens server-side in the analytics layer.

##### Data and behavioural implications

The workout session is a single `workout_session` row created when the user taps "Start workout" on home. Every logged set inserts a `workout_set` row with a foreign key to the session. The session row tracks `started_at`, `ended_at` (null until completion), `gym_id`, `routine_id` (optional, null for empty workouts), `subjective_effort` (the emoji selection, 1–4 scale internally), and a free-text `notes` field.

The "Save workout" action sets `ended_at` and runs PR detection in a single transaction. PR detection compares the new sets against the user's history per `exercise_id` and per `gym_equipment_instance_id`, creating `personal_record` rows for any new records. The detection is local-first via SQLite and the resulting PR rows sync to the server on next online cycle.

#### Screen 4 — Routine builder

##### Role

The screen serious users live in when not actively training. The job: let a user assemble a multi-exercise routine fast, see what they've built, save it. The output is a `routine` row with N `routine_exercises` rows in order.

##### Layout

A compact header: X icon (close without saving), centred "New routine" title, primary "Save" button on the right.

Below the header, a card with inline editable inputs. The routine title is a borderless text input rendered at 18px weight 500 — no separate field, no label. The description is a borderless text input below it at 12px in `#5DCAA5`. Below the description, a row of tag chips: pre-applied tags ("Push", "Hypertrophy") and a dashed-border "+ tag" affordance.

A three-tile summary stripe: exercises count, total sets, estimated time. These update live as the user adds or removes content.

An "EXERCISES" section with an arrows-sort icon on the right (changes the sort mode). Each exercise row is a card:

- 28×28 numbered badge (1, 2, 3...)
- Exercise name at 13px weight 500
- Subtitle showing muscle group and equipment ("Quadriceps · barbell")
- Drag-handle icon (`ti-grip-vertical`) on the right for reordering
- Below the row, a left-indented chip cluster: "4 sets", "8 reps", "2 min rest" — tappable to adjust

A superset card looks different — a `#0F6E56` background with a dashed `#5DCAA5` border. Inside: a `ti-replace` icon, "Superset" label, and the paired exercise names. A chevron-down expands the superset to show its components.

At the bottom, a dashed-border "+ Add exercise" button stretches full width.

##### Rationale

The inline editable title is a small but meaningful choice — most routine builders make the user navigate to a separate "edit name" field. Making it inline says "this routine is yours, not the system's." The dashed border on the +tag and +exercise buttons is a Pulse convention — dashed borders mean "draft or extensible," solid borders mean "committed." Once the user adds content, the dashed becomes solid as the content takes shape.

The three-tile summary updating live is the trust-building moment: the user sees "5 exercises · 21 sets · 52 min" and knows what they're building. No "calculate" button.

The superset card is visually distinct (saturated green background) because it's a structural element, not just another exercise. This is the same colour family as the hero card precisely because supersets *are* hero structures — they're the most important grouping in any program that includes them.

##### Data and behavioural implications

A `routine` row holds the routine metadata. `routine_exercises` rows are ordered by a `position` integer, with the order surface-edited by the drag handle. Supersets are encoded as a `routine_exercise` row with `kind = superset` and a `superset_group_id` matching the entries of the partnered exercises.

Tags are stored in a many-to-many `routine_tags` table. Default tags ("Push", "Pull", "Legs", "Hypertrophy", "Strength", "Powerlifting", "Bodybuilding") are seeded; users can create custom tags scoped to their own account.

Inline edits use the implicit-confirm pattern — typing in the title field doesn't trigger a save, but tapping "Save" in the header does. Closing the screen with unsaved changes triggers the only modal in the entire app ("Save changes? · Yes · Discard"), because the user has invested real time and silent discard would be hostile.

#### Screen 5 — Exercise library

##### Role

The library is where users browse to add an exercise to a routine or to start an ad-hoc workout. Filtering by current gym is the default. Search is primary; categories are secondary.

##### Layout

Header: "Library" title at 22px, plus icon top-right for adding a custom exercise.

Search bar across full width: a 0.5px-bordered card with a search icon left, placeholder text "Search 5,000+ exercises" centred, and a microphone icon right (voice input).

A horizontal-scrolling filter chip row below the search: "My gym" (active, accent-coloured), "All", "Custom", "Favorites". The default is "My gym."

A "BROWSE BY MUSCLE" label, then a 2-column grid of muscle-group cards. Each card is a row with a 32×32 tile-icon on the left (`#08402F` background), the muscle name, and an exercise count subtitle. Six muscle groups: Chest, Back, Legs, Shoulders, Arms, Core.

A "RECENT" label, then a flat list of recently-used exercise rows. Each row: 36×36 play-icon tile, exercise name, subtitle showing muscle/equipment/type ("Quadriceps · barbell · compound"), and on the right a "last" indicator showing the user's last logged weight (e.g., "100 kg").

Bottom tab bar with Library active.

##### Rationale

The "My gym" default filter solves the biggest competitor pain point — Hevy and Fitbod both show you a Smith machine you don't have access to. By filtering to the current gym's equipment by default, we cut the noise to about a third of the catalog and the user sees only what's actually possible.

Browse-by-muscle is the 2-column grid because that's what fits at 380px viewport width per the mobile design system. Six cards in two rows is a comfortable touch target — each card is roughly 170×80px, well above the 44px floor.

The last-weight indicator on each recent row is what turns the library from "exercise catalog" into "your training memory." When the user taps "Bench press" and sees "last 80 kg" right there, they walk into the gym already knowing what they're going to lift. This is the data model paying off in the UI.

##### Data and behavioural implications

The library's filtering is a join: `exercises` left-joined to `gym_equipment` where `gym_id = current_gym_id`. The exercise catalog comes from ExerciseDB (a 5,000+ exercise dataset we license — chosen over wger because of higher-quality video coverage and proper IP rights, decision recorded in ADR 0001).

The "Recent" section reads from the user's `workout_sets` table, grouped by exercise, ordered by `created_at` descending, limited to 10. The "last weight" on each row is the most recent set's weight value (or pin value for selectorized machines).

Custom exercises are user-created rows in `custom_exercises` with the same schema as the public `exercises` table, scoped by `user_id`. They're synced via PowerSync and only visible to their creator.

#### Screen 6 — Exercise detail

##### Role

Tapping any exercise opens this modal. The user can preview the exercise via video, see their personal history, read instructions, and either add it to a routine or start logging it directly.

##### Layout

A modal header: X close icon left, heart (favorite) + share + dots-menu icons on the right.

Hero element: a 16:11 video tile. The tile background is `#08402F` with a stylized illustration of a person mid-lift centred. A play overlay glyph (52×52 with a play icon) sits centred. A small duration badge ("0:18") sits bottom-right. The video is Mux HLS-streamed via `expo-video`.

Below the video, the exercise title at 22px weight 500 with a metadata strip below: "Quadriceps · Barbell · Compound" with bullet separators.

A three-tile stat grid showing the user's personal numbers for this exercise: 1RM estimate, best set, total reps.

Full-width primary button "Add to workout" with a plus icon.

A "YOUR PROGRESS" card with a 3-month sparkline chart. The chart is a smooth line from old to new with a soft fill underneath. The latest point is ringed for emphasis.

A "HOW TO PERFORM" section with three numbered steps. Each step is a row: a 22×22 numbered badge in `#08402F`, then the instruction text at 12px in `#E1F5EE`.

##### Rationale

Video at the top because that's what users want to see first — "is this the exercise I think it is?" The play-overlay glyph is a standard pattern that works mid-stream because nothing is animated; the actual video player initializes after streaming completes.

The three personal stats (1RM, best set, total reps) are *the user's numbers*, not generic facts. This is what makes the detail screen feel personalised. A novice sees zeros and is invited to set them. A power user sees their entire history at a glance.

The 3-month sparkline is the smallest progress chart in the app — it's a teaser. Tapping the card opens the full exercise progress chart (screen 21), which is the deep-dive view. This keeps the detail screen scannable.

The numbered instruction steps use the same numbered-badge style as the routine builder, creating a visual consistency across the app. Three steps maximum — more than that, the user stops reading.

##### Data and behavioural implications

The video URL is a Mux playback ID resolved from the `exercise.video_id` field. The `expo-video` player streams via HLS for adaptive quality, and `expo-video-cache` ensures pre-cached videos (from offline routine downloads) play instantly from disk.

The three personal stats query `workout_sets` for this user and exercise:
- 1RM est. = `MAX(weight * (1 + reps / 30))` (Epley formula)
- Best set = the set with the highest `weight × reps` product
- Total reps = `SUM(reps)` across all logged sets

These computations run server-side in a materialised view refreshed nightly, with local SQLite caching the latest values per exercise. Cold-launch reads from cache; the network sync refreshes asynchronously.

#### Screen 7 — Sign-in

##### Role

The Clerk-rendered authentication screen, styled to match Pulse. Passkey is the primary method. Apple and Google sign-in are secondary. Email magic-link is the fallback.

##### Layout

System row in muted teal. A header with a back chevron (returns to welcome).

A heading "Welcome back" at 26px weight 500, with a subtitle "Sign in to pick up where you left off."

Four authentication options stacked vertically with 10px gap:

- **Passkey** — 52px tall card with a `#0E1F19` background and a `#5DCAA5` 1.5px border. Fingerprint icon + "Sign in with passkey" label.
- **Apple** — 52px tall card with a `#E1F5EE` (near-white) background and `#04342C` (near-black) text. Apple logo + "Continue with Apple."
- **Google** — 52px tall card with `#0E1F19` background and 0.5px `#08402F` border. Google logo + "Continue with Google."
- Divider: "or with email"
- Email input row showing the user's saved email (read-only display)
- Primary button "Send magic link" with a right-arrow glyph.

At the bottom: "New here? Create an account" with the create-account link in mid-teal.

##### Rationale

Passkey is the future-default in 2026 and we want users to set one up. The bordered card signals "this is the recommended method" without being pushy.

Apple's button has mandatory styling per Apple's HIG when other social providers are present — white background, black text, Apple logo. We can't restyle it without risking App Review issues. Google is rendered in our system styling because Google's brand guidelines are less restrictive in this context.

Email magic-link is below the divider because in 2026 it's the third-best path. We support it (forever, given many users still prefer email) but we don't promote it.

##### Data and behavioural implications

Clerk handles the entire authentication flow. On successful sign-in, Clerk issues a JWT that PowerSync's edge function validates via JWKS. The user's `userType` is read from Clerk's public metadata, which determines the sync streams that activate.

The "passkey is recommended" framing also serves a real security goal — passkeys are phishing-resistant by design, and they let us drop password-based auth entirely (we never store a password hash). This is a real product-level security improvement, not just a UX nicety.


### Smart logger surface

Four screens that encode the gym-context filtering and the smart logging innovations. These are the heart of the product's differentiation.

#### Screen 8 — Gym selection in settings

##### Role

The user opens this from Profile → My gyms. They see every gym they've checked into, with one marked "current." Tapping a different gym makes it current; the library, exercise selector, and pre-flight check reshape immediately. A QR icon top-right opens the camera to scan a new gym sticker.

##### Layout

Header: chevron-left, "My gyms" title, QR icon right.

A "CURRENTLY TRAINING AT" label, then the current-gym hero card. Background `#0F6E56`, padding 14px, 1.5px `#5DCAA5` border. A 44×44 building-icon tile on the left, gym name "Iron Hub Belgrade" with a "Vračar · 1.2 km away" subtitle, and a circle-check-filled icon on the right.

Three nested stat tiles inside the hero: equipment (128 items), visits (47), last (today).

Two action buttons inside the hero: "See equipment" (list icon) and "Report missing" (flag icon).

A "SWITCH GYM" section with the saved-gym list. Each row: a 36×36 contextual icon (home for personal, plane for travel, building for commercial), the gym name, a subtitle showing type + equipment count + last visit, and a "Switch" button on the right.

A dashed-border "+ Add another gym" full-width button.

A bottom info card: "How gyms work — Your current gym filters the exercise library to equipment that's actually available. Scan a QR code at a new gym to add it instantly."

##### Rationale

Current gym is the hero so the user's mental model is anchored. Three at-a-glance stats prove the binding is meaningful — 128 equipment items associated with this gym, 47 visits logged, last visited today. These are facts the user can verify against their reality.

The "Switch" buttons are deliberately small (28px tall, brief 11px text) so they read as quiet alternatives. The current-gym card dominates because that's the gym the user is at right now.

The "Report missing" button is the user-generated equipment-fix path. When a user reports something missing, it goes into the gym operator's pending queue. This is a small but important growth loop — the more users report fixes, the better the gym catalogs become, the more useful the app is at each gym.

##### Data and behavioural implications

A user belongs to many gyms via `user_gyms` (a many-to-many table). The "current gym" is a single `current_gym_id` foreign key on the user's profile. Switching is one write that triggers a reactive recompute of the library filter and recent-exercise sorts.

The "1.2 km away" calculation uses the device's location (with permission) compared against the gym's stored coordinates. If location permission is denied, the distance text is suppressed silently — no nag.

Equipment reports go to a `equipment_reports` table with `gym_id`, `reported_by_user_id`, `equipment_name`, `note`, and `status`. The gym operator's dashboard surfaces pending reports.

#### Screen 9 — Smart exercise selector

##### Role

What the user sees when they tap "Empty workout" or "Add exercise" mid-session. Filtered to the current gym's equipment by default, sorted by what the user used last time, with last-weight and last-equipment-instance shown inline.

##### Layout

Header: X close icon, "Add exercise" title, filter (adjustments-horizontal) icon right.

A small gym context pill below the header — `#08402F` background, building icon + "Iron Hub Belgrade · 128 items" + chevron-down. Tapping it shows the gym switcher inline.

A search bar below the pill (same as the library).

A filter chip row: "Recent" (accent-active), "Chest", "Back", "Legs", "Arms" — horizontal scroll.

A list of exercise rows, each 64px tall:

- 40×40 contextual equipment icon tile
- Exercise name at 13px
- Subtitle showing the specific equipment + last weight ("Power rack 2 · last set 100 × 8" / "Cable station 1 · last pin 9 (65 kg)" / "Hammer Strength · last 180 × 10")
- Right side: a small "2 days ago" date, with a 34×34 "+ add" button below it. The first row's + button is accent green; subsequent rows are muted.

At the bottom, a "Show all of my gym's exercises" button to escape the recent-only filter.

##### Rationale

The first row's + button is accent green because it's the most-likely-next-exercise. This is anticipatory UX — the app makes a best guess and renders it as the default action. The user can still tap any other row, but the eye is drawn to the freshest option.

Each row shows the *specific equipment instance* (e.g., "Power rack 2", "Bench 3", "Cable station 1"), not just the equipment category. This is the per-equipment binding paying off in the UI. The lat pulldown row showing "pin 9 (65 kg)" rather than just "65 kg" matches how the lifter actually thinks.

The gym context pill is tappable to switch gyms inline — important for users who train at multiple gyms in the same day (e.g., gym A in the morning, hotel gym in the evening).

##### Data and behavioural implications

The query joins `exercises` → `gym_equipment` → `user_workout_sets`. The sort key is `MAX(workout_sets.created_at)` per exercise. The "last" annotation pulls the most recent set's weight + equipment_instance + relative time.

#### Screen 10 — Smart set logger, two equipment models

##### Role

The screen that replaces everything. The user has tapped an exercise and is logging a set. Two equipment models are shown side-by-side: barbell bench (±5 kg increment) and selectorized cable (±1 pin increment).

##### Layout — barbell variant

Header: chevron-left, breadcrumb "push day · exercise 2 of 5" and "28:14" elapsed time. Dots-vertical menu right.

Hero card: exercise name "Bench press" with subtitle "Bench 3 · 80 kg last session · target 3 × 8."

The set logger card: background `#0E1F19`, padding 14px. Header row: "SET 3" label left, three progress dots right (two filled `#5DCAA5`, one filled `#E1F5EE` = current).

A large centred display: 56px weight readout "80", "kg" subtext below. Caption "same as last set · 8 reps target."

Full-width primary button "Log 80 × 8" with a check glyph, 64px tall, accent green.

Below the primary, two equal secondary buttons in a row: "75 kg / −5 kg" and "85 kg / +5 kg." Each is 50px tall, `#08402F` background, mid-teal text.

A divider, then a footer row of three tertiary actions: "edit" (pencil), "warmup" (bolt), "failure" (flame).

At the bottom of the screen, the two already-logged sets appear as muted collapsed rows ("set 2 · 80 × 8 · RPE 7", "set 1 · 80 × 8 · RPE 6").

##### Layout — selectorized cable variant

Same header structure. Hero card reads "Lat pulldown · Cable station 1 · pin 9 last session · target 3 × 10."

The set logger card has the same structure but the centred display reads "pin / 9" with a smaller "≈ 65 kg" muted text to the right. The primary button reads "Log pin 9 × 10."

The two secondary buttons read "pin 8 / ≈ 57 kg" and "pin 10 / ≈ 72 kg" — pin position primary, kg approximation secondary.

Below the action area, an info pill: "This machine uses pins. Approx kg shown for reference. Progress tracks pin position."

##### Rationale

Two side-by-side examples make it visually obvious that the increment logic is per-exercise, not one-size-fits-all. The barbell shows ±5 kg with kg-only readout. The cable shows ±1 pin with kg-as-supplementary-info.

The button label is contextual to the action ("Log 80 × 8" / "Log pin 9 × 10") rather than generic ("Save", "Log set"). The user reads what's about to happen, not what control they're pressing. This is the Pulse copy principle in action.

The footer tertiary actions ("warmup", "failure", "drop set", "edit") expose the rare-but-real cases without crowding the primary surface. "Edit" opens a manual numeric input with the system keyboard for the rare case the user needs an unusual value. "Warmup" marks the set as a warmup so it doesn't count toward working-set volume. "Failure" marks the set as taken to failure (affects RPE inference). "Drop set" transforms the current set into the first set of a drop-set group.

##### Data and behavioural implications

The set commit writes a `workout_set` row with `weight`, `reps`, `exercise_id`, `gym_equipment_instance_id`, `workout_session_id`, `pin_position` (for selectorized), and metadata flags (`is_warmup`, `is_failure`, `set_group_id`).

For selectorized machines, the canonical stored value is `pin_position`. The `weight` field is filled with the approximate kg conversion for the machine (looked up from `gym_equipment.pin_to_kg` mapping), and PR detection runs on `pin_position` for selectorized exercises rather than `weight`.

#### Screen 11 — Implicit-confirm sequence

##### Role

Three sequential frames showing the implicit-confirm pattern in action. Each frame is "what the screen looks like right after the user's most recent tap."

##### Frame 1 — Set 2 just logged

A small confirmation success row at the top: "Set 2 logged · 80 kg × 8 · 2 sec ago" with a green check icon. This fades after 2–3 seconds or stays until next interaction.

Below it, the set logger card has automatically loaded Set 3 with the same values from Set 2 (80 × 8). The card has the **resting state** styling — solid 0.5px `#08402F` border.

##### Frame 2 — User adjusted weight

The same screen but the user has tapped "75 kg" to step down. The big readout now shows 75. The card border has become **1.5px dashed `#5DCAA5`** — the universal "draft state" signal. A small amber "unsaved" chip appears in the top-right corner of the card.

A footer hint reads: "Tap Log or move on — unsaved sets discard." This hint is only present in the first few sessions the user uses this pattern; after the third set logged via implicit-confirm (tracked locally), it's hidden.

##### Frame 3 — Moved to next exercise

The user chose to advance to the next exercise without logging the drafted set. The previous exercise (Bench press) has collapsed to a compact summary at the top, showing the two sets that *were* confirmed.

A small amber-coloured note in the collapsed summary reads: "set 3 discarded · undo" with a back-arrow icon. Tapping "undo" restores the draft for one more chance to confirm.

Meanwhile the next exercise (Romanian deadlift) is now the hero card, with its first set auto-loaded at 90 kg (last session's value).

##### Rationale

The three-frame sequence is the most important UX explanation in the entire spec. It documents a behaviour that competitors (Hevy, Strong, Fitbod) get wrong, and that lifters notice immediately when it's right.

The key visual signal is the **dashed border + amber chip**, which is the universal "draft" indicator. The user can read at a glance: solid border = confirmed, dashed border + amber chip = unsaved.

The undo affordance on discard is small but essential. Silent data loss is hostile, even when the discard was the user's intent. The amber-coloured note in the previous exercise's summary is unobtrusive but findable.

##### Data and behavioural implications

The "drafting" state lives only in the local workout store (Zustand + MMKV). It is *not* persisted to SQLite or synced. Only confirmed sets become `workout_set` rows. Draft state is in-memory.

The "undo" action retrieves the last draft from a short-lived in-memory ring buffer (last 5 drafts). Drafts older than 5 minutes or beyond the buffer are not recoverable — the user has moved on.

The "after 3 confirmations, hide the hint" rule is tracked in a `user_preferences.has_seen_implicit_confirm_hint` boolean, persisted locally and synced.


### Logging edge cases

Three screens for the parts of training that break naive set trackers.

#### Screen 12 — Stepped reps logger

##### Role

The set logger with both weight AND reps as ±-stepped values. This is the final form of the smart logger from screen 10, with reps also defaulting to last session's value rather than blank-waiting-for-input.

##### Layout — default state

Hero card identical to screen 10: "Bench press · Bench 3 · 80 × 8 last session · target 3 × 8."

The set logger card has a header row "SET 3 · last set: 80 × 8" and a three-dot progress indicator.

Below the header, a horizontal stack of two stat-tile-style input columns: WEIGHT and REPS. Each column has:

- A small label at the top in `#9FE1CB`
- Two side-by-side controls: − button (left), large display number (centre), + button (right)
- A footer caption: "step 5 kg" / "step 1 rep"

The display numbers are 28px weight 500. The − and + buttons are 28×28 squares, `#0F6E56` background (one shade lighter than the tile they sit in for visual depth), with mid-teal symbol.

Below the columns, the primary button "Log 80 × 8" at 60px tall.

A divider, then a tertiary action row: "flame · failure", "bolt · warmup", "trending-down · drop set."

##### Layout — adjusted state (PR pace)

When the user steps weight up AND reps up enough to create a volume PR for this exercise, the card transforms.

Both column borders become 0.5px `#5DCAA5`. Each column shows the delta as a `#97C459` positive subtitle ("+5 kg", "+2 reps").

The primary button changes to include a trophy icon and the label becomes "Log 85 × 10 (PR pace)."

Below the primary button, a small green pill: "+85 kg total volume vs. last session."

##### Rationale

Stepped reps with last-session-matching makes the workflow consistent — both weight and reps treat the past as the default and adjustments as the exception. The user mental model is "match unless I'm pushing today."

The PR-pace anticipation is the differentiating moment. When the user is *about to* hit a PR (not after the set, but in the draft state), the app recognises it and changes the button. This is forward-looking celebration — the user knows they're about to do something special. After they tap, the post-workout summary will confirm the PR.

The volume-delta pill below the button (when PR pace) gives a quantifiable reason to commit. "+85 kg total volume" is a real number, not generic encouragement.

##### Data and behavioural implications

PR-pace detection is computed live in the draft state. The pace check compares the draft values against the user's stored PRs for this `exercise_id` × `gym_equipment_instance_id`:

- 1RM PR-pace: if `weight × (1 + reps / 30) > current_1RM_PR`
- Reps PR-pace: if at the same weight, reps > current best
- Volume PR-pace: if total session volume on this exercise > best previous session

If any of those evaluate true, the button transforms.

#### Screen 13 — Superset logger

##### Role

Supersets rendered as one round with two exercises stacked. Two frames documented: round 2 first-exercise active, and round 2 done resting.

##### Layout — first exercise active

Header: chevron-left, breadcrumb "pull day · exercise 3 of 5" and "22:08" elapsed. Dots-vertical menu.

Hero card: chain-link icon + "SUPERSET · 3 rounds" small label, "round 2 of 3" right-aligned. Exercise pair title "Pull-up + Dumbbell row" at 16px weight 500. A round-progress bar (3 segments: round 1 = `#5DCAA5`, round 2 = `#E1F5EE` (active), round 3 = `#08402F`).

Below the hero, exercise A's input card. It's an `#0E1F19` card with a 1.5px `#5DCAA5` border (active state). The card header: a 24×24 "A" badge in `#1D9E75`, exercise name "Pull-up", subtitle "bodyweight · last 10 reps." A green "now" pill right-aligned.

Stepped input columns: BODY + LOAD (BW) and REPS (10). Primary button "Log and move to B" with a down-arrow icon.

Below A's card, exercise B's card in queued (muted) state — opacity 0.5. Just a header row: 24×24 "B" badge in `#08402F`, exercise name "Dumbbell row", subtitle "25 kg × 10 last round · queued."

A bottom info pill: "No rest between A and B. Timer starts after both are logged."

##### Layout — round 2 done resting

Hero card same as before but with "round 2 done" subtitle.

A rest timer card occupies the prime real estate. Background `#0E1F19`, padding 14px. A 56×56 progress ring on the left showing "2:14." Caption "Rest before round 3 · 2 min target · longer than single set." A "Skip" button right.

Below the timer, two compact confirmation rows showing what was just logged: A (Pull-up · BW × 10) and B (Dumbbell row · 25 × 10).

Below the confirmations, a "Start now" affordance for when the user feels recovered before the timer expires.

A "PREVIOUS ROUNDS" section showing round 1's summary in a compact single-line format.

##### Rationale

The chain-link icon + "SUPERSET" label is the universal signal that this is a linked structure. The round-progress bar shows where the user is in the sequence at a glance.

The "now" pill and 1.5px green border on exercise A's card make the active exercise unambiguous. The greyed-out exercise B below it signals "queued, not yet."

The button label "Log and move to B" is more informative than "Next" — the user knows exactly what tapping does. After A is logged, the card flips: A becomes the muted state, B becomes active, and the button reads "Log and finish round."

Rest only fires after the *round* — never between A and B. This is the user's mental model, so we encode it directly.

The "Start now" button on the rest card matches how supersets feel — the user is the better judge of when they're recovered, especially in compound sets.

##### Data and behavioural implications

A superset is a `set_group` row with `kind = superset`. Each exercise's sets within the group carry `set_group_id` and `set_group_position` (0 for A, 1 for B). The rest timer is stored on the `set_group` (not the individual sets) and the active workout store knows to suppress between linked sets.

The "after 3 supersets seen, hide the info pill" rule is again in `user_preferences.has_seen_superset_hint`.

#### Screen 14 — Drop set logger

##### Role

Drop sets rendered as one extended set with multiple drops. Two frames: mid-drop-set (active drop 2 of 3) and complete (all drops logged, resting).

##### Layout — mid drop set

Hero card: trending-down icon + "DROP SET · top set 80 × 8" label, "drop 2 of 3" right-aligned. Title "Lateral raise · top weight to failure."

Below the hero, the completed top set shown as a single confirmed row: check icon + "1" badge + "Top weight · to failure" + "12 kg × 12" right.

Below the top set, the active drop's input card. Header row: "2" badge in `#1D9E75`, "Drop 1" label, "last time: 10 × 8" right.

Stepped input columns WEIGHT (10 kg) and REPS (8). Primary button "Log drop and continue" with a down-arrow.

Below the active drop, the queued drop shown muted: "3" badge + "Drop 2" label + "≈ 8 kg next · queued."

Bottom info pill: "No rest between drops. Big rest after the final drop."

##### Layout — drop set complete

Hero card with a check icon and "DROP SET COMPLETE" label. Subtitle "Lateral raise · 12 → 10 → 8 kg · 28 total reps" — this summary line is exactly how a lifter describes the drop set to a training partner.

Below, three compact confirmation rows: Top (12 × 12), Drop 1 (10 × 8), Drop 2 (8 × 8). Each with its position badge.

Below the confirmations, the rest timer card with a 2:31 ring and "Rest before final set · 3 min · earned after drop set" label.

At the bottom, a small celebratory pill: trophy icon + "+4 reps on drop 1 vs last time · 28 total reps in drop set."

##### Rationale

The trending-down icon for drop sets is a deliberate semantic choice — it's *intentional* descent, not failure. The hero card's "top set 80 × 8" framing makes clear what the top weight was.

The data model unifies supersets and drop sets under the `set_group` pattern. Both are linked sequences with one rest at the end. From an analytics perspective, both are "advanced techniques" that signal a more serious lifter — useful for cohort analysis.

The "+4 reps on drop 1 vs last time" pill is the drop-set-specific PR recognition. Even though the user didn't lift heavier, they did *more work* at the same drop weight, and that's worth celebrating.

##### Data and behavioural implications

A drop set is a `set_group` with `kind = drop_set`. Position 0 is the top set, positions 1, 2, 3... are the drops. The rest after the final drop is encoded on the group with `rest_seconds = 180` (3 min default) rather than the standard 2 min.

PR detection on drop sets has two paths: traditional PR on the top set (treated like a normal set), and "drop PR" on each drop (improvement at the same drop weight versus the last drop set of this exercise). Drop PRs are surfaced in the summary pill but do not show up in the main PR feed — they're a softer recognition.


### Logging surface completion

Three screens that round out the logging surface — the pre-flight check, the QR scan flow, and the rest states.

#### Screen 16 — Routine pre-flight check

##### Role

The moment the user taps "Start workout" on their planned routine, the app checks whether the current gym has every piece of equipment that routine requires. If anything is missing, this screen appears before the workout starts. The user can swap, skip, or proceed.

##### Layout — missing equipment

Header: chevron-left + "Pre-flight check" title.

A warning hero in coral semantic palette: `#4A1B0C` background, padding 14px. An alert-triangle icon + "1 exercise needs attention" header, then a description in `#F5C4B3` body: "Iron Hub Belgrade doesn't have a leg curl machine. Pick a swap or skip the exercise to continue."

A "PUSH DAY — 5 EXERCISES" label, then the exercise checklist. Most rows are compact green-checked confirmations:

- `ti-circle-check` (green) + "Barbell back squat" + "Power rack 2 · ready"
- `ti-circle-check` + "Bench press" + "Bench 3 · ready"
- ...etc

The problematic exercise expands inline as a coral card (`#4A1B0C` background, 1.5px `#F0997B` border):

- `ti-alert-circle` + "Lying leg curl" + "no leg curl machine here"
- A "SUGGESTED SWAPS" sub-label
- Two suggestion rows: radio-button + exercise name + relevance subtitle ("same muscle", "similar pattern")
- A small "or skip this exercise" link

After the problematic exercise, the remaining ready exercises continue.

At the bottom, two stacked buttons: primary "Start workout" (accent green, still enabled because the user can proceed with a swap selected) and secondary "Edit routine instead."

##### Layout — all equipment ready

A green-path version. Header chevron-left + "Ready to train" title.

Hero card: a large 48×48 check-icon tile + "All set" title + "Push day · 5 of 5 exercises ready" subtitle.

Three nested stat tiles: est. time, total sets, target volume.

A "EQUIPMENT YOU'LL USE" section listing each piece of equipment as a row with icon + name + status (e.g., "free now", "1 user waiting" — the realtime availability indicator if the gym has equipment-usage tracking enabled).

Primary button "Start now" with a play icon.

##### Rationale

The coral semantic palette for the warning is restrained — alert without alarm. The single-sentence description tells the user exactly what's wrong. The two suggested swaps are ranked: "same muscle" first (the safer programmatic substitute), "similar pattern" second.

The primary button stays enabled because the workout can still start once a swap is selected — defaulting to the top suggestion on tap, so this is a one-tap path through the pre-flight if the user agrees with the recommendation.

The realtime "free now / 1 user waiting" indicators are forward-looking — they presume the gym operator tier has equipment-usage tracking enabled. If unavailable, the indicators silently disappear without disrupting the layout.

##### Data and behavioural implications

Pre-flight runs at "Start workout" tap time. The app loads the routine's exercises, looks up each one's required equipment category, then checks `gym_equipment` for matching items at the current gym. Any missing categories trigger the warning surface.

Suggested swaps come from an `exercise_substitutions` table that maps each exercise to alternates within the same muscle group, ordered by similarity score (a simple heuristic: shared muscle groups + shared movement pattern + shared equipment category).

Equipment availability comes from `gym_equipment_status` if the gym has it (paid operator feature). The status is updated as users tap "start logging" on a specific equipment instance.

#### Screen 17 — QR scan to log

##### Role

The user is in front of a machine, opens the app's QR shortcut, scans the sticker. Within ~300ms they're on the smart logger with exercise + gym + equipment instance all pre-bound and last-session values pre-filled.

##### Layout — scanning

A near-black variant of the page background (`#04140F`) for camera viewing. The system row in mid-teal.

Header: X close icon, centred "Scan equipment" title, bolt icon right (toggles flashlight).

A camera viewport: 1:1 aspect ratio square, rounded 16px corners. Inside, the camera feed (rendered here as a stylised QR code illustration on a green-gradient backdrop). Four corner-bracket targeting marks in saturated `#1D9E75` overlay the viewfinder.

A "Reading…" toast appears at the bottom of the viewport when the camera detects a QR code, before validation completes.

Below the camera, when the JWT verifies successfully: a gym identification card in `#0E1F19`. A 36×36 building-icon tile, "verified gym sticker" label, gym name, a `ti-shield-check` icon on the right confirming validation.

A bottom info pill: "Hold steady. We'll open the right exercise with your last weights."

##### Layout — landed

The smart logger opens, with a small modification to the header.

A small green provenance tag in the header: `ti-qrcode` icon + "scanned · iron hub belgrade" in `#97C459`. This tells the user how they got here.

The hero card is identical to the standard smart logger: "Leg press · Hammer Strength · station 4 · last 180 × 10."

A "no active routine" pill on the SET 1 header indicates this is an ad-hoc log, not tied to a planned workout.

Stepped weight/reps input identical to screen 12.

Below the primary button, a "YOUR HISTORY ON THIS MACHINE" card shows the last 3 sessions specifically on this equipment instance. Each row: date + sets summary ("2 days ago · 180 × 10, 180 × 10, 170 × 8").

Two equal-weight footer buttons: "Add to workout" (plus icon) and "View exercise."

##### Rationale

The corner-bracket targeting overlay in the saturated accent green ties the scan moment to the brand. The "Reading…" toast is small but reduces user anxiety — they're not sure if anything is happening.

The shield-check icon on the gym card is the security model made visible. Counterfeit QR codes silently fail to validate and never reach the landing screen — the user just sees "QR not recognized" without alarm.

The "history on this machine" card is the QR-flow's killer feature. Because we bound `gym_equipment_instance_id` to each set, we can answer "what did I do on Hammer Strength station 4 specifically?" instantly. This is what a competent training partner would tell the user.

The "Add to workout" button covers the case where the user wants to add this exercise into an in-progress workout session (rather than logging it ad-hoc).

##### Data and behavioural implications

The QR sticker encodes a signed JWT with `gym_id`, `equipment_instance_id`, `exercise_id`, and an expiration timestamp. The JWT is signed by Pulse's server with a rotating key. On scan, the app verifies the signature locally using the cached JWKS from `/api/jwks` (rotated daily, cached for 7 days).

Verified scans open the logger with all foreign keys pre-bound. The session metadata includes `entry_source = qr_scan` for analytics, useful for measuring scan adoption.

Counterfeit or expired QRs fail silently — the camera viewport continues running, no error dialog. This prevents griefing (someone replaces a real sticker with a fake one) and keeps the scan flow seamless.

#### Screen 18 — Rest state, three views

##### Role

The rest timer rendered three ways: in-app full screen, iOS Live Activity on the lock screen, and Dynamic Island compact view. All three read the same data from the active workout store.

##### Layout — in-app rest

Header: chevron-down (collapse to the regular workout screen), breadcrumb showing exercise context.

Centred composition. A large progress ring at 220×220px, with "REST" label at the top, "1:24" at 56px weight 500 inside, and "of 2:00 target" below. The ring is `#5DCAA5` over an `#08402F` track.

Below the ring, a "UP NEXT" card showing the queued set: "Set 3 · Bench press" with chips "80 kg × 8 reps" and a "same as last" note.

Below the up-next card, an insight pill: `ti-bulb` icon + "2-min rest matches your historical avg between bench sets." This is anticipatory intelligence based on the user's own data.

At the bottom, two action buttons: a small "+30 s" extender on the left, and a wider "Skip · start set 3" accent button on the right (2:1 width ratio).

##### Layout — Live Activity (lock screen)

A near-black background (`#000000`) typical of iOS lock screen. The native iOS clock dominates ("9:43" at 88px ultra-thin) with a "Tuesday, 7 May" caption.

Below the system clock, a Pulse Live Activity card. `#0E1F19` background, 0.5px `#08402F` border. Inside:

- A 28×28 `#1D9E75` square with a barbell icon
- "PULSE · BENCH PRESS" small label and "Rest before set 3" title
- Below, a row with a 46×46 progress ring (showing 1:24), an "Up next · 80 kg × 8" caption, and a "Skip" button

The Skip button is interactive — iOS 17+ Live Activities support user-tappable buttons on the lock screen.

##### Layout — Dynamic Island compact

The Dynamic Island pill (28×28 progress ring + "1:24" + barbell icon) rendered in the system pill space at the top of the screen.

A long-press expands it to the lock-screen card layout. A small caption below the mock explains: "Glanceable, no app open. Long-press to expand."

##### Rationale

The 220×220px progress ring is large enough to read across a gym floor. The wall-clock-anchored timer means it stays accurate even if the app is backgrounded or the phone is locked mid-rest.

The "2-min rest matches your historical avg" insight is the Pulse copy principle — explain the why, not just the what. The user understands where the 2-minute target came from, which builds trust in future recommendations.

The Live Activity is the killer iOS-specific feature. Users with iPhone 14 Pro and later see the Dynamic Island constantly. A glanceable rest timer in the Island is a category-defining differentiator that Hevy doesn't ship. We use `expo-live-activity` to render it via a SwiftUI surface (the bridge supports interactive buttons in iOS 17+).

##### Data and behavioural implications

The rest timer's `started_at` timestamp is persisted to the workout session state in MMKV. The remaining time is computed as `target_seconds - (now - started_at)` rather than decremented in a JS interval. This means the timer survives app backgrounding, phone lock, and incoming phone calls — when the app returns, the timer reads the current state from wall-clock time and renders correctly.

The Live Activity is updated via `expo-live-activity`'s `update()` method. On iOS, the activity is created when the user taps "Log set" (starting the rest), updated every 5 seconds, and dismissed when the user taps "Start next set" or the timer expires.


### Batch 2 — Progress and analytics

Six screens covering the analytical surface of the app. The job here is *insight*, not statistics — every chart answers a specific question a lifter asks themselves, in plain language.

#### Screen 19 — Progress dashboard

##### Role

The progress tab landing surface. Surfaces the answer to "how am I doing right now?" as quick answers, not raw metrics. Top-line: am I trending up or down. Below: which lifts are moving and which are stuck. At the bottom: a muscle-group heatmap showing what I've trained recently versus what I'm neglecting.

##### Layout

Header: "Progress" at 22px, with a 3-months range pill and a share icon top-right.

Hero card with the headline. Background `#0F6E56`. A "TRENDING UP" trending-up-icon + label, then the big sentence at 26px weight 500: "You're 14% stronger this quarter." Subtitle in `#9FE1CB`: "Top 3 compound lifts averaged +12.4 kg vs. Feb. Consistency: 3.2 sessions/wk."

Below the hero, two stat tiles in a row: "total volume · 94.2k kg · +18% vs prev quarter" and "sessions · 41 · +6 vs prev quarter."

A "VOLUME OVER TIME" card. Header: section label and a "weekly" subtitle. Inside, a smooth line chart at 90px height with gridlines at 25, 50, 75% of the y-axis. Latest point ringed for emphasis. Date stamps below (Feb 12 · Mar 12 · Apr 9 · May 7).

A "LIFTS TRENDING UP" section. Three rows, each: 32×32 trending-up tile (green) + exercise name + "100 → 125 kg · 3 months" subtitle + "+25%" delta right-aligned in `#97C459`.

A "STUCK FOR 4+ WEEKS" section. Two rows in the coral palette: 32×32 trending-down tile + exercise name + "50 kg · last PR Apr 12" subtitle + chevron-right.

A "MUSCLE COVERAGE · LAST 14 DAYS" card. Inside, a small anatomical SVG figure on the left coloured by muscle group, and a legend on the right with four tiers:

- High (saturated green): Shoulders, Back
- Good (mid-teal): Chest
- Light (`#0F6E56`, with amber status): Legs, Glutes
- Missing (`#08402F`, with coral status): Arms, Core

Bottom tab bar with Progress active.

##### Rationale

The dashboard leads with a *headline* — "You're 14% stronger this quarter" — written like a sportscaster's read of the last three months. This is the Pulse copy principle in action and the strongest emotional moment in the entire analytics surface. The supporting numbers explain the headline in plain English.

The two stat tiles below provide the proof. Delta percentages in muted green tell the user "this is the right direction." The volume sparkline is deliberately sparse — one trend line, soft fill, gridlines for context. The eye reads "the line goes up" in 0.2 seconds.

"Lifts trending up" and "Stuck for 4+ weeks" are the *actionable* parts. Stuck lifts use the coral palette to mark them as concerns. Tapping a stuck lift opens the exercise progress chart (screen 21), where the user can diagnose what's happening.

The muscle coverage heatmap is the Hevy-killing differentiator. A simplified anatomy figure with four colour tiers gives the user a 30-second intervention into their training program — "you've neglected legs and arms this fortnight, fix it" — and no other major fitness app does this well.

##### Data and behavioural implications

The "14% stronger" computation: estimated 1RM averaged across the user's top 3 most-trained compound lifts (`squat`, `bench`, `deadlift` if present, else next most-frequent), compared between the start and end of the date range. Threshold for the "trending up" framing: ≥5% improvement.

The volume sparkline aggregates `workout_sets.weight * reps` grouped by week. Data is materialised in a `weekly_volume` view refreshed nightly server-side and cached locally per user.

Lifts trending up: any exercise whose estimated 1RM in the last 30 days exceeds its est. 1RM at the start of the range by ≥5%. Sorted by absolute delta.

Stuck lifts: any exercise with no PR in the last 28 days AND with at least one session in that window. Sorted by recency-of-last-PR ascending (most-recently-stuck first).

The muscle coverage heatmap aggregates `workout_sets` by `exercise.primary_muscle` over the last 14 days, summing sets per muscle group, then bucketing into the four tiers based on the user's historical baseline (high = top quartile of their normal weekly volume, missing = zero sets logged).

#### Screen 20 — History feed

##### Role

The user taps "history" or scrolls past today's training. The journal view — every workout in reverse chronological order, with enough glanceable info per session that the user remembers what they did without tapping in.

##### Layout

Header: "History" at 22px, with calendar and filter icons right.

A three-tile stat strip: this month sessions count, average duration, PRs set.

A "THIS WEEK" label, then the most recent session as a hero card. `#0F6E56` background, 1.5px `#5DCAA5` border. Inside:

- Row 1: routine name + PR badge (if applicable) + date "Today, 9:41 AM"
- Row 2: gym name + duration ("Iron Hub Belgrade · 52 min")
- Row 3: exercise chips — flexbox-wrapping chips like "Squat 100×8", "Bench 80×8", "RDL 95×10", "Pull-up BW×12", "+1" for overflow
- Row 4 (separated by hairline): three stat columns — volume, sets, avg RPE

Below the hero, every other session uses a muted `#0E1F19` card with the same internal structure but no green styling.

Cards that include a user note display it inline as a `#08402F` quoted strip: "Felt fresh, bench went up easy."

After "THIS WEEK" comes "LAST WEEK" and so on.

##### Rationale

The most recent workout gets the hero treatment because that's what the user wants to verify. The PR badge top-right is the celebratory marker. Each card's "+N more" exercise chip summarizes overflow so the user gets the gist without scrolling each card.

Notes are surface-rendered in history feed (not buried behind a tap) because notes are the feature that turns history into a journal. Users genuinely write things like "left knee felt off" or "tried wider grip" and want to find those notes later.

##### Data and behavioural implications

The hero session is the most recent `workout_session`. The exercise chips show distinct exercises with their top set. Computing "top set" per exercise involves picking the heaviest weight × reps combination, prioritising weight for compound exercises and total reps for isolation exercises (encoded in `exercise.primary_metric`).

#### Screen 21 — Exercise progress chart

##### Role

The single-exercise deep dive. The page a serious lifter visits regularly. Multiple metric toggles, range selector, every set logged as a dot you can scrub.

##### Layout

Header: chevron-left, "Barbell back squat" title with metadata subtitle "Quadriceps · barbell · compound." Dots-vertical menu right.

Hero card with "ALL-TIME BESTS" label. Background `#0F6E56`. Three stat tiles: est. 1RM (125 kg, May 7), max weight (110 × 3, Apr 30), max reps (100 × 10, Mar 14). Each tile shows the achievement date in `#5DCAA5`.

A metric tab row: Est. 1RM (active green pill), Top set, Volume, RPE.

A chart card. Inside:

- Headline row: "latest est. 1RM · 125 kg" on the left, "+25% vs. start" delta on the right
- Chart at 140px height: gridlines (4 levels), smooth line, soft fill, all data points as dots (latest ringed, PR sessions amber)
- Date axis labels (Feb · Mar · Apr · May)
- Range selector pills below the chart: 3M, 6M (active), 1Y, All

Below the chart, an insight card with bulb icon: "You're adding ~3 kg of est. 1RM per month. At this pace you'll hit 135 kg in ~3 weeks."

A "RECENT SESSIONS" section. Each row:

- Date + PR badge (if applicable)
- Right: estimated 1RM for that session
- Below: the per-set chips ("100×8 @7", "100×8 @7", "100×8 @8", "100×7 @9") with RPE annotations

##### Rationale

The all-time-bests trio is what serious lifters check first — "did I beat any of my three numbers today?" Showing 1RM, max weight, and max reps separately because each is a meaningful achievement type.

The four metric toggles let the user reframe the chart. The default (estimated 1RM) is right because it unifies weight and reps into a single comparable number across all set styles. A 100×8 and an 80×12 both have an estimated 1RM around 125 kg.

PR sessions are amber-dotted on the chart so the user can visually scan their history and spot the breakthrough moments.

The insight pill below the chart is the differentiating feature — derived projection in plain language, anchored in the user's actual data: "You're adding ~3 kg per month. At this pace you'll hit 135 kg in ~3 weeks." This is the moment the app proves it's worth premium.

##### Data and behavioural implications

The four metric calculations:

- Est. 1RM: `weight × (1 + reps / 30)` per set, taking the max per session
- Top set: the set with the highest weight × reps product per session
- Volume: `SUM(weight × reps)` for the exercise across all sets per session
- Avg RPE: average of `rpe_inferred` (computed from `subjective_effort` + warmup/failure flags) per session

The projection ("you'll hit 135 kg in ~3 weeks") is a linear regression over the last 8 sessions' estimated 1RMs. If R² < 0.5 (noisy data), the projection is suppressed because we don't want to make false promises.

#### Screen 22 — Body measurements

##### Role

The user logs weight, body composition, and circumference measurements here. Pulse takes the regulatory positioning seriously — every body-comp number carries the "not a medical assessment" disclaimer.

##### Layout

Header: chevron-left + "Body" title + small "+ add" accent button right.

Hero card "CURRENT BODY WEIGHT" — `#0F6E56` background. Big "82.4 kg" at 36px on the left, "+1.8 kg / 90 days" muted-green delta right. A 60px-tall sparkline below.

Three metric tabs: Weight (active), Body fat, Measurements.

"BODY COMPOSITION" section with two stat tiles: body fat (15.2%, −1.4% in 90d) and lean mass (69.9 kg, +2.4 kg in 90d).

A mandatory disclaimer card: 0.5px `#08402F` border, info-circle icon + 10px caption: "For personal fitness tracking only. Not a medical assessment. Consult a healthcare professional for medical guidance."

"CIRCUMFERENCE" section with a flat list: chest, arm (flexed), waist, thigh. Each row shows the latest value, delta over 90 days, and date last logged. Stale measurements get a slightly muted color to nudge re-measurement.

"PROGRESS PHOTOS" section with a 4-tile row: latest selected (camera icon, "today"), then three historical thumbnails. A "Compare photos" button below opens a side-by-side comparison.

##### Rationale

Body weight gets the hero treatment because it's the daily-logged metric. The +1.8 kg in 90 days is rendered in muted green because the *trend* matters, not the absolute number — the user could be in a strength phase (gaining intentionally) or cutting (losing intentionally).

The disclaimer card is **mandatory** and shown wherever body composition appears. This is the regulatory pattern from the fitness-domain-expert agent: every body-comp surface gets the disclaimer to defend against an App Review "is this a medical app?" challenge.

Progress photos are sensitive — stored in Supabase Storage with the user's per-user prefix path. The "Compare photos" CTA opens a milestone comparison view.

##### Data and behavioural implications

Body composition entries are user-input rows in `body_measurements` with `recorded_at`, `weight_kg`, `body_fat_percent`, `lean_mass_kg`, and per-site circumference values. Progress photos are stored in Supabase Storage at `users/{user_id}/body_photos/{photo_id}.jpg` with row references in `body_photos`.

The 90-day delta calculation finds the closest measurement to "exactly 90 days ago" and computes the difference. Stale measurements (last logged >7 days for body comp, >14 days for circumference) get a soft visual nudge.

#### Screen 23 — Personal records

##### Role

Every PR the user has ever set, organised by exercise, sorted by recency. The user taps "View all" from home's milestones or the trophy icon from anywhere.

##### Layout

Header: chevron-left, "Personal records" title, share icon right.

Hero card "LIFETIME TOTAL" in the amber palette. `#633806` background, large trophy icon tile + "47 records" at 22px. Three nested tiles: this month (4), this quarter (11), best month (7).

A "RECENT" section listing the last several PRs. Each row: 32×32 amber trophy tile, exercise name + PR type ("Barbell back squat · 1RM"), achievement date + value, delta ("+3 kg") in muted green.

A "BIG 3 LIFETIME" section header with "total 350 kg" subtitle. Inside a card: three rows, one each for Squat, Bench, Deadlift, showing the lifetime est. 1RM.

A "All records by exercise" button at the bottom navigates to the per-exercise PR archive.

##### Rationale

The PR screen leans into the amber palette deliberately — these are the celebratory moments. The lifetime-total card shows 47 records with subtimings — this-month, this-quarter, best-month. The "best month" stat is small but motivating — it tells the user what they're capable of when they're really dialed in.

Each PR row shows the delta ("+3 kg") because that's how much they improved, more meaningful than just the new record.

The Big 3 lifetime card aggregates squat/bench/deadlift into a powerlifting total — the canonical metric for strength athletes. "Total 350 kg" gives the user a number to mentally bench-compare against goals.

##### Data and behavioural implications

The `personal_records` table is populated by a server-side trigger on `workout_sets` insert. The trigger evaluates each new set against existing PRs for the user × exercise × equipment and inserts a new PR row if a record is broken.

The three PR types tracked per exercise: estimated 1RM, max weight for any reps, max reps at any weight. Each gets its own row in `personal_records` with a `record_type` enum.

#### Screen 24 — Calendar and streak

##### Role

The time view of training. Streak counter, monthly heatmap, selected-day card, weekly cadence chart.

##### Layout

Header: chevron-left, "Calendar" title, list icon right (switch to history feed view).

Hero card "CURRENT STREAK" in `#0F6E56`. A 56×56 amber-flame tile + "12 days" at 30px. "best 18" right-aligned in `#E1F5EE`.

A calendar card. Month navigation (chevron-left / "May 2026" / chevron-right) + sessions count right ("11 sessions").

The calendar grid: 7 columns, day-of-week header (M T W T F S S), then date cells in a 6-row grid. Each cell aspect-ratio 1, rounded 6px:

- Moderate session: `#0F6E56` background, `#E1F5EE` text
- Heavy session: `#1D9E75` background, `#04342C` text
- PR day: `#FAC775` (amber) background, `#412402` text, 1.5px white border
- No session: `#0E1F19` background, `#5DCAA5` text

Legend below the grid: three colour swatches with labels.

A selected-day card in `#0F6E56` showing the chosen date's session with a 40×40 amber trophy tile + date title + session subtitle. Three nested tiles: volume, duration, PRs.

A "CADENCE · LAST 4 WEEKS" section with a 4-bar mini chart showing weekly session counts.

##### Rationale

The streak counts training days, not consecutive days. If the user trains Monday/Wednesday/Friday, the streak ticks up each training day rather than breaking on rest days. This matches how lifters actually think about consistency.

The calendar's three-tier color coding (moderate / heavy / PR-day) is calibrated to the user's recent average — "heavy" means heavy *for you*, not in absolute terms.

The cadence chart at the bottom shows the last 4 weeks of session counts as a small bar chart. The user can see at a glance if this week's pace is on track or behind. Soft motivator, not a guilt-trip.

##### Data and behavioural implications

The streak query: starting from today, walk backward day-by-day and count consecutive *training* days (sessions present). Stop at the first gap. Best streak is the historical maximum from the same calculation.

Calendar tiering: per-day total volume bucketed against the user's 30-day rolling average. Heavy = > average + 1 std dev. Moderate = within ±1 std dev. Light = < average - 1 std dev. PR day = any day with a `personal_record` row.


### Batch 3 — Power features

Five screens covering the systems that make the app feel premium and trustworthy — subscriptions, notifications, settings, offline downloads, and integrations.

#### Screen 25 — Paywall

##### Role

The moment a user hits a premium feature. Free up to a meaningful threshold (logging, history, basic routines, one gym); premium for advanced analytics, video coaching, multiple gyms, offline downloads, trainer features. The paywall has to be honest about what's free, generous with the trial, and clear about value.

##### Layout

A near-modal layout. Top row: X close, centred "Pulse Premium" label, restore icon right.

A 64×64 `#0F6E56` icon tile with an amber bolt glyph. Below, "Train without limits." headline at 26px. Subtitle: "Free covers the essentials. Premium unlocks everything else."

A five-row benefits list in `#0E1F19`, each row with a single mid-teal icon + title + subtitle:

- chart-line · Advanced analytics · Stuck-lift detection, projections, muscle coverage
- download · Offline downloads · Pre-cache videos and routines for any gym
- building · Multiple gyms · Per-machine history at home, travel, work
- users · Hire a trainer · Programs, feedback, message your coach
- photo · Progress photos · Side-by-side compare, unlimited storage

Three tier cards stacked. The Annual card is the recommended option: `#0F6E56` background with 1.5px `#5DCAA5` border, an amber "SAVE 38%" badge top-right. Inside: a green-check icon + "Annual" + "7-day free trial, then €59.99/year." Price: "€4.99 per month."

Monthly card: muted styling. Inside: empty-circle icon + "Monthly" + "7-day free trial, then €7.99/mo." Price: "€7.99 per month."

Lifetime card: muted styling with an amber trophy icon. "Lifetime" + "Pay once, train forever." Price: "€149 one-time."

Primary "Start 7-day free trial" button.

Below the CTA, mandatory App Store fine print: "Free trial, then €59.99/year. Cancel anytime in Settings. Your subscription auto-renews unless turned off."

Footer row: Privacy · Terms · Restore links.

##### Rationale

A premium paywall earns its place. The headline followed by an honest framing — "Free covers the essentials. Premium unlocks everything else" — sets the right relationship. Each of the five benefits has a specific concrete promise tied to features we've built, not generic marketing.

Three tiers because lifetime is high-margin and reduces churn anxiety for committed users; monthly is for the cautious; annual converts at the highest rate. The 7-day free trial is required for Apple App Store and aligns with the conversion data from the deep stack research (5-9 day trials convert ~37% to paid versus ~25% for shorter trials).

The annual card's accent treatment + amber badge is the strongest visual nudge. Users default to scanning the recommended-row first. The auto-renewal disclosure is mandatory App Store fine print but kept brief.

##### Data and behavioural implications

Subscriptions are managed by RevenueCat from day one (~1% MTR fee after $2.5K). Entitlements are mirrored server-side via RevenueCat webhooks to a `user_subscriptions` table for fast access without API calls.

The three product IDs (`pulse_annual`, `pulse_monthly`, `pulse_lifetime`) are configured in App Store Connect and Google Play Console. RevenueCat handles the platform-specific receipt validation.

When the user starts a trial, a `subscription_status = trialing` row is written immediately on local SQLite. The premium features check this status locally — no network call required to gate features.

#### Screen 26 — Notifications inbox

##### Role

Push notifications, in-app messages, trainer messages, and PR/streak achievements all surface here. Grouped by category so it's not a flat firehose.

##### Layout

Header: chevron-left + "Inbox" title + "Mark all read" button right.

A category filter row: All (active, with a "5" unread count badge) · Trainer · Wins · System.

A "TODAY" section. The PR notification gets the hero treatment: `#0F6E56` background with 1.5px `#5DCAA5` border. Inside:

- 36×36 amber trophy tile + category label "NEW PR" + time
- Title: "125 kg squat — your best ever"
- Body: "+3 kg estimated 1RM in just 12 days. Share or save the moment."
- Inline actions: "View progress" (muted) and "Share" (accent)
- An 8px green unread dot top-right

A trainer message notification: muted `#0E1F19` card with the trainer's initials avatar tile, "TRAINER" category, time, message preview.

A "YESTERDAY" section with a streak notification (anticipatory tone: "12 days strong. 6 to beat your record.") and a reminder notification (muted, read).

A "THIS WEEK" section with a gym update notification (muted) about new equipment.

##### Rationale

Categories at the top let the user filter to the noise level they want. Counts on tabs (the "5" badge) show what's unread.

The PR notification gets the hero card treatment because it's a celebratory moment. Inline actions ("View progress" + "Share") let the user act without leaving the inbox.

Streak notifications are anticipatory ("6 to beat your record") rather than guilt-trippy. Read notifications fade to 75% opacity so unread items dominate visually.

##### Data and behavioural implications

Notifications come from multiple sources: push (Expo Notifications), in-app messages (Supabase Realtime), and derived events (PRs detected by server triggers, streak milestones computed nightly).

All notification records live in a `notifications` table with `kind`, `actor_id` (the trainer / gym / system), `subject_id` (the PR or session being referenced), `payload` JSONB, and `read_at` timestamp.

Inline actions on notifications resolve via deep links into the relevant screen, with the action context pre-loaded.

#### Screen 27 — Settings and profile

##### Role

The profile tab. Everything the user can configure, organised by concept (account, training preferences, devices, support, privacy). The hero is the user's identity block.

##### Layout

Header: "Profile" at 22px + settings icon right.

Identity hero card in `#0F6E56`. A 56×56 avatar with initials + user name + email. Two badges below: a muted "LIFTER" badge and (if premium) an amber "PREMIUM" badge. Three stat tiles at the bottom: streak (12d), workouts (128), PRs (47).

Five sections, each with multiple rows:

**ACCOUNT**: My gyms (3 saved), Premium subscription (Annual), Sign-in & security
**TRAINING**: Units (kg · cm), Default rest timer (2 min), Haptics (with a toggle)
**INTEGRATIONS**: Apple Health (Connected), Apple Watch (Connected), Health Connect (Not connected)
**DATA & PRIVACY**: Export my data, Privacy controls, Delete my account (rendered in coral)
**SUPPORT**: Help center, Contact support

Footer: "Pulse v1.0.0 (542) · iOS 18.2" debug info.

Bottom tab bar with Profile active.

##### Rationale

The identity card tells the user three things they care about: who they are, what kind of user, and what they've achieved. The whole card is tappable to open account detail.

The haptics toggle is a real toggle (not a chevron) because it's a binary the user flips often. The integration rows show platform-branded icons (Apple Health in pink-red, Apple Watch in light grey, Health Connect in Android green).

The "Delete my account" row is rendered in coral so it stands apart from regular actions, but it's still in the same list — it's a normal user right under GDPR, not an emergency.

##### Data and behavioural implications

Account settings are stored in `user_preferences` with sensible defaults. Local SQLite is the source of truth; the server is a sync mirror.

Data export generates a JSON archive of the user's data (workouts, body measurements, custom exercises, routines, preferences) via a background worker. The user receives an email with a signed download link valid for 24 hours.

Account deletion is a hard delete after a 30-day grace period. Email confirmation required. Compliance with GDPR Article 17.

#### Screen 28 — Offline routine download

##### Role

Premium feature. The user pre-caches routines (videos, exercise instructions, reference images) to disk for unreliable-signal training environments.

##### Layout

Header (system row shows wifi-off icon for emphasis): chevron-left + "Offline downloads" + settings icon right.

Storage hero card in `#0F6E56`. A download icon tile + "USED OF 2 GB" label + "428 MB" at 22px. Right side: routines count (3). A 6px progress bar showing 21% used. Caption: "21% used — 1.57 GB available."

A "DOWNLOADED" section. Two completed routines: green check + routine name + size info ("5 exercises · 5 videos · 142 MB") + dots-menu. Each card shows exercise chips and two action buttons ("Start workout" accent green + "Remove" muted).

A third routine actively downloading: a small progress ring instead of a check, "Downloading 3 of 6 videos · 158 MB" subtitle, "Pause" button right, and a thin progress bar at the bottom of the card.

A "SUGGESTED FOR YOU" section with two cards: "This week's full program" and "Travel pack" — each with a "Pin" or "Pin all" button.

An auto-cleanup card at the bottom: info icon + "Auto-cleanup" + description + toggle. "Remove unused routines after 30 days. Pinned routines are never removed."

##### Rationale

The wifi-off in the status bar sells the offline use case immediately. The storage cap (2GB default) maps to the eviction policy we encoded in the agent files.

"Suggested for you" is anticipatory — the app proposes pinning the week's program or a Travel pack based on calendar integration hints. The auto-cleanup toggle gives the user control without being threatening.

##### Data and behavioural implications

Routine downloads pre-fetch Mux video files via `expo-video-cache` to the iOS Cache directory, with cache keys based on routine + video version. The cache supports HLS streaming offline. Total cache size is checked before download; the user is prompted if free space is insufficient.

The 2GB cap is per-app-storage-allowance, not per-user. Auto-cleanup runs nightly on cold launch and removes the least-recently-played non-pinned routines until the cache is under 80% of the cap.

#### Screen 29 — Apple Health integration detail

##### Role

The user taps "Apple Health" from settings. This screen shows the granular per-data-type permissions, what data flows in vs. out, and the deduplication explanation.

##### Layout

Header: chevron-left + "Apple Health" + dots-vertical menu.

Connection hero in `#0F6E56`. A 48×48 Apple Health icon tile + "Apple Health" + "Last synced 14 minutes ago." A circle-check icon right. Three nested tiles: imported (12 workouts), exported (128 workouts), duplicates skipped (9).

A "PERMISSIONS" section listing each data type. Each row has the data icon, name, what-it-does subtitle, and read/write pills on the right:

- Workouts: read + write (active)
- Body weight: read + write (active)
- Body composition: read (active), write muted (we don't write body comp to Apple Health by design)
- Heart rate: muted entry, "Phase 2 — coming soon" subtitle

A "How duplicates are handled" disclosure card: "If your Apple Watch logged a strength workout, we recognize it as the same session and don't import it twice. You'll see one entry, not two. Dedup uses workout type, start time, and duration."

A "SYNC PREFERENCES" section: Background sync (every 6 hours on wifi, toggle on), Ask before importing (toggle off).

Two action buttons: "Sync now" muted, "Disconnect Apple Health" in coral.

##### Rationale

The hero card's three stats prove dedup is working without making the user audit anything. Per-data-type pills are scoped, not blanket — this is the App Review-mandated pattern for HealthKit in 2026.

We deliberately do not write body composition to Apple Health because the user's source-of-truth there is usually a smart scale, and we don't want to pollute it.

The dedup explanation is what App Reviewers read to confirm we're not creating duplicate health entries. The matching key is `workout_type + start_time + duration` with a tolerance.

The disconnect button in coral is the GDPR Article 7 user right — disconnect anytime.

##### Data and behavioural implications

HealthKit integration uses the `expo-health` library (or a custom native module if features are needed beyond expo's surface). Permission requests are per-data-type rather than blanket-all, which matches Apple's preferred pattern.

Dedup logic: on each Watch-logged workout import, we check for an existing local workout with `workout_type = strength` and `start_time` within ±60 seconds and `duration` within ±20%. If found, skip the import and increment the `duplicates_skipped` counter.


### Batch 4 — Multi-tenant surfaces

Six screens for the trainer and gym operator user types. Same backend, same design language, role-specific information density and metric sets.

#### Screen 30 — Trainer dashboard

##### Role

When a personal trainer signs in, the home tab is replaced with this. The trainer's mental model is "who do I need to think about right now?" — not "what should I train?"

##### Layout

Header: date "Tuesday, May 7" + "Good morning, Ana" greeting + avatar with an unread-message badge ("3").

Hero card "ACTIVE ROSTER" in `#0F6E56`. A users-icon label + "14 clients" at 30px. Three nested tiles: active today (9), need attention (3 in amber palette), PRs this week (5).

A "NEEDS ATTENTION" section. Three rows in coral palette tiers (most severe first):

- Marija K. (most severe, coral) — "Missed 2 sessions · last seen 6 days ago"
- Dejan P. (medium, amber) — "Stuck on bench 4 weeks · last RPE 9"
- Jelena N. (light, teal) — "Check-in due today · cycle week 4"

A "RECENT WINS" section. Two rows. The most recent PR is featured with a "Cheer" accent button — one-tap sends a pre-composed celebratory message to the client. Subsequent wins have muted cheer buttons.

Primary accent button at the bottom: "Invite a new client" with plus icon.

Trainer-specific bottom tab bar: Home, Clients, Programs, Messages, Profile.

##### Rationale

The trainer has a **different bottom tab bar** — Workout becomes Clients, Library becomes Programs. They're managing other people's training, not their own.

"Need attention" uses the coral palette — actionable column. The trainer's eye is drawn here first. Each client row uses progressive coral intensity matching urgency.

"Cheer" is the one-tap celebration pattern. Sends a pre-composed congratulatory message via the in-app messaging surface, removing the friction of typing.

##### Data and behavioural implications

Trainer-client relationship is via Clerk Organizations: the trainer is the org owner, clients are org members. PowerSync's `trainer_clients` sync stream filters by Clerk org membership.

Attention detection runs nightly:
- Missed sessions: any client with no `workout_session` in the last 5 days
- Stuck lifts: any client with a stuck-lift flag in their progress dashboard
- Check-ins: scheduled per the client's program cycle config

"Recent wins" subscribes to `personal_records` filtered by clients-of-this-trainer, ordered by `created_at` descending.

#### Screen 31 — Client list

##### Role

The trainer taps "Clients." Full roster with sort/filter, search, and at-a-glance status per client.

##### Layout

Header: "Clients" title + filter and user-plus icons right.

Search bar.

A horizontal filter chip row: All 14 (active) · Attention 3 (coral pill) · Active today 9 · Paused 2.

The list is grouped by status:

**ACTIVE TODAY** — currently-training and just-finished clients. Currently-training clients get the hero card treatment (green background, "Training now · push day · 28 min in" subtitle, PR badge if applicable, and a "Squat 125 kg ✓" exercise chip showing live progress). Just-finished clients are muted cards with their summary.

**NEEDS ATTENTION** — coral-themed rows with quick-action buttons ("Message" / "Open") inline.

**RECENT** — muted cards showing the last few sessions.

##### Rationale

The currently-training card is the trainer's superpower — live training visible in real-time. The "Training now" subtitle + green presence dot signals this is realtime data.

Quick-action buttons let the trainer act without drilling in. "Message" opens the chat; "Open" goes to client detail.

##### Data and behavioural implications

The "currently training" status comes from the workout_sessions table's `started_at` without an `ended_at`, scoped to clients of this trainer via the trainer_clients sync stream.

Live training updates use Supabase Realtime subscriptions — when a client logs a set, the trainer's roster updates within seconds without polling.

#### Screen 32 — Client detail

##### Role

The trainer's view of one client. Client profile, current program, message thread, shortcuts for the actions trainers actually do — adjust the program, send a note, mark a check-in done.

##### Layout

Header: chevron-left + "Client" centred + dots-vertical menu.

Identity hero in `#0F6E56`. A 56×56 avatar tile with the live "training now" green dot if applicable. Name + gym + "since Feb 12." If training: "Currently training · push day" in amber.

Three nested tiles: consistency (94%), streak (12d), PRs this month (4 — amber styling).

Two primary action buttons: "Message" (accent green) + "Adjust program" (muted).

Inner tabs: Overview (active) · Program · Progress · Notes.

A "CURRENT PROGRAM" card: calendar icon + "Hypertrophy block 2" + "Week 3 of 6 · 4 days/wk." A horizontal progress bar showing 50% complete. Date range below ("started Apr 23 · finishes Jun 4").

A "RECENT SESSIONS" section showing the client's sessions with PR badges, RPE indicators, and inline notes (quoted in `#08402F`).

A "Trainer insight" card at the bottom: bulb icon + "Marko's squat est. 1RM is up 14% this block. Bench progress is flat. Consider deload on lower or volume bump on upper next week."

##### Rationale

The hero card extends the lifter's identity card with trainer-relevant stats. The amber PR tile uses the celebratory palette — wins are celebrated on both sides.

The two primary actions ("Message" + "Adjust program") are the two things trainers actually do. Everything else lives in the inner tabs.

The "Trainer insight" is the AI-derived programming recommendation surfaced specifically to the trainer. Same data source as the lifter's projection insight, framed for the role.

##### Data and behavioural implications

Trainer-to-client messaging is stored in `messages` with `thread_id` + `sender_id` + `recipient_id`. Messages sync via PowerSync and surface as notifications on both ends.

The "Adjust program" action opens the routine builder in trainer-edit mode, with the client's active program pre-loaded. Changes are versioned — the client sees the new program on next sync.

"Trainer insight" runs a heuristic over the client's last 6 weeks of training: if any compound lift's est. 1RM is up >10% AND another is flat or declining, generate the recommendation. Suppressed if data is too sparse.

#### Screen 33 — Gym operator dashboard

##### Role

When a gym operator signs in, this is home. Three layers: members (who's active, who's churning), equipment (utilization heatmap, broken-machine reports), revenue.

##### Layout

Header: gym name "Iron Hub Belgrade" subtitle + "Dashboard" title + building icon tile right.

Two stat tiles in a row: members (428, +12 this month), here now (47, peak today 62).

A "FLOOR ACTIVITY · TODAY" hero card in `#0F6E56`. Inside: a 12-bar histogram showing the day's check-in distribution by hour. Current hour highlighted with `#E1F5EE` border. Past hours coloured by intensity (saturated green = peak, amber for current peak hour). Future hours muted. Time-axis labels (6am · 9 · now · 3pm · 6 · 9).

An "EQUIPMENT STATUS" section listing three semantic tiers:

- Operational (green check) — 125 items
- Needs maintenance (amber tool) — 2 items, "Cable 3 reported sticky · 2 reports"
- Out of service (coral alert) — 1 item, "Smith machine 2 · since 4 days"

A "MEMBERSHIP" card with three stat tiles: new this month (12), retention (91%), churning (8 in coral palette). Below the tiles, a privacy disclaimer: "All member data anonymized in aggregate. Individual identities not visible."

A "PENDING" section: equipment reports queue (3 pending) and "Print equipment stickers" (12 new items need QR codes).

Gym-operator bottom tab bar: Dashboard · Equipment · Members · Insights · Settings.

##### Rationale

The operator's bottom tab bar is **completely different** — no workout, no library. They're managing a facility, not training.

The floor activity histogram is the operator's killer feature — see when peak hours are, staff accordingly. Out-of-service items include duration ("since 4 days") because that's the maintenance KPI.

The privacy disclaimer under membership is **mandatory** — operators see counts, not identities. Aggregate exposure permitted, individual exposure prohibited unless the user explicitly opted into being trained by a gym-employed trainer (separate consent).

##### Data and behavioural implications

Floor activity is aggregated from `workout_sessions.started_at` grouped by hour, scoped to sessions at this gym. Anonymous — no user IDs surfaced.

Membership churn detection: any user with `last_session_at` > 14 days but with an active membership status. Flagged for operator outreach via integrated communication tools.

Equipment status comes from `gym_equipment` + `equipment_reports`. The operator can move equipment between status tiers; users see the changes reflected in the routine pre-flight.

#### Screen 34 — Gym leaderboard

##### Role

Premium gym feature. When a gym enables it, members can opt into a non-identifying leaderboard. They appear under a chosen display name and their PRs and volume are ranked against other opted-in members.

##### Layout

Header: chevron-left + "Leaderboard" title + "Iron Hub Belgrade · May" subtitle + info icon right.

Category chips: Volume (active) · Squat · Bench · Deadlift · Streak.

A podium hero card in `#0F6E56`. "TOP 3 · TOTAL VOLUME THIS MONTH" label. Below, three avatars rendered as a podium: rank 2 (silver-grey) on the left, rank 1 (amber) centred and larger, rank 3 (coral-bronze) on the right. Each avatar shows a circular rank-badge.

A "RANKED 4 – 10" section with a flat list. Each row: rank number + 34×34 avatar + display name + volume in `#9FE1CB`. The user's own row is highlighted: full row rendered in `#1D9E75` accent, with "You · Marko Š." prefix and a "↑ moved 2 spots this week" sub-line.

A privacy disclaimer card: shield-lock icon + "Opt-in only" + body text: "Members appear only if they choose to participate. You can change your display name or leave the leaderboard anytime in Profile."

##### Rationale

The podium uses gold/silver/bronze color semantics. #1 spot is visually larger so the eye lands on it first.

The user's own row is rendered in the saturated green — the user finds themselves instantly. The "moved 2 spots" subtitle turns rank into a progression metric, not just a static position.

The privacy disclaimer is mandatory — opt-in by default, leave anytime, display name controlled by the user. This is GDPR Article 6 compliance — no profiling without consent.

##### Data and behavioural implications

Leaderboard participation is opt-in per gym. A `leaderboard_participants` table holds (gym_id, user_id, display_name, opted_in_at).

Aggregations run nightly server-side: monthly volume, lift-specific PRs, streak length, all per opted-in user, ordered by metric. The user's own rank is computed from their position in the sorted list.

The leaderboard is a **shareable** entity in our `visibility` schema — gym-scoped (`visibility = 'gym'`) with `is_shareable = true`. Outside the gym context, it's invisible.

#### Screen 35 — Share or PR moment

##### Role

The "Share" button from PR notifications and from workout completion opens this modal. The user creates a celebration card to share to Instagram, Strava, or save to camera roll.

##### Layout

Header: X close + "Share your PR" centred title + edit icon right (customize text).

A 4:5 aspect ratio preview card (Instagram/TikTok portrait dimensions). Inside the card:

- A subtle dot-pattern background at low opacity
- Pulse wordmark top-left
- Centred content: a 72×72 amber trophy tile + "NEW PERSONAL RECORD" label + "125 kg squat" headline at 28px + "+3 kg in 12 days" subtitle
- Three nested stat tiles inside the card: est. 1RM (125 kg), workouts (128), streak (12d)
- Footer attribution: "Marko Š. · Iron Hub Belgrade · May 7"

A "CARD STYLE" selector row: five swatch options (current dark, light teal, amber, white, near-black). Selected style has 1.5px teal border.

A "SHARE TO" 4-tile grid: Instagram, Strava, Messages, Save (each with platform-adjacent icon and color treatment).

An "Include in share" panel with three toggleable checkboxes:

- PR weight and exercise (default on)
- Workout count and streak (default on)
- Your gym name (default off — opt-in for privacy)

##### Rationale

The 4:5 portrait card is Instagram and TikTok's preferred aspect ratio. Five style swatches let users match their personal aesthetic.

The "Include in share" panel is the privacy control. Every shareable artifact has user-controlled granularity, matching the visibility seam we baked into the schema. Gym name is opt-in because some users don't want to advertise where they train.

##### Data and behavioural implications

The share card is rendered as a high-DPI image via Skia (`@shopify/react-native-skia`) at the moment of share. The render runs locally and produces a PNG ready for the platform share sheet.

Each share generates a `share_event` row with `subject_type` ("personal_record" / "workout_summary" / "streak_milestone"), `subject_id`, `platform`, `included_fields` (which checkboxes were on). Used for analytics on which share types resonate.

The user's display name on the card uses the abbreviated form ("Marko Š.") rather than full name unless the user has opted into full-name display.


---

## Data model implications

The screens together imply a coherent data model. Capturing it explicitly here so engineering has a single reference. Tables are described in their functional groupings; not every column is listed, only those that matter for the UX.

### Identity and tenancy

`users` — the core user record. Linked 1:1 to a Clerk user via `clerk_user_id`. Holds `user_type` (lifter / trainer / gym_operator), `display_name`, `email`, `current_gym_id`, and a `user_preferences` JSONB blob.

`gyms` — facilities. Holds `name`, `slug`, `coordinates`, `address`, `operator_user_id`, plus an `is_active` flag. Created at QR-sticker generation time by the operator.

`user_gyms` — many-to-many. Each row records when a user first visited a gym and their visit count.

`trainer_clients` — many-to-many between trainer and lifter users. Enforced via Clerk Organizations (trainer is org owner, clients are org members).

### Catalog (read-only public data)

`exercises` — the public exercise catalog from ExerciseDB. ~5000 exercises with `name`, `primary_muscle`, `equipment_category`, `video_id` (Mux playback ID), `instructions` (JSONB array of steps), `default_weight_increment`, `default_increment_unit`, `primary_metric` (weight | reps | time).

`exercise_substitutions` — many-to-many for pre-flight swap suggestions. Each row carries a `similarity_score` and a `reason_label` ("same muscle", "similar pattern").

### Per-gym equipment

`gym_equipment` — equipment at a specific gym. Each row is one piece of equipment with `gym_id`, `equipment_category`, `display_label` (e.g., "Bench 3"), `position_index`, `status` (operational / maintenance / out_of_service).

`gym_equipment_pin_mapping` — for selectorized machines. Maps `pin_position` → `approx_kg` per equipment instance.

`equipment_reports` — user-submitted issues. `gym_id`, `reported_by_user_id`, `equipment_name_text`, `note`, `status` (pending / acknowledged / resolved).

### Routines and programs

`routines` — user-created or trainer-assigned routines. `user_id`, `name`, `description`, `is_template`, `visibility` (private / trainer_visible / public).

`routine_exercises` — order-positioned exercises within a routine. `routine_id`, `exercise_id`, `position`, `target_sets`, `target_reps`, `target_rest_seconds`, optional `superset_group_id`.

`programs` — multi-week structured plans assigned by trainers to clients. `trainer_id`, `client_id`, `name`, `weeks_total`, `current_week`, `routines_per_week`.

### Training data

`workout_sessions` — one row per workout. `user_id`, `gym_id`, `routine_id` (nullable for empty workouts), `started_at`, `ended_at`, `subjective_effort` (1-4 from emoji), `notes`, `entry_source` (manual / qr_scan / scheduled).

`workout_sets` — one row per logged set. `workout_session_id`, `exercise_id`, `gym_equipment_instance_id`, `weight_kg`, `pin_position`, `reps`, `rpe_inferred`, `is_warmup`, `is_failure`, `set_group_id`, `set_group_position`, `created_at`.

`set_groups` — superset and drop set linkage. `workout_session_id`, `kind` (superset / drop_set / giant_set / circuit), `rounds` (for supersets), `rest_seconds`.

`personal_records` — derived from set commits. `user_id`, `exercise_id`, `gym_equipment_instance_id`, `record_type` (est_1rm / max_weight / max_reps), `value`, `achieved_at`, `previous_value`.

### Body composition

`body_measurements` — `user_id`, `recorded_at`, `weight_kg`, `body_fat_percent`, `lean_mass_kg`. Each row is one measurement event.

`body_circumference` — `user_id`, `site` (chest / arm / waist / thigh / custom), `value_cm`, `recorded_at`.

`body_photos` — `user_id`, `storage_path`, `recorded_at`, optional `pose_type`.

### Preferences and overrides

`user_preferences` — JSONB on the user row. Includes `units` (kg/lb), `rest_seconds_default`, `haptics_enabled`, `notifications`, and various has-seen-hint flags.

`user_exercise_preferences` — per-user per-exercise overrides. `user_id`, `exercise_id`, `default_weight_increment`, `default_increment_unit`.

### Subscriptions and integrations

`user_subscriptions` — server-mirrored RevenueCat entitlements. `user_id`, `tier` (free / trial / premium), `expires_at`, `platform`.

`health_integrations` — per-user integration state. `user_id`, `provider` (apple_health / health_connect), `connected_at`, `last_sync_at`, `permissions_granted` (JSONB), `duplicates_skipped` count.

### Notifications and messaging

`notifications` — `user_id`, `kind`, `actor_id`, `subject_id`, `payload` JSONB, `read_at`.

`messages` — trainer-client async chat. `thread_id`, `sender_id`, `recipient_id`, `body`, `attachments`.

### Sharing

`leaderboard_participants` — opt-in leaderboard membership. `gym_id`, `user_id`, `display_name`, `opted_in_at`.

`share_events` — analytics on shares. `user_id`, `subject_type`, `subject_id`, `platform`, `included_fields`.

### Visibility seams

Every shareable entity carries three columns, baked into the schema from v1 even though most are not yet exposed in the UI:

- `visibility` — enum: private / trainer_visible / gym_visible / public. Default: private.
- `is_shareable` — boolean. Default: false. Even if visibility allows it, the user must explicitly mark something shareable.
- `origin_id` — uuid. If this entity was copied from another user (e.g., a routine cloned from a trainer's template), this points back to the source.

These three columns are present on `routines`, `personal_records`, `workout_sessions`, `body_measurements`, and `body_photos`. They let us expand sharing surfaces post-v1 without schema migrations.

---

## Behavioural rules baked into the design

These are rules that should be enforced in the codebase via the agent files and through code review.

### Friction budgets

- Log a set with same weight/reps as last set: **1 tap** (the primary "Log 80 × 8" button).
- Log a set with adjusted weight or reps by one increment: **2 taps** (one step button, one log button).
- Add an exercise mid-workout: **3 taps** (open selector, choose exercise, confirm with the green + button on the right of the row).
- Start a planned workout from cold launch: **2 taps** (open app, tap "Start workout" hero button).
- Switch current gym: **3 taps** (Profile, My gyms, Switch on the target gym).

### Implicit-confirm rule

Every set is provisional until the user either taps "Log" or navigates within the same exercise. Navigating to a different exercise without confirming silently discards the set with a small undo affordance. No "are you sure?" modals.

### Single accent rule

Each screen has at most one element rendered in the saturated `#1D9E75` accent. Eyes are trained, screen after screen, to find the next action in this colour.

### Disclaimer rule

Every screen that displays body composition data (body fat percent, lean mass, BMI) must include the short disclaimer card: "For personal fitness tracking only. Not a medical assessment. Consult a healthcare professional for medical guidance." This is non-optional and is enforced by the fitness-domain-expert agent.

### Privacy default rule

Every user-generated entity defaults to private visibility. Sharing requires explicit user action. Even when shared, the user controls granularity (gym name on/off, full name vs abbreviated, etc.).

### Two-speed data architecture

Personal data flows through PowerSync local-first. Aggregate or feed data (leaderboards, gym dashboards) flows through server-paginated TanStack Query — never PowerSync. PowerSync's strength is offline-correct personal data; it's the wrong tool for unbounded aggregate streams.

### Optimistic UI rule

Every logged set, every confirmed routine save, every measurement entry commits to local SQLite immediately and reflects in the UI before the network sync completes. Network sync is invisible to the user and happens in the background. Failed syncs are retried with exponential backoff; persistent failures surface as a small "syncing" indicator in the header but do not block UI.

### Wall-clock-anchored timer rule

Every rest timer uses wall-clock anchoring (compute remaining from `start_at + target_seconds - now`), not JS interval decrement. This ensures timers survive app backgrounding, phone calls, and lock screens.

---

## Patch 8 — what the agent files need to know

The screen designs in this catalog imply specific updates to the existing agent files in `.claude/agents/`. Capturing these here as a "patch 8" so the changes can be applied to the agent files in one batch.

### data-sync-engineer

Add to the schema documentation:
- `set_group` table with kind enum (superset / giant_set / circuit / drop_set) and `rounds`, `rest_seconds` fields. Sets within a group carry `set_group_id` and `set_group_position`.
- `gym_equipment_instance_id` on `workout_sets`. This is the per-machine binding.
- `user_exercise_preferences` table for per-user per-exercise increment overrides.
- Visibility seam columns (`visibility`, `is_shareable`, `origin_id`) on every shareable entity.

Add to the sync rules test scenarios:
- Test 11: Superset round atomicity — both A and B sets must sync atomically.
- Test 12: Drop set group integrity — top set + drops must sync atomically.
- Test 13: Per-equipment PR scoping — PR detection runs per gym_equipment_instance_id.

### ux-flow-architect

Add the implicit-confirm pattern as a documented rule. Friction budgets:
- "Log same as last": 1 tap
- "Log adjusted by one increment": 2 taps
- "Add exercise mid-workout": 3 taps

Add the stepped haptic numeric input pattern — this replaces the system keyboard for all in-workout numeric input.

### fitness-domain-expert

Add the per-exercise default-increment rules:
- Barbell compound: ±5 kg
- Selectorized machine: ±1 pin
- Cable kg-stack: ±5 kg
- Isolation barbell: ±2.5 kg
- Dumbbell: ±2.5 kg
- Bodyweight+load: ±1.25 kg

Add the body composition disclaimer rule as mandatory wherever body comp surfaces appear.

Add the App Store positioning: Health & Fitness, not Medical. MHMDA / GDPR / CCPA compliance required; HIPAA does not apply.

### mobile-architect

Add the pre-cache routine for offline pattern. Premium routines flagged for offline are pre-fetched on tap, including Mux video files via `expo-video-cache`.

Add the Live Activity behaviour for rest timer:
- Created on "Log set" with `target_seconds` from the routine
- Updated every 5 seconds via `expo-live-activity.update()`
- Dismissed on "Start next set" or timer expiration
- Interactive buttons (skip, +30s) supported via iOS 17+ Live Activity API

### qr-and-deeplink-specialist

Add the optimistic prefill rule for QR landing — by the time the user lands on the smart logger, weight + reps + equipment binding are pre-filled from the local database, with the JWT signature verification happening in parallel.

### note-keeper

Add an override-logging mechanism. When users override a default (per-exercise increment, default rest, etc.), the note-keeper logs the override with timestamp + previous value + new value for future analytics.

---

## What's next

This document is the complete UI/UX specification for the v1 Pulse app. With it, the path forward is:

1. **Convert to Figma.** A real designer takes this spec and builds it in Figma at production fidelity, creating the component library, the responsive variants, the dark/light mode pairs, and the asset exports for engineering. The spec gives them the decisions; they handle the pixel-pushing.

2. **Apply Patch 8 to the agent files.** The schema changes, the friction budgets, the per-exercise increment rules, and the implicit-confirm pattern need to be folded into `.claude/agents/data-sync-engineer.md`, `ux-flow-architect.md`, `fitness-domain-expert.md`, `mobile-architect.md`, `qr-and-deeplink-specialist.md`, and `note-keeper.md`.

3. **Implement in slices.** Start with the lifter journey from onboarding through one logged set. That's screens 1, 2, 7, 8, 9, 10, 11, and the post-workout summary from screen 3. Roughly two-week implementation slice for a competent React Native developer with the agent files loaded.

4. **Iterate with real users.** The implicit-confirm pattern and the smart logger are the highest-risk innovations. Get them in front of 10 users before building out the analytics surface. If they don't land, the rest of the app loses its differentiator.

5. **Sequence the rest.** Progress dashboard, history, body measurements come next (Batch 2 in this spec). Trainer surfaces (Batch 4) come last because the lifter app has to be excellent before trainers will trust their clients to it.

The product is designed for sub-100ms set logging, offline-correct sync, and a single emotional principle: respect the user's time and intelligence.

