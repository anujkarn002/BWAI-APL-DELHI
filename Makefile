# JWT_SECRET is loaded from backend/.env (never hardcode secrets in Makefile).
# Generate one with: openssl rand -hex 32
include backend/.env
export

.PHONY: dev-backend dev-frontend test seed seed-reviews deploy deploy-quiet logs url build

# — Local development —
dev-backend:
	cd backend && .venv/bin/uvicorn app.main:app --reload --port 8080

dev-frontend:
	cd frontend && bun run dev

test:
	cd backend && .venv/bin/python -m pytest tests/ -q

seed:
	cd backend && .venv/bin/python -m app.seed

seed-reviews:
	cd backend && .venv/bin/python -m app.seed_reviews

build:
	cd frontend && bun run build

# — Deploy —
deploy:
	gcloud run deploy stadiumbite \
		--source . \
		--region asia-south1 \
		--project prototype-anuj \
		--allow-unauthenticated \
		--set-env-vars JWT_SECRET=$(JWT_SECRET),DEMO_MASTER_OTP=999999,GCP_PROJECT=prototype-anuj,FIRESTORE_DATABASE='(default)',GEMINI_LOCATION=us-central1

deploy-quiet:
	gcloud run deploy stadiumbite \
		--source . \
		--region asia-south1 \
		--project prototype-anuj \
		--allow-unauthenticated \
		--set-env-vars JWT_SECRET=$(JWT_SECRET),DEMO_MASTER_OTP=999999,GCP_PROJECT=prototype-anuj,FIRESTORE_DATABASE='(default)',GEMINI_LOCATION=us-central1 \
		--quiet

# — Ops —
url:
	@gcloud run services describe stadiumbite --region asia-south1 --project prototype-anuj --format='value(status.url)'

logs:
	gcloud run services logs tail stadiumbite --region asia-south1 --project prototype-anuj

smoke:
	@URL=$$(gcloud run services describe stadiumbite --region asia-south1 --project prototype-anuj --format='value(status.url)') && \
	echo "Health: " && curl -s $$URL/healthz && echo && \
	echo "Auth: " && curl -s -X POST $$URL/api/auth/request-otp -H 'Content-Type: application/json' -d '{"phone":"+919999999999"}' && echo
