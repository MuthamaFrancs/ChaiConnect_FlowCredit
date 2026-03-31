# ChaiConnect — Features & Functionality

This document summarises what the application does today and how major pieces fit together.

---

## 1. Roles & access

| Role | Experience | Primary surfaces |
|------|--------------|------------------|
| **Admin** | Email + password (simulated) | Full **Operations** shell + **FlowCredit** |
| **Clerk** | Employee ID + PIN | Deliveries, payments-oriented workflows |
| **Officer** | Staff ID + password | Quality, field-facing views |
| **Farmer** | Phone + OTP (simulated) | **Farmer portal** (`/portal`) only |

Route guards keep farmers out of staff routes and staff out of the farmer-only portal.

---

## 2. Design system (shared)

- **Colours:** Forest `#1B4332`, leaf `#2D6A4F`, fresh `#52B788`, soil `#8B4513`, gold `#D4A017`, parchment background.
- **Typography:** Plus Jakarta Sans (headings), DM Sans (body), JetBrains Mono (amounts, JSON).
- **M-Pesa:** Circular **M** badge next to money movements where applicable.
- **Payments:** Status chips (Paid / Pending with pulse / Failed / Overdue).
- **Motion:** Short page enter animation; stat count-up on dashboard-style cards.

Staff **Operations** shell: 240px sidebar with leaf watermark pattern, top bar (factory selector, **⌘/Ctrl+K** search, notifications demo, **Sandbox** pill).  
**Farmer portal:** Forest header strip with the same brand, sandbox + Daraja pulse, bottom tab bar with active-state bar matching ops accent.

---

## 3. Operations portal (`/app`)

- **Dashboard:** Animated stats, delivery/payment area chart (Recharts), recent payments table, payment queue teaser, factory leaderboard, alerts.
- **Farmer registry:** Card grid, credit tier / score bar, multi-step **register farmer** slide-over (simulated).
- **Farmer profile:** Hero, tabs for deliveries (bar chart + table), payment **timeline**, credit factors, M-Pesa activity filters.
- **Deliveries:** Clerk split layout — log form + today’s feed with grade colour cues.
- **Quality:** Pending list, assess drawer, SMS preview, donut analytics.
- **Payments:** Three-column Kanban-style flow with B2C JSON expand and confirm modal stub.
- **Communications:** Complaints table + admin alert composer with preview strip.
- **Reports:** Report picker, table export / print stubs, multi-chart analytics (Recharts).
- **Settings:** Factory profile, M-Pesa config fields, FlowCredit caps, grade rates.

---

## 4. FlowCredit (`/flowcredit`)

Gold-accent primary actions while keeping the same shell:

- **Dashboard:** Disbursement bars + repayment line (composed chart), repayment timeline list, overdue alert.
- **Credit scoring:** Farmer search, animated ring, five factor bars, **M-Pesa transaction basis** table.
- **Loans:** Eligible / active / completed columns.
- **Disburse:** Gradient offer card, large KSh display, B2C JSON block, confirmation overlay with stepped progression (driven by simulated delays from API).
- **Transactions:** Terminal-style list, filters, detail JSON panel, health summary.

---

## 5. Farmer portal (`/portal`)

Mobile-first (`portal-body` 18px base on narrow screens):

- **Home:** Forest gradient greeting, stat pair, **Inayodaiwa** gold card, last paid + M-Pesa confirmation line, pending chip, FlowCredit CTA.
- **Deliveries:** Grade-stripe rows, expected net with M badge, total kg footer (EN/Sw copy in chrome).
- **Payments:** Filter chips inside a bordered card, timeline-style inner cards, status pills.
- **Deductions:** Donut + bar charts in **card-surface** sections (matches ops chart styling).
- **FlowCredit:** Score ring, active loan card, 3-step apply flow with JSON preview on confirm.
- **USSD:** Phone mock with forest trim, menu + SMS preview ( keyed selection).

---

## 6. Backend API (demo)

`chai_connect_backend/src/routes/api.js` serves JSON aligned with the frontend seed:

- Farmers, stats, recent payments, deliveries, loans, complaints, analytics points.
- `POST /api/mpesa/simulate-b2c` returns step timings for UI progression.

**Sequelize** models remain available for PostgreSQL-backed expansion; demo UI tolerates API failure by falling back to client-side seed in some hooks.

---

## 7. Integrations roadmap (production)

- Full **B2C / C2B** request signing, **ResultURL** / **QueueTimeOutURL**, idempotent webhooks.
- **Transaction Status** and **Account Balance** where required for live scoring.
- Hardening: real JWT/session auth, rate limits, audit logs, and PII encryption for national IDs.

---

## 8. How to run (short)

See **[README.md](README.md)** for PostgreSQL env setup, `npm start` / `npm run dev`, and deployment notes.
