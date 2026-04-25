# SplitRight — Product Requirements Document

**Version:** 1.0  
**Author:** Pre-final year project, SRMIST  
**Stack:** React + FastAPI + Supabase + Claude API  
**Target:** Resume project · deployed · interview-ready

---

## 1. Problem Statement

Splitting expenses in friend groups is painful. Existing tools (Splitwise, etc.) require manual form entry for every expense — payer, amount, participants, split type. This friction means people stop logging expenses mid-trip and settle up on vibes.

**SplitRight** solves two things existing tools do poorly:

1. **Entry friction** — type a sentence, not a form. *"Rahul paid ₹800 for dinner split 4 ways"* becomes a structured expense record automatically.
2. **Debt complexity** — after N expenses, you shouldn't owe N people. SplitRight minimizes the number of transactions needed to settle a group using a graph-based debt simplification algorithm.

---

## 2. Target Users

- College students splitting rent, food, trips
- Friend groups going on vacations
- Roommates tracking shared utilities

**Scale target for resume:** 100+ real users (deploy it, share it with your college batch — this matters for interviews)

---

## 3. Core Features

### 3.1 Authentication
- Google OAuth via Supabase Auth
- JWT issued on login, stored in `httpOnly` cookie or `localStorage`
- JWT validated on every protected FastAPI route via middleware
- Session expiry + refresh token flow

### 3.2 Groups
- Create a group (name, optional description, invite link)
- Join a group via invite link (token-based, expires in 24h)
- View all groups you belong to
- Group members list with avatars

### 3.3 Expense Management
- Add expense: payer, amount, description, split type (equal / exact / percentage), participants
- Edit / delete expense (only by creator or group admin)
- Expense history feed per group (reverse chronological)
- Categories: food, travel, accommodation, utilities, other

### 3.4 Natural Language Expense Entry ★
- Text input: *"Rahul paid 800 for dinner split 4 ways"*
- FastAPI `/parse-expense` endpoint calls Claude API with a strict system prompt
- Claude returns structured JSON: `{ payer, amount, description, split_type, participants }`
- Backend validates schema + business rules (payer in group? amount > 0?)
- If valid → pre-fills the expense form for user confirmation before saving
- If invalid → graceful fallback to manual form with error message
- **User always confirms before DB write** — AI never writes directly

### 3.5 Debt Simplification Engine
- After any expense is added, recompute net balances for the group
- Run the minimum cash flow algorithm (greedy net-balance reduction)
- Display: *"You owe Priya ₹450"* instead of *"You owe Rahul ₹200, owe Aakash ₹150, owe Priya ₹100"*
- "Settle up" button marks a debt as paid (creates a settlement record)

### 3.6 Dashboard
- Personal dashboard: total you owe, total owed to you across all groups
- Per-group balance summary
- Recent activity feed

---

## 4. Technical Requirements

### 4.1 Frontend — React (Vite + TailwindCSS)
| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Marketing page + login CTA |
| Auth callback | `/auth/callback` | Supabase OAuth redirect handler |
| Dashboard | `/dashboard` | All groups + net balance summary |
| Group detail | `/group/:id` | Expenses feed + member balances |
| Add expense | `/group/:id/add` | Form + NLP input toggle |
| Settle up | `/group/:id/settle` | Shows simplified debts |
| Profile | `/profile` | User settings |

### 4.2 Backend — FastAPI (Python 3.11+)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/verify` | POST | Validate Supabase JWT |
| `/groups` | GET, POST | List / create groups |
| `/groups/:id` | GET, PUT, DELETE | Group CRUD |
| `/groups/:id/members` | GET, POST | Member management |
| `/groups/:id/expenses` | GET, POST | Expense CRUD |
| `/expenses/:id` | PUT, DELETE | Edit / delete |
| `/groups/:id/balances` | GET | Simplified debt graph |
| `/parse-expense` | POST | NLP → structured JSON |
| `/groups/:id/settle` | POST | Record a settlement |

### 4.3 Database — Supabase (PostgreSQL)

```sql
-- users (managed by Supabase Auth, extended below)
create table profiles (
  id uuid references auth.users primary key,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- groups
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references profiles(id),
  invite_token text unique,
  invite_expires_at timestamptz,
  created_at timestamptz default now()
);

-- group membership
create table group_members (
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'member', -- 'admin' | 'member'
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- expenses
create table expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  paid_by uuid references profiles(id),
  amount numeric(10,2) not null,
  description text,
  category text default 'other',
  split_type text default 'equal', -- 'equal' | 'exact' | 'percentage'
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- how each expense is split
create table expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id) on delete cascade,
  user_id uuid references profiles(id),
  amount numeric(10,2) not null,
  is_settled boolean default false
);

-- settlement records
create table settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id),
  paid_by uuid references profiles(id),
  paid_to uuid references profiles(id),
  amount numeric(10,2),
  settled_at timestamptz default now()
);
```

### 4.4 AI Integration — Claude API
- Model: `claude-sonnet-4-20250514`
- Endpoint: `/parse-expense` (POST)
- System prompt enforces JSON-only output with fixed schema
- Response validated with Pydantic before any DB interaction
- Fallback: if Claude returns malformed JSON or `{ "error": ... }`, return 422 to frontend

### 4.5 Infrastructure
- FastAPI containerized with Docker (single `Dockerfile`)
- React built to static files, served via Netlify (free)
- FastAPI deployed to Render (free tier, Docker deploy)
- Supabase handles DB + Auth (free tier)
- Environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`

---

## 5. The Debt Simplification Algorithm

This is the technical centrepiece. Understand it cold.

**Problem:** Given N people and M expenses, minimize the number of transactions to settle all debts.

**Algorithm:**
1. Compute net balance for each person: `net[i] = total_paid[i] - total_owed[i]`
2. Positive net = creditor (is owed money). Negative net = debtor (owes money).
3. Use two heaps (max-creditor, max-debtor). Greedily match the biggest creditor with the biggest debtor.
4. Each match = one transaction. Amount = min(creditor_balance, debtor_balance).
5. Repeat until all balances are zero.

**Example:**
- Alice paid ₹600 for a ₹200/person dinner (3 people: Alice, Bob, Carol)
- Bob paid ₹300 for Uber (3 people, ₹100 each)
- Net: Alice +400, Bob +200, Carol -600
- Simplified: Carol pays Alice ₹400, Carol pays Bob ₹200 → 2 transactions, done.

**Interview talking point:** "This is O(N log N) where N is the number of people. The naive approach produces O(M) transactions; the simplified approach produces at most O(N-1)."

---

## 6. Project Structure

```
splitright/
├── backend/
│   ├── main.py                  # FastAPI app entry
│   ├── auth.py                  # JWT middleware
│   ├── routers/
│   │   ├── groups.py
│   │   ├── expenses.py
│   │   ├── balances.py
│   │   └── nlp.py               # /parse-expense
│   ├── services/
│   │   ├── debt_engine.py       # The algorithm
│   │   └── claude_parser.py     # Claude API wrapper
│   ├── models.py                # Pydantic schemas
│   ├── database.py              # Supabase client
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── GroupDetail.jsx
│   │   │   ├── AddExpense.jsx
│   │   │   └── SettleUp.jsx
│   │   ├── components/
│   │   │   ├── NLPInput.jsx     # The star component
│   │   │   ├── ExpenseFeed.jsx
│   │   │   ├── BalanceCard.jsx
│   │   │   └── DebtSummary.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── useGroup.js
│   │   ├── lib/
│   │   │   ├── supabase.js      # Supabase client init
│   │   │   └── api.js           # Axios wrapper + JWT inject
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml
└── README.md
```

---

## 7. Weekend Build Plan

### Day 1 — Saturday

**Morning (3–4 hrs): Foundation**
- Init monorepo, create Supabase project
- Configure Google OAuth in Supabase dashboard
- Build auth flow: login → OAuth redirect → JWT → protected route
- Verify JWT in FastAPI middleware
- Commit: `feat: auth foundation — supabase oauth + jwt middleware`

**Afternoon (4–5 hrs): Core data layer**
- Run DB migrations in Supabase SQL editor
- Build `/groups` and `/expenses` CRUD endpoints
- Wire up React pages: Dashboard, GroupDetail
- Basic expense form (manual entry first)
- Commit: `feat: groups and expenses CRUD`

### Day 2 — Sunday

**Morning (3–4 hrs): The algorithm + AI**
- Implement `debt_engine.py` — write it from scratch, test with examples
- Build `/parse-expense` with Claude API integration + Pydantic validation
- Build `NLPInput.jsx` component with confirmation step
- Commit: `feat: debt simplification engine + NLP expense parser`

**Afternoon (3–4 hrs): Polish + Deploy**
- Settle up flow (mark debts as paid)
- Basic responsive UI polish
- Dockerfile for backend
- Deploy backend to Render, frontend to Netlify
- Smoke test end-to-end on prod URL
- Commit: `feat: settlement flow + docker + production deploy`

---

## 8. Resume Line

> **SplitRight** — Full-stack expense splitting app with JWT auth, a graph-based debt minimization algorithm (O(N log N)), and a natural language expense entry system powered by the Claude API with Pydantic-validated structured outputs. Built with React, FastAPI, Supabase, and Docker. Deployed on Render.

---

## 9. Key Interview Q&A

**Q: Why FastAPI over Flask/Django?**
A: FastAPI gives async support out of the box, automatic OpenAPI docs, and Pydantic validation natively integrated. For an API-first project it's the right tool.

**Q: How does the JWT flow work?**
A: Supabase issues a JWT on OAuth login. The frontend sends it in the `Authorization: Bearer` header. My FastAPI middleware decodes and verifies it using the Supabase public key on every protected route. I never store passwords.

**Q: Explain the debt algorithm.**
A: I compute net balances — total paid minus total owed — for each user. Positive balance = creditor, negative = debtor. I use a greedy approach with two max-heaps to match the largest creditor with the largest debtor each iteration, producing at most N-1 transactions for N people.

**Q: What if Claude returns garbage?**
A: I validate every response against a strict Pydantic schema before touching the database. If validation fails, the endpoint returns a 422 and the frontend falls back to the manual form. The AI is a convenience layer, not a trusted source.

**Q: Why not Kubernetes?**
A: For a single-service backend at this scale, Docker on Render is the right call. Kubernetes solves orchestration for multi-service systems with scaling needs — adding it here would be complexity for its own sake. I understand what K8s solves and can walk through when you'd reach for it.
