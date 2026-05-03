#!/usr/bin/env python3
"""Generate the StadiumBite pitch deck using docforge.

Usage:
    cd /home/hash/work/lab/ai-coworker/docforge
    uv run python /home/hash/work/lab/BWAI-APL_DELHI/scripts/generate_deck.py
"""

from pathlib import Path

from docforge.render.pptx import render_deck
from docforge.schemas import BrandConfig
from docforge.schemas.slide import (
    BulletItem,
    ContentSlide,
    CoverSlide,
    DiagramSlide,
    EndSlide,
    SectionSlide,
    TableSlide,
    TwoColSlide,
)
from docforge.schemas.diagram import DiagramArrow, DiagramBox
from docforge.templates import TemplateRegistry

OUT = Path(__file__).resolve().parent.parent / "docs" / "stadiumbite-deck.pptx"

brand = BrandConfig.load("stadiumbite")
registry = TemplateRegistry()
template = registry.get("executive")

slides = [
    # ── 1. COVER ──────────────────────────────────────────────
    CoverSlide(
        title="StadiumBite",
        subtitle="Live food ratings from the stands — powered by Gemini AI",
        date="3 May 2026",
        prepared_for="Build With AI :: Agentic Premier League, Delhi",
    ),

    # ── 2. THE PROBLEM ────────────────────────────────────────
    ContentSlide(
        title="The Problem",
        subtitle="Stadium food is a gamble",
        bullets=[
            BulletItem(text="30,000+ fans. 20+ food stalls. Zero transparency.", level=0),
            BulletItem(text="No way to know what's good before you queue 15 minutes", level=0),
            BulletItem(text="Stall owners get no real-time feedback to improve", level=0),
            BulletItem(text="Organizers are blind to food quality during the event", level=0),
        ],
        notes="Frame this around the audience experience at today's event.",
    ),

    # ── 3. THE SOLUTION — HOW IT WORKS ────────────────────────
    DiagramSlide(
        title="How StadiumBite Works",
        subtitle="Scan → Snap → Rate → Live leaderboard. Under 10 seconds.",
        boxes=[
            DiagramBox(label="Scan QR\n& Open PWA", x=0.0, y=0.35, w=0.15, h=0.25,
                       shape="round", color="#D32F2F", text_color="#ffffff", bold=True, font_size=10),
            DiagramBox(label="OTP Login\n10 seconds", x=0.22, y=0.35, w=0.15, h=0.25,
                       shape="round", color="#FF6F00", text_color="#ffffff", bold=True, font_size=10),
            DiagramBox(label="Snap photo\nAI detects\nfood item", x=0.42, y=0.35, w=0.17, h=0.25,
                       shape="round", color="#00897B", text_color="#ffffff", bold=True, font_size=10),
            DiagramBox(label="Rate &\nReview", x=0.64, y=0.35, w=0.13, h=0.25,
                       shape="round", color="#1565C0", text_color="#ffffff", bold=True, font_size=10),
            DiagramBox(label="Live\nLeaderboard\nupdates", x=0.82, y=0.35, w=0.16, h=0.25,
                       shape="round", color="#D32F2F", text_color="#ffffff", bold=True, font_size=10),
        ],
        arrows=[
            DiagramArrow(**{"from": 0, "to": 1}),
            DiagramArrow(**{"from": 1, "to": 2, "label": "Gemini Vision"}),
            DiagramArrow(**{"from": 2, "to": 3}),
            DiagramArrow(**{"from": 3, "to": 4, "label": "SSE push"}),
        ],
        notes="Walk through the 5-step flow left to right. Emphasize: AI food detection happens at step 3, SSE push is real-time.",
    ),

    # ── 4. GEMINI AI — TWO PILLARS ───────────────────────────
    SectionSlide(
        title="Gemini AI Integration",
    ),

    # ── 5. AI FOOD CLASSIFICATION ─────────────────────────────
    DiagramSlide(
        title="AI Food Classification",
        subtitle="Gemini Vision identifies food from photos — no manual search needed",
        boxes=[
            DiagramBox(label="Fan uploads\nfood photo", x=0.02, y=0.3, w=0.18, h=0.3,
                       shape="round", color="#FF6F00", text_color="#ffffff", bold=True, font_size=10),
            DiagramBox(label="Gemini 2.5 Flash\nVision API\n\nthinking_budget=0\n(fast + cheap)", x=0.28, y=0.2, w=0.25, h=0.5,
                       shape="rect", color="#1A237E", text_color="#ffffff", bold=True, font_size=10),
            DiagramBox(label="≥75%\nconfidence\n→ auto-select", x=0.62, y=0.1, w=0.18, h=0.3,
                       shape="round", color="#00897B", text_color="#ffffff", bold=True, font_size=10),
            DiagramBox(label="≥40%\nconfidence\n→ suggestions", x=0.62, y=0.55, w=0.18, h=0.3,
                       shape="round", color="#F9A825", text_color="#212121", bold=True, font_size=10),
            DiagramBox(label="Not food?\n→ manual\nselection", x=0.84, y=0.35, w=0.15, h=0.25,
                       shape="round", color="#757575", text_color="#ffffff", bold=True, font_size=10),
        ],
        arrows=[
            DiagramArrow(**{"from": 0, "to": 1}),
            DiagramArrow(**{"from": 1, "to": 2, "label": "high match"}),
            DiagramArrow(**{"from": 1, "to": 3, "label": "partial match"}),
            DiagramArrow(**{"from": 1, "to": 4, "label": "no match"}),
        ],
        notes="Two-tier confidence matching. Also detects image quality (good/acceptable/poor) and warns user.",
    ),

    # ── 6. AI CONTENT MODERATION ──────────────────────────────
    DiagramSlide(
        title="AI Content Moderation",
        subtitle="Every review checked for safety, abuse, and PII — without blocking the user",
        boxes=[
            DiagramBox(label="Review\nsubmitted", x=0.05, y=0.3, w=0.18, h=0.3,
                       shape="round", color="#FF6F00", text_color="#ffffff", bold=True, font_size=11),
            DiagramBox(label="Gemini 2.5 Flash\n\nSafety check\nRelevance check\nPII detection", x=0.33, y=0.2, w=0.28, h=0.5,
                       shape="rect", color="#1A237E", text_color="#ffffff", bold=True, font_size=11),
            DiagramBox(label="Approved\n→ Leaderboard\n& Feed", x=0.72, y=0.1, w=0.22, h=0.3,
                       shape="round", color="#00897B", text_color="#ffffff", bold=True, font_size=11),
            DiagramBox(label="Flagged\n→ Hidden from\naggregates", x=0.72, y=0.55, w=0.22, h=0.3,
                       shape="round", color="#D32F2F", text_color="#ffffff", bold=True, font_size=11),
        ],
        arrows=[
            DiagramArrow(**{"from": 0, "to": 1, "label": "async background"}),
            DiagramArrow(**{"from": 1, "to": 2, "label": "safe"}),
            DiagramArrow(**{"from": 1, "to": 3, "label": "unsafe"}),
        ],
        notes="Fail-open design: if Gemini is down, reviews auto-approve. ~$0.001 per call with thinking_budget=0.",
    ),

    # ── 7. KEY FEATURES — TWO COLUMN ─────────────────────────
    TwoColSlide(
        title="Features That Matter",
        left_head="For Fans",
        right_head="For Organizers",
        left=[
            BulletItem(text="Photo-first reviews — snap and AI identifies the food", level=0),
            BulletItem(text="Live leaderboard — top picks update in real time via SSE", level=0),
            BulletItem(text="Social feed — browse reviews with photos, filter by type", level=0),
            BulletItem(text="PWA — install from browser, no app store needed", level=0),
            BulletItem(text="OTP login — no passwords, 10-second onboarding", level=0),
        ],
        right=[
            BulletItem(text="Real-time quality signal across all stalls", level=0),
            BulletItem(text="AI moderation — no manual review queue", level=0),
            BulletItem(text="Admin dashboard — stats, charts, review management", level=0),
            BulletItem(text="Food catalog CRUD — manage stalls and items live", level=0),
            BulletItem(text="Single-URL deploy — one container, zero DevOps", level=0),
        ],
    ),

    # ── 8. SOCIAL FEED & ADMIN DASHBOARD ──────────────────────
    TwoColSlide(
        title="Beyond Ratings",
        left_head="Social Feed",
        right_head="Admin Dashboard",
        left=[
            BulletItem(text="Photo-first sorting — images surface first", level=0),
            BulletItem(text="Three filter tabs: All, Photos, Text-only", level=0),
            BulletItem(text="Lazy-loaded with fade-in animations", level=0),
            BulletItem(text="Auto-refresh every 30 seconds", level=0),
            BulletItem(text="Privacy-safe — user IDs masked (1234****)", level=0),
        ],
        right=[
            BulletItem(text="Stats panel: reviews, avg rating, users, foods", level=0),
            BulletItem(text="Moderation breakdown: pending/approved/flagged", level=0),
            BulletItem(text="24-hour reviews-per-hour bar chart", level=0),
            BulletItem(text="Review management: hide or hard-delete with aggregate rollback", level=0),
            BulletItem(text="Inline food catalog editing", level=0),
        ],
    ),

    # ── 9. TECH STACK TABLE ───────────────────────────────────
    TableSlide(
        title="Built to Ship Fast",
        subtitle="Modern stack, single Dockerfile, zero DevOps overhead",
        headers=["Layer", "Technology", "Why"],
        rows=[
            ["Frontend", "React 19 + Vite + TanStack + Tailwind", "PWA-ready, type-safe, instant HMR"],
            ["Backend", "FastAPI + Firestore + PyJWT", "Async, Pydantic validation, SSE-native"],
            ["AI", "Gemini 2.5 Flash (google-genai)", "Vision + text, ~$0.001/call, thinking_budget=0"],
            ["Real-time", "Server-Sent Events (SSE)", "One-way push, auto-reconnect, no WS overhead"],
            ["Deploy", "Cloud Run (single container)", "API + SPA in one, auto-scale, $0 at idle"],
        ],
    ),

    # ── 10. ENGINEERING HIGHLIGHTS ────────────────────────────
    ContentSlide(
        title="Engineering Decisions",
        subtitle="Built for stadium conditions — unreliable WiFi, thousands of concurrent users",
        bullets=[
            BulletItem(text="**Firestore transactions** — review + aggregates + user count in one atomic op", level=0),
            BulletItem(text="**Client-side image resize** — 800px max, 0.7 JPEG quality before upload (stadium WiFi)", level=0),
            BulletItem(text="**Fail-open AI** — if Gemini is down, reviews auto-approve. Reliability > strictness", level=0),
            BulletItem(text="**SSE with hash diffing** — only pushes when data actually changes, not on every poll", level=0),
            BulletItem(text="**Transactional aggregate rollback** — admin deletes correctly decrement all counters", level=0),
            BulletItem(text="**SPA fallback serving** — FastAPI serves static files + catch-all for client routing", level=0),
        ],
    ),

    # ── 11. WHY THIS MATTERS ──────────────────────────────────
    ContentSlide(
        title="Why This Matters",
        subtitle="Real engagement, real signal, real-time",
        bullets=[
            BulletItem(text="Turns passive spectators into active participants", level=0),
            BulletItem(text="Social feedback loop — reviews drive curiosity, curiosity drives reviews", level=0),
            BulletItem(text="Stall owners can adapt mid-event based on live ratings", level=0),
            BulletItem(text="Organizers get data to negotiate better vendors next time", level=0),
            BulletItem(text="Works at any live event — concerts, expos, conferences, not just cricket", level=0),
        ],
    ),

    # ── 12. LIVE DEMO ────────────────────────────────────────
    DiagramSlide(
        title="Live Demo",
        subtitle="Open your phone. Scan the QR. Rate something.",
        boxes=[
            DiagramBox(label="Scan QR\n& Install", x=0.0, y=0.3, w=0.17, h=0.35,
                       shape="round", color="#1A237E", text_color="#ffffff", bold=True, font_size=11),
            DiagramBox(label="Login\n+91 + OTP", x=0.22, y=0.3, w=0.17, h=0.35,
                       shape="round", color="#00897B", text_color="#ffffff", bold=True, font_size=11),
            DiagramBox(label="Snap food\nAI classifies", x=0.44, y=0.3, w=0.17, h=0.35,
                       shape="round", color="#F9A825", text_color="#212121", bold=True, font_size=11),
            DiagramBox(label="Watch the\nleaderboard\nupdate LIVE", x=0.70, y=0.2, w=0.28, h=0.55,
                       shape="rect", color="#D32F2F", text_color="#ffffff", bold=True, font_size=14),
        ],
        arrows=[
            DiagramArrow(**{"from": 0, "to": 1}),
            DiagramArrow(**{"from": 1, "to": 2}),
            DiagramArrow(**{"from": 2, "to": 3}),
        ],
        notes="Interactive slide. Project leaderboard on screen while audience submits reviews. Demo OTP: 999999.",
    ),

    # ── 13. CLOSE ─────────────────────────────────────────────
    EndSlide(
        title="StadiumBite — Rate. Rave. Repeat.",
    ),
]

OUT.parent.mkdir(parents=True, exist_ok=True)
render_deck(slides, brand, template, OUT)
print(f"Deck written to {OUT}")
