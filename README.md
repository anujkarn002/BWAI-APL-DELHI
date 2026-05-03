# StadiumBite

Live food-rating PWA for **Build With AI :: Agentic Premier League** (Delhi, 3 May 2026), problem statement #4.

Audience submits food reviews (with photo or from catalog), live leaderboard updates across devices via SSE, simulated OTP login. Single Dockerfile → Cloud Run.

## Stack
- **Frontend:** React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui + TanStack Router/Query + Zustand (PWA via `vite-plugin-pwa`). **Bun only — never npm/pnpm.**
- **Backend:** Python 3.12 + FastAPI + google-cloud-firestore + PyJWT
- **Database:** Firestore Native, region `asia-south1` (Mumbai)
- **Live updates:** Server-Sent Events (FastAPI → Firestore listener)
- **Deploy:** Cloud Run (project `prototype-anuj`), single multi-stage Docker image

## Plan & status

The full plan is at `notes/plan.md` (gitignored). To resume work, read the **"Resume from here"** section at the bottom of that file. Active tickets are tracked in the agent task list.

Event details: `docs/event_details.md`.

## Local development

### Backend
```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env                          # edit values
gcloud auth application-default login         # one-time, for local Firestore
.venv/bin/uvicorn app.main:app --reload --port 8080
```

Smoke: `curl localhost:8080/healthz` → `{"ok": true, ...}`
Tests: `.venv/bin/python -m pytest tests/ -q`

### Frontend
```bash
cd frontend
bun install
bun run dev    # http://localhost:5173
```

### Combined (production-like, single container)
```bash
docker build -t stadiumbite .
docker run -p 8080:8080 \
  -e DEMO_MASTER_OTP=999999 \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  stadiumbite
```

## Deploy to Cloud Run
No local Docker required — Cloud Build builds remotely from source.

```bash
gcloud run deploy stadiumbite \
  --source . \
  --region asia-south1 \
  --project prototype-anuj \
  --allow-unauthenticated \
  --set-env-vars JWT_SECRET="$(openssl rand -hex 32)",DEMO_MASTER_OTP=999999
```

The default Compute Engine service account works for first deploy. For tighter permissions, create a dedicated SA with `roles/datastore.user` and pass `--service-account`.

## Master OTP

For the demo, **`999999`** logs in any phone number. Configurable via `DEMO_MASTER_OTP`. The `request-otp` endpoint logs the OTP to server stdout — replace with a real SMS provider (Twilio/MSG91) for production. Look for `# TODO: replace with real SMS provider` in `backend/app/services/otp.py`.

## Project structure
```
.
├── backend/                 # FastAPI app
│   ├── app/
│   │   ├── main.py          # FastAPI entrypoint, routers, SPA static mount
│   │   ├── config.py        # pydantic-settings
│   │   ├── firestore.py     # Firestore client singleton
│   │   ├── routes/          # auth, foods, reviews, leaderboard, sse
│   │   └── services/        # otp, reviews, governance
│   ├── tests/
│   └── requirements.txt
├── frontend/                # Vite + React + TS PWA
│   ├── src/
│   │   ├── routes/          # TanStack Router file-based
│   │   ├── components/
│   │   └── lib/
│   └── public/
│       ├── foods/           # food images (drop here)
│       └── sprites/         # landing sprites (drop here)
├── docs/                    # event docs (committed)
├── notes/                   # plans, problem analysis (gitignored)
├── Dockerfile               # multi-stage: Bun → Python → runtime
└── README.md
```
