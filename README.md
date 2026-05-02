# SplitRight

A full-stack bill-splitting and expense management application with AI-assisted natural language parsing and intelligent debt simplification.

## What is SplitRight?

SplitRight streamlines group expense management with:

- **Smart Expense Parsing**: Enter expenses in natural language (e.g., "Pizza ₹45 split between Alice, Bob, and me") powered by Groq's Llama 3.1 8B Instant
- **Minimal Settlements**: Greedy two-heap debt simplification algorithm reduces the number of transactions needed to settle group balances
- **Flexible Splitting**: Support for equal splits, exact amounts, percentages, and shares
- **Group Management**: Create groups, invite members via shareable join tokens, track balances in real-time
- **Guest Support**: Add non-registered guests to expenses; assign them to real members as they join
- **Secure Authentication**: Google OAuth integration via Supabase (ES256 JWT)
- **Receipt Scanning**: Upload receipts to auto-extract expense details via AI

## Tech Stack

**Frontend**: React 18, Vite, TailwindCSS, Lucide React  
**Backend**: FastAPI, Python 3.11+  
**Database**: PostgreSQL (Supabase)  
**AI / NLP**: Groq API — `llama-3.1-8b-instant` (text parsing), `meta-llama/llama-4-scout-17b-16e-instruct` (receipt OCR / vision)  
**Auth**: Supabase Auth with Google OAuth, JWT (ES256) verified via `PyJWKClient`  
**Deployment**: Render (Backend, Docker), Netlify (Frontend)

## Debt Minimization Algorithm

SplitRight uses a greedy two-heap algorithm to minimize the number of transactions required to settle all debts in a group.

### How It Works

The algorithm operates in **O(N log N)** time:

1. Calculate net balance for each member (total owed − total owing)
2. Separate members into creditors (positive balance) and debtors (negative balance)
3. Use two max-heaps to efficiently match the largest debts with the largest credits
4. Generate optimal settlement transactions

## Example: How SplitRight Simplifies Payments

Imagine four friends go out together: Alice, Bob, Carol, and Dave.

At the end of the day:

- Alice paid more than her share and should get back ₹500  
- Bob paid more than his share and should get back ₹300  
- Carol paid less and needs to pay ₹500  
- Dave paid less and needs to pay ₹300  

---

### Without SplitRight (messy way)

Carol and Dave might try to split their payments between both Alice and Bob.  
This can lead to multiple small payments and confusion about who should pay whom.

---

### With SplitRight (simple way)

SplitRight looks at the **final balances**, not individual transactions.

- Carol pays ₹500 to Alice  
- Dave pays ₹300 to Bob  

---

### Result

- Everyone is settled  
- Only **2 payments** were needed  
- No confusion, no unnecessary transactions  

---

### Key Idea

Instead of tracking every individual expense, SplitRight calculates how much each person owes overall and settles it in the simplest way possible.

## Features

- ✅ Google OAuth authentication (Supabase)
- ✅ Create and manage expense groups
- ✅ Invite members via shareable join tokens
- ✅ Natural language expense entry (Groq / Llama 3.1 8B Instant)
- ✅ Receipt upload for AI-powered expense extraction (Llama 4 Scout vision)
- ✅ Multiple split types: equal, exact amount, percentage, shares
- ✅ Guest member support with reassignment to real users
- ✅ Real-time balance tracking per group and overall
- ✅ Debt simplification engine (two-heap greedy)
- ✅ Edit and delete expenses
- ✅ Expense detail view
- ✅ Settle-up flow with transaction records
- ✅ Mobile-responsive design
- ✅ Dark / Light mode toggle

## Project Structure

```
splitright/
├── backend/
│   ├── main.py                  # FastAPI application entry point
│   ├── database.py              # Supabase client setup
│   ├── dependencies.py          # JWT verification dependency
│   ├── models.py                # Pydantic request/response schemas
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── routers/
│   │   ├── groups.py            # Group CRUD + join-token invitations
│   │   ├── expenses.py          # Expense management + NLP parsing + receipt OCR
│   │   ├── balances.py          # Balance calculation + settlement records
│   │   ├── guests.py            # Guest member CRUD + reassignment
│   │   └── nlp.py               # NLP parse endpoint
│   ├── services/
│   │   ├── debt_engine.py       # Two-heap debt minimization algorithm
│   │   └── llm_parser.py        # Groq LLM integration (NLP + receipt OCR)
│   └── migrations/
│       ├── 001_init_schema.sql             # Core tables
│       ├── 002_create_user_trigger.sql     # Auto-profile trigger
│       ├── 003_fix_settlements_fk.sql      # FK cascade fix
│       ├── 004_add_group_guests.sql        # Guest member support
│       └── 005_add_guest_payer_support.sql # Guest as expense payer
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Router setup
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── pages/
│   │   │   ├── Login.jsx        # Login page (Google OAuth)
│   │   │   ├── Dashboard.jsx    # Group list + balance summary
│   │   │   ├── GroupDetail.jsx  # Group expenses, members, balances
│   │   │   ├── AddExpense.jsx   # NLP + manual expense entry
│   │   │   ├── EditExpense.jsx  # Edit existing expense
│   │   │   ├── ExpenseDetail.jsx# Expense breakdown view
│   │   │   ├── JoinGroup.jsx    # Join group via invite token
│   │   │   ├── SettleUp.jsx     # Settlement flow
│   │   │   └── AuthCallBack.jsx # OAuth redirect handler
│   │   ├── components/
│   │   │   ├── Navbar.jsx       # Top navigation bar
│   │   │   ├── Footer.jsx       # Page footer
│   │   │   ├── HowItWorksModal.jsx # In-app explainer modal (component only)
│   │   │   ├── NLPInput.jsx     # Natural language expense input
│   │   │   ├── BillScanInput.jsx# Receipt upload + OCR input
│   │   │   └── icons/           # Custom SVG icon components
│   │   ├── context/
│   │   │   ├── ThemeContext.jsx # Dark/light mode context provider
│   │   │   └── useTheme.js      # useTheme hook
│   │   └── lib/
│   │       ├── supabase.js      # Supabase client + signInWithGoogle
│   │       └── api.js           # Axios instance with JWT interceptor
│   └── ...
└── README.md
```

## Database Schema

| Table | Purpose |
|---|---|
| `profiles` | User profiles (auto-created on Supabase signup via trigger) |
| `groups` | Expense groups |
| `group_members` | Group membership + roles (admin / member) |
| `expenses` | Individual expenses with metadata; supports real-user and guest payers |
| `expense_splits` | Per-member split breakdown (supports guest splits) |
| `group_guests` | Temporary non-registered members per group |
| `settlements` | Payment settlement records |

---

# Developer Quickstart

## Prerequisites

- Node.js 18+
- Python 3.11+
- Supabase account (PostgreSQL + Auth)
- Groq API key
- Google OAuth credentials

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/aswinsai45/splitright.git
cd splitright

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### 2. Environment Variables

**Backend** (`backend/.env`):
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key   # Service role JWT
GROQ_API_KEY=your_groq_api_key
```

**Frontend** (`frontend/.env`):
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:8000
```

### 3. Database Setup

Run the migration files from `backend/migrations/` in order in your Supabase SQL editor:

```
001_init_schema.sql             → core tables
002_create_user_trigger.sql     → auto-profile on signup
003_fix_settlements_fk.sql      → cascade delete fix
004_add_group_guests.sql        → guest member support
005_add_guest_payer_support.sql → guest as payer
```

### 4. Configure Google OAuth

1. Create OAuth credentials in Google Cloud Console
2. Add authorized redirect URIs: `http://localhost:5173` (dev) and your production URL
3. Enable Google provider in Supabase Auth → Providers
4. Add the Client ID and Secret to Supabase

### 5. Run Development Servers

**Backend** (port 8000):
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

**Frontend** (port 5173):
```bash
cd frontend
npm run dev
```

Access the app at `http://localhost:5173`

---

## Key Implementation Notes

### JWT Verification
Supabase newer projects use **ES256** asymmetric keys. The backend uses `PyJWKClient` for verification (`backend/dependencies.py`):

```python
from jwt import PyJWKClient
jwks_url = f"{SUPABASE_URL}/auth/v1/jwks"
jwks_client = PyJWKClient(jwks_url)
signing_key = jwks_client.get_signing_key_from_jwt(token)
```

### Route Ordering
FastAPI matches routes in order. Specific routes are placed before parameterized ones:

```python
@router.get("/join/{token}")   # Must come before /{group_id}
@router.get("/{group_id}")
```

### NLP Parsing
Two Groq models are used (`backend/services/llm_parser.py`):

```python
# Natural language text parsing
model="llama-3.1-8b-instant"

# Receipt / bill image OCR (vision)
model="meta-llama/llama-4-scout-17b-16e-instruct"
```

### Debt Minimization
Implemented in `backend/services/debt_engine.py` using two heaps (max-heap via negated values in Python's `heapq`). Runs in O(N log N) time.

### Guest Members
Guests are stored in `group_guests`. An expense can be paid by either a registered user (`paid_by`) or a guest (`paid_by_guest_id`) — enforced by a DB check constraint. Splits similarly support `user_id` or `guest_id`.

---

## Deployment

**Backend**: Render (Docker via `backend/Dockerfile`)  
**Frontend**: Netlify (`npm run build` → `frontend/dist`)

---

## License

MIT

## Contact

Built by Sai | [LinkedIn](https://linkedin.com/in/saiaswinraja)