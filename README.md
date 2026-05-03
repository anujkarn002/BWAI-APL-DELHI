# StadiumBite

Live food-rating PWA for stadium events. Fans snap photos, rate food, and watch a real-time leaderboard update across every device in the venue — powered by Gemini AI for content moderation and food classification.

Built for **Build With AI :: Agentic Premier League** (Delhi, 3 May 2026), Problem Statement #4.

## Demo

### AI Food Classification

[![AI Classification Demo](https://cdn.loom.com/sessions/thumbnails/10576b037949403798c5486ee1fa7b74-with-play.gif)](https://www.loom.com/share/10576b037949403798c5486ee1fa7b74)

---

## What It Does

A fan opens the app on their phone, logs in with OTP, takes a photo of their food (or picks from the catalog), rates it, and submits. Within seconds, every other device in the stadium sees the leaderboard shift. Gemini AI runs in the background — moderating reviews for safety and classifying food from photos.

No app store. No sign-up form. Just scan a QR, install the PWA, and start rating.

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Cloud Run (single container)                        │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  FastAPI (uvicorn)                             │  │
│  │  ├── /api/*          JSON REST API             │  │
│  │  ├── /sse/*          Server-Sent Events        │  │
│  │  └── /*              Static SPA (React build)  │  │
│  └──────────────┬─────────────────────────────────┘  │
│                 │                                     │
│       ┌─────────┴─────────┐                          │
│       ▼                   ▼                          │
│  ┌──────────┐     ┌──────────────┐                   │
│  │ Firestore│     │ Gemini 2.5   │                   │
│  │ (data)   │     │ Flash (AI)   │                   │
│  └──────────┘     └──────────────┘                   │
└──────────────────────────────────────────────────────┘
```

**Single container, single URL.** FastAPI serves both the API and the React SPA from one Docker image. No CORS, no separate deploys, no CDN config.

**SSE over WebSocket.** Leaderboard updates are server → client only. SSE auto-reconnects, works through Cloud Run, and needs zero extra infra.

**Backend-only Firestore.** No Firebase SDK shipped to the browser. All data access goes through FastAPI — cleaner auth, easier governance hooks, single source of truth.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind v4, TanStack Router/Query, Zustand | PWA-ready, type-safe routing, server-state cache with SSE invalidation |
| **Backend** | Python 3.12, FastAPI, Pydantic v2, PyJWT | Async-native, built-in validation, SSE via `StreamingResponse` |
| **Database** | Google Cloud Firestore (Native, `asia-south1`) | Serverless, real-time capable, transactional aggregates |
| **AI** | Gemini 2.5 Flash (`google-genai`) | Multimodal (vision + text), fast, ~$0.001/call |
| **Deploy** | Cloud Run, multi-stage Dockerfile | Auto-scale to zero, single `gcloud run deploy` |
| **Package Manager** | Bun (frontend) | Fast installs, native TS support |

---

## Features

### For Fans
- **Photo-first reviews** — Snap a photo or pick from the curated food catalog
- **AI food detection** — Gemini identifies what's in your photo and auto-selects matching items (high-confidence) or suggests them (medium-confidence)
- **Star ratings** — Rate each item individually + an overall experience score
- **Live leaderboard** — See top-rated food update in real time across all devices via SSE
- **Social feed** — Browse recent reviews with photos, filterable by type
- **PWA** — Install from the browser, works offline, feels native on mobile
- **10-second onboarding** — Phone number + OTP, no passwords

### For Organizers
- **Real-time quality signal** — Per-item and per-category rankings update live
- **AI content moderation** — Gemini checks every review for safety (abuse, PII, off-topic) in the background, flags bad content without blocking the user
- **Admin API** — Manage reviews (approve/flag/delete with aggregate rollback), edit food catalog, view stats dashboard
- **Zero DevOps** — Single Docker image, one deploy command, auto-scales on Cloud Run

### AI Integration (Gemini 2.5 Flash)
- **Content governance** — Every review's feedback text is checked for safety and relevance via a background task. Approved reviews hit the leaderboard; flagged ones are hidden from aggregates.
- **Food classification** — Photos are sent to Gemini Vision to identify food items. Results map to the catalog with confidence thresholds: >=0.75 auto-selects, >=0.4 suggests.
- **Fail-open design** — If Gemini is down, reviews are auto-approved. The app never blocks on AI.

---

## API Surface

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/request-otp` | — | Send OTP to phone (simulated, logs to stdout) |
| `POST` | `/api/auth/verify-otp` | — | Verify OTP, return JWT |
| `GET` | `/api/foods` | JWT | Food catalog (filterable by category) |
| `POST` | `/api/reviews` | JWT | Submit review with ratings + optional photo |
| `POST` | `/api/classify` | JWT | Classify food photo via Gemini Vision |
| `GET` | `/api/leaderboard` | JWT | Top foods overall + per category |
| `GET` | `/api/feed` | JWT | Recent reviews with photos |
| `GET` | `/sse/leaderboard` | JWT (query) | Real-time leaderboard stream |
| `GET` | `/api/admin/*` | Admin key | Review management, stats, food CRUD |
| `GET` | `/healthz` | — | Health check |

---

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entrypoint, routers, SPA static mount
│   │   ├── config.py            # Pydantic settings (env-based)
│   │   ├── firestore.py         # Firestore client singleton
│   │   ├── deps.py              # JWT auth dependency
│   │   ├── routes/
│   │   │   ├── auth.py          # OTP request/verify + JWT
│   │   │   ├── foods.py         # Food catalog
│   │   │   ├── reviews.py       # Review submission + transactional aggregates
│   │   │   ├── leaderboard.py   # Ranked food data
│   │   │   ├── feed.py          # Social photo feed
│   │   │   ├── classify.py      # Gemini Vision food classification
│   │   │   ├── sse.py           # Server-Sent Events for live updates
│   │   │   └── admin.py         # Admin endpoints
│   │   └── services/
│   │       ├── governance.py    # Gemini content moderation
│   │       └── classifier.py    # Gemini food image classification
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── routes/              # TanStack Router (file-based)
│   │   │   ├── __root.tsx
│   │   │   ├── index.tsx        # Landing page
│   │   │   ├── login.tsx        # OTP login
│   │   │   └── _app/
│   │   │       ├── home.tsx     # Food catalog home
│   │   │       ├── review.tsx   # Multi-step review flow
│   │   │       ├── leaderboard.tsx
│   │   │       └── feed.tsx     # Social feed
│   │   └── lib/
│   │       ├── api.ts           # Typed fetch wrapper
│   │       ├── auth-store.ts    # Zustand auth + persistence
│   │       ├── sse.ts           # SSE hook + Query invalidation
│   │       └── utils.ts
│   └── public/
│       └── foods/               # Food catalog images
├── Dockerfile                   # Multi-stage: Bun build → Python runtime
├── Makefile                     # Dev/deploy shortcuts
└── README.md
```

---

## Local Development

### Prerequisites
- Python 3.12+
- [Bun](https://bun.sh) (not npm/pnpm)
- `gcloud` CLI with ADC configured
- Firestore database created in your GCP project

### Backend
```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env              # then edit JWT_SECRET, GCP_PROJECT
gcloud auth application-default login
.venv/bin/uvicorn app.main:app --reload --port 8080
```

Smoke test: `curl localhost:8080/healthz`

### Frontend
```bash
cd frontend
bun install
bun run dev    # http://localhost:5173
```

### Tests
```bash
cd backend
.venv/bin/python -m pytest tests/ -q
```

### Docker (production-like)
```bash
docker build -t stadiumbite .
docker run -p 8080:8080 \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  -e DEMO_MASTER_OTP=999999 \
  stadiumbite
```

---

## Deploy to Cloud Run

```bash
gcloud run deploy stadiumbite \
  --source . \
  --region asia-south1 \
  --project <your-project> \
  --allow-unauthenticated \
  --set-env-vars JWT_SECRET="$(openssl rand -hex 32)",DEMO_MASTER_OTP=999999
```

The default Compute Engine SA works. For tighter permissions, create a dedicated SA with `roles/datastore.user`.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | **Yes** (prod) | Auto-generated in dev | HMAC key for JWT signing. Generate with `openssl rand -hex 32` |
| `DEMO_MASTER_OTP` | No | `999999` | Universal OTP for demo login |
| `GCP_PROJECT` | No | `prototype-anuj` | Google Cloud project ID |
| `FIRESTORE_DATABASE` | No | `(default)` | Firestore database name |
| `GOVERNANCE_ENABLED` | No | `true` | Enable Gemini content moderation |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model for AI features |

---

## Roadmap

### Near-term
- [ ] **Admin dashboard UI** — React-based admin panel for review moderation, food catalog CRUD, and event stats
- [ ] **Rate limiting** — Throttle OTP requests and review submissions to prevent abuse
- [ ] **OTP expiry** — Enforce 5-minute TTL on OTP codes
- [ ] **Pagination** — Add cursor-based pagination on feed and catalog endpoints
- [ ] **Frontend testing** — Vitest + Testing Library for component and store tests
- [ ] **Expanded backend tests** — Coverage for reviews, leaderboard, governance, and SSE

### Future
- [ ] **Offline review queue** — IndexedDB queue with background sync for spotty venue WiFi
- [ ] **Event recap (Gemini)** — AI-generated summary of top picks, surprise hits, and things to avoid
- [ ] **Multi-event support** — Namespace data per event, reuse the platform across venues
- [ ] **Photo gallery per food** — Browse user-submitted photos on each food's detail page
- [ ] **Anti-spam** — Server-side enforcement: 1 review per food per user per hour
- [ ] **Real SMS provider** — Replace simulated OTP with Twilio or MSG91

---

## License

Built for a hackathon. Not licensed for production use without review.
