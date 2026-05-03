from pathlib import Path
import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .config import settings
from .routes import auth, foods, reviews, leaderboard, sse, feed, classify, admin

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("stadiumbite")

app = FastAPI(title="StadiumBite API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
async def healthz():
    return {"ok": True, "service": "stadiumbite", "version": app.version}


app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(foods.router, prefix="/api/foods", tags=["foods"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["reviews"])
app.include_router(leaderboard.router, prefix="/api/leaderboard", tags=["leaderboard"])
app.include_router(sse.router, prefix="/sse", tags=["sse"])
app.include_router(feed.router, prefix="/api/feed", tags=["feed"])
app.include_router(classify.router, prefix="/api/classify", tags=["classify"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

# SPA static mount (production build only: /app/static produced by Dockerfile)
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
if STATIC_DIR.exists():
    # Mount the entire static directory for all static assets
    app.mount("/static-files", StaticFiles(directory=STATIC_DIR), name="static-files")

    @app.api_route("/{full_path:path}", methods=["GET"], include_in_schema=False)
    async def spa_fallback(request: Request, full_path: str):
        # Try serving static file first
        static_file = STATIC_DIR / full_path
        if full_path and static_file.exists() and static_file.is_file():
            return FileResponse(static_file)
        # SPA fallback — serve index.html
        index = STATIC_DIR / "index.html"
        if not index.exists():
            raise HTTPException(404, "frontend not built")
        return FileResponse(index)
