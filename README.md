# 🌿 ChaiConnect + FlowCredit

> **M-Pesa-based payment transparency and supply chain financing for Kenya's tea farmers**
> *M-Pesa Money in Motion Hackathon · 2025*

---

## 🧭 Overview

Kenya has **680,000 smallholder tea farmers** supplying 77 KTDA-affiliated factories — the backbone of a **KSh 140 billion industry**. Despite this, the farmers at the bottom of the chain operate in a financial information blackout.

They don't know what they're owed. They don't know when they'll be paid. They don't know why their amounts change. And when they need money between harvests, the formal credit system treats them as if they don't exist.

**ChaiConnect + FlowCredit** fixes both problems — built entirely on the M-Pesa Daraja 3.0 API.

---

## ❗ The Problem

### Problem 1 — *Payment opacity in tea cooperatives*

When a farmer delivers green leaf to the factory, a chain of calculations begins that **the farmer cannot see**.

The factory weighs and grades the tea. A rate is applied. Deductions are made — for the SACCO, an outstanding loan, a factory levy. A net figure is eventually sent to the farmer's M-Pesa, sometimes weeks later, **with no itemised breakdown**.

> *"The money received as bonus was deducted by banks and SACCOs. We only saw it reflected in statements, not actual cash."*
> — **Patrick Langat, tea farmer, Bomet**

The farmer has no way to verify:
- Whether the weight was recorded correctly
- Which grade the factory assigned
- Which rate was applied
- Why the amount differs from last month

Payment disputes are resolved at **annual AGMs — once a year**. Everything in between is word of mouth and rumour.

On the cooperative side, factory clerks track payments in spreadsheets or paper registers. With hundreds of farmers per factory, knowing who has been paid, who is pending, and who has deductions outstanding is **error-prone and opaque**. The situation became so severe that KTDA was forced to publicly deny *"false payment numbers circulating online"* in September 2025 — because farmers could no longer distinguish official figures from rumours.

---

### Problem 2 — *No access to working capital*

Between harvest and payment, tea farmers face a cash gap that can stretch **two to four weeks**. Inputs — fertiliser, labour, transport — must be paid immediately. Cooperative payments arrive on a cycle. To bridge this gap, most farmers borrow from **informal lenders at 30–50% monthly interest**.

| Metric | Figure |
|---|---|
| Smallholder farmers affected | **680,000** |
| Annual losses from payment disputes | **KSh 4.2 billion** |
| Farmers without access to formal credit | **94%** |
| KTDA factories with opaque payment systems | **77** |
| Drop in total farmer payments (2024–2025) | **KSh 89B → KSh 69B** |

The cruel irony is that these farmers *do* have a rich financial record. Every cooperative payment, every M-Pesa transaction, every delivery record exists in Safaricom's infrastructure. **But no lender is using it.**

Farmers are credit-invisible despite being economically active.

---

## ✅ The Solution

ChaiConnect + FlowCredit is a **unified platform with two integrated portals** sharing one M-Pesa backbone. It solves both problems simultaneously — without asking farmers to change their behaviour or adopt a new payment system.

---

### 🟢 ChaiConnect — *Payment Transparency Portal*

ChaiConnect gives every actor in the tea value chain a **real-time, accurate view** of deliveries, quality grades, and payments.

**How it works:**

1. 📦 **Factory clerk logs the delivery** — weight, grade (A/B/C), and date entered digitally. The farmer receives an instant SMS: *"Your 42 kg of Grade A tea has been recorded at Kiambu Factory. Expected payment: KSh 1,260."*

2. ✅ **Cooperative admin approves the payment batch** — a live dashboard shows every farmer's status: *Pending*, *Approved*, or *Paid*. No spreadsheet. No guesswork.

3. 💸 **Disbursement triggered via M-Pesa B2C** — admin clicks *"Disburse All."* The Daraja B2C API sends individual payments to each farmer's M-Pesa wallet. Funds arrive in **under 60 seconds**.

4. 📊 **Farmer sees the full breakdown** — in their mobile portal: `KSh 1,260 gross → KSh 210 SACCO deduction → KSh 1,050 net to your M-Pesa`. Every figure is visible. Nothing is hidden.

5. 📱 **USSD fallback for feature phones** — farmers without smartphones dial `*483#` to access delivery records, payment summaries, and quality feedback in **English or Kiswahili**.

---

### 🟡 FlowCredit — *Supply Chain Financing Portal*

FlowCredit turns a farmer's **M-Pesa transaction history into a credit score** — and uses that score to offer short-term working capital that is disbursed in seconds and repaid automatically.

**How it works:**

1. 🤝 **Farmer opts in and consents** — explicit, reversible consent to share M-Pesa transaction history for credit assessment.

2. 🧮 **Credit score generated from five factors:**

   | Factor | What It Measures | Weight |
   |---|---|---|
   | Inflow Consistency | Regularity of cooperative M-Pesa payments over 90 days | 30% |
   | Buyer Relationship | Length and stability of relationship with the same cooperative | 25% |
   | Volume Trend | Whether delivery volumes are growing, stable, or declining | 20% |
   | Repayment History | Prior loan defaults or clean record | 15% |
   | Transaction Frequency | Average M-Pesa transactions per month | 10% |

   Score range: **0–100** · Grades: **A (low risk) / B (medium) / C (high)**

3. 💬 **Loan offer presented with full transparency** — amount, flat interest rate, number of repayment deductions, and exact net payment after each deduction. *No hidden fees.*

4. 💸 **Funds disbursed via M-Pesa B2C** — farmer accepts and money lands in their M-Pesa wallet **within 60 seconds**, with a confirmation SMS showing the full repayment schedule.

5. 🔁 **Repayment deducted automatically** — when the cooperative pays the farmer, ChaiConnect's **C2B Validation webhook** intercepts the payment, deducts the loan instalment, and forwards the remainder. The farmer never needs to remember a repayment date.

---

## 📡 How We Use the M-Pesa API

ChaiConnect integrates **four Daraja 3.0 endpoints**, each mapped directly to a specific problem in the tea payment and financing chain.

---

### `B2C API` — `/mpesa/b2c/v3/paymentrequest`

**What it does in ChaiConnect:**
Disburses cooperative payments and FlowCredit loans directly to individual farmer M-Pesa wallets. The payload includes the farmer's phone number, the net amount after deductions, and a `Remarks` field containing the delivery or loan reference — so the farmer sees the context in their M-Pesa message.

**Problem it solves:**
*Eliminates manual cash disbursement. Farmer receives funds in under 60 seconds with an M-Pesa confirmation SMS.*

```json
{
  "InitiatorName":     "ChaiConnect_API",
  "CommandID":         "BusinessPayment",
  "Amount":            15000,
  "PartyA":            "600984",
  "PartyB":            "254712345678",
  "Remarks":           "FlowCredit loan disbursement - Wanjiku Kamau",
  "ResultURL":         "https://chaiconnect.co.ke/api/b2c/result",
  "QueueTimeOutURL":   "https://chaiconnect.co.ke/api/b2c/timeout"
}
```

---

### `C2B Paybill + Validation URL` — `/mpesa/c2b/v1/registerurl`

**What it does in ChaiConnect:**
Powers the **automatic loan repayment mechanic**. When a cooperative pays a farmer via Paybill, Safaricom fires a validation callback to ChaiConnect *before* processing the payment. ChaiConnect checks for a pending loan instalment, calculates the net amount, and returns the adjusted figure. The deduction is fully transparent — visible to the farmer in their payment ledger in real time.

**Problem it solves:**
*Farmers never miss a repayment because repayment is not a separate action — it is deducted automatically from money they are already receiving.*

---

### `Transaction Status API` — `/mpesa/transactionstatus/v1/query`

**What it does in ChaiConnect:**
Confirms every B2C disbursement was received using the `OriginatorConversationID` returned from the B2C call. Updates the farmer's payment record: **Paid / Pending / Failed**. Also used to build the M-Pesa inflow history that powers FlowCredit credit scoring.

**Problem it solves:**
*Gives cooperative admins a definitive paid vs pending ledger — solving the exact problem they currently cannot solve with spreadsheets.*

---

### `OAuth Token` — `/oauth/v1/generate`

**What it does in ChaiConnect:**
Requested before every API call. Token cached for the one-hour validity window and refreshed automatically. All credentials stored server-side — **never exposed to the frontend**.

**Problem it solves:**
*Every M-Pesa action in ChaiConnect is authenticated. Judges can see the full token request and API response in the live transaction feed.*

---

### 🔄 The Repayment Intercept — *Step by Step*

This is the **core technical innovation** of FlowCredit — automatic loan repayment without any action from the farmer:

```
1. Cooperative initiates bulk payment to farmers via M-Pesa Paybill
        ↓
2. Safaricom fires POST to ChaiConnect's Validation URL (before processing)
        ↓
3. ChaiConnect checks: does this farmer have a pending repayment instalment?
        ↓
4. If yes → ChaiConnect returns net amount (payment minus instalment)
        ↓
5. Safaricom processes the adjusted amount, fires Confirmation URL
        ↓
6. Farmer's ledger: KSh 3,200 received → KSh 800 repayment → KSh 2,400 net to M-Pesa
```

> 💡 *The repayment is not a separate transaction the farmer must remember. It happens automatically, transparently, and is visible in real time in the farmer's payment ledger — which is precisely what KTDA farmers are demanding right now.*

---

## 👥 User Roles

| Role | Access | Primary Device |
|---|---|---|
| **Cooperative Admin** | Full platform — payments, analytics, user management | Desktop |
| **Factory Clerk** | Delivery logging, quality grading, farmer search | Tablet |
| **Extension Officer** | Field visits, training records, farmer feedback | Mobile |
| **Farmer** | Read-only operations view + FlowCredit loan access | Mobile / USSD |

---

## 🗂️ Platform Pages

### Operations Portal
- **Dashboard** — stat cards, payment queue, alerts, delivery activity chart
- **Farmer Registry** — card grid with credit scores, statuses, quick actions
- **Farmer Profile** — delivery history · payment timeline · credit profile · M-Pesa activity
- **Delivery Logging** — clerk split-view: log form + live delivery feed
- **Quality Assessment** — grading tool with farmer notification preview
- **Payment Management** — three-column Kanban: Pending → Approved → Completed
- **Communications** — complaints tracker + admin alert composer

### FlowCredit Portal
- **FlowCredit Dashboard** — loan portfolio, disbursements vs repayments chart
- **Credit Scoring** — animated score ring, five-factor breakdown, transaction basis table
- **Loan Management** — Kanban: Eligible → Active → Completed
- **Disbursement** — loan offer card + live B2C payload preview + confirmation modal
- **M-Pesa Transaction Feed** — every Daraja API call visible with JSON viewer

### Farmer Mobile Portal
- **Home** — what's owed, last payment, M-Pesa confirmation code
- **Deliveries** — full history with grade and expected payment
- **Payments** — timeline view with deduction breakdown
- **FlowCredit** — credit score ring, active loan status, loan application flow
- **USSD Simulation** — `*483#` → PIN → menu for feature phone users

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Tailwind CSS |
| Animations | Framer Motion |
| Charts | Recharts |
| Backend | Node.js + Express |
| Database | Firebase Firestore |
| Payments | M-Pesa Daraja 3.0 (B2C, C2B, Transaction Status, OAuth) |
| USSD | Africa's Talking USSD API |
| SMS | Africa's Talking SMS Gateway |

---

## 🌍 Why M-Pesa Is the *Only* Infrastructure That Works Here

With **34 million M-Pesa users** and **90.9% market share** in Kenya, every tea farmer already has an M-Pesa account. The cooperative already pays them through it. The transaction history already exists.

ChaiConnect does not ask farmers to adopt a new payment system. It builds **transparency and financing on top of the one they are already using every day**.

> *"Transparency is no longer optional in Kenya's tea sector — it is a necessity."*
> — **Government position on KTDA payment disputes, 2025**

The problem is real, live, and politically urgent. The infrastructure is already in place. **The only thing that was missing was the platform to connect them.**

---

*Built for the M-Pesa Money in Motion Hackathon · 2025 · Powered by Safaricom Daraja 3.0*

## Live demo 

- **Live web app:** https://chaiconnects.vercel.app/.
- **Drive / assets :** https://drive.google.com/drive/folders/1-6lkr_GvSyRf2VtywiHGLc29TTeVJ0Ca?usp=drive_link.


---

## Screenshots


<img width="1361" height="631" alt="image" src="https://github.com/user-attachments/assets/583342f3-1195-42eb-8fd6-f07cb1ba14c7" />

<img width="1349" height="631" alt="image" src="https://github.com/user-attachments/assets/fb98bea0-3339-4ef9-b595-9df2a8cc71e8" />

<img width="1351" height="633" alt="image" src="https://github.com/user-attachments/assets/ac2c6086-6776-43aa-bb41-10fa723bb1e1" />

<img width="527" height="618" alt="image" src="https://github.com/user-attachments/assets/6eda5e58-a8af-48fd-a8ac-90b88daf5cc9" />

<img width="1364" height="631" alt="image" src="https://github.com/user-attachments/assets/a27895a5-6c88-41a8-912d-6dc96aaa2225" />

<img width="372" height="239" alt="image" src="https://github.com/user-attachments/assets/787e6cbd-bdd5-494c-8120-7ee46ebd25f8" />


---

## Test accounts (multi-role)

On the **Login** page, choose a role tab and submit (simulated auth).

- **Admin:** email + any password → staff app `/app`
- **Clerk:** employee ID + 4-digit PIN → `/app`
- **Officer:** staff ID + password → `/app`
- **Farmer:** M-Pesa phone e.g. `0712345678` + any OTP → `/portal`

---

## About

ChaiConnect supports **admins, clerks, extension officers, and farmers** with coherent navigation: staff use the forest sidebar shell with global search and FlowCredit section; farmers use bottom tabs, gold emphasis for credit, and optional USSD simulation. The stack prioritises readable TypeScript/React on the client and Express routes on the server.

---

## Technologies and tools

- React 19, TypeScript, Vite, React Router, Recharts
- Node.js, Express, Sequelize, PostgreSQL, Helmet, CORS, Morgan
- Safaricom Daraja OAuth stub; sandbox B2C simulation via API
- ESLint, npm
- **AI tools:** Cursor (and similar) used for assistance; team reviewed all changes.

---

## Collaborators (transparency — 5 members)

1. **Blessings Wanjiku** — Frontend Developer, Business Analyst, Team Lead  
2. **Ravine Riang'a** — Full Stack / Mobile DevOps  
3. **Francis Musau** — Backend Developer  
4. **Faruoq Muhammed** — MERN Developer  
5. **Peter Kariuki** — ML Developer  

---

## Setup and run

### Prerequisites

Node.js 18+, npm, PostgreSQL.

### Backend

```bash
cd chai_connect_backend
cp .env.example .env
# Edit .env: DB_NAME, DB_USER, DB_PASS, DB_HOST, PORT, MPESA_* as needed
npm install
npm start
```

API base: `http://localhost:5000` — health `GET /health`, data `GET /api/...`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Proxy sends `/api` to port 5000.

### Production build

```bash
cd frontend
npm run build
```

Serve `frontend/dist` via your host; configure the API base URL or reverse-proxy `/api` to the backend.

---

## Documentation

- **FEATURES.md** — detailed feature list and behaviour  
- **chai_connect_backend/.env.example** — environment variables  

## APIs and integrations

See `chai_connect_backend/src/routes/api.js` for `GET /api/farmers`, `/api/stats`, `/api/payments/recent`, `POST /api/mpesa/simulate-b2c`, and more. Live Daraja calls use `GET /test-mpesa-token` when sandbox keys are set in `.env`.
</think>


<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
StrReplace
