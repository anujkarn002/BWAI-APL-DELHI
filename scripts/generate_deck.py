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
        notes="Frame this around the audience experience at today's IPL screening.",
    ),

    # ── 3. THE SOLUTION — ARCHITECTURE FLOW ───────────────────
    DiagramSlide(
        title="How StadiumBite Works",
        subtitle="Snap. Rate. See the leaderboard update live.",
        boxes=[
            DiagramBox(label="Fan opens\nPWA", x=0.0, y=0.35, w=0.15, h=0.25,
                       shape="round", color="#e63946", text_color="#ffffff", bold=True, font_size=10),
            DiagramBox(label="Snap photo\nor pick from\ncatalog", x=0.22, y=0.35, w=0.17, h=0.25,
                       shape="round", color="#f4a261", text_color="#2b2d42", bold=True, font_size=10),
            DiagramBox(label="Rate items\n+ feedback", x=0.44, y=0.35, w=0.15, h=0.25,
                       shape="round", color="#2a9d8f", text_color="#ffffff", bold=True, font_size=10),
            DiagramBox(label="Gemini AI\nModerates", x=0.64, y=0.35, w=0.15, h=0.25,
                       shape="hexagon", color="#1d3557", text_color="#ffffff", bold=True, font_size=10),
            DiagramBox(label="Live\nLeaderboard\nupdates", x=0.84, y=0.35, w=0.16, h=0.25,
                       shape="round", color="#e63946", text_color="#ffffff", bold=True, font_size=10),
        ],
        arrows=[
            DiagramArrow(**{"from": 0, "to": 1}),
            DiagramArrow(**{"from": 1, "to": 2}),
            DiagramArrow(**{"from": 2, "to": 3, "label": "background"}),
            DiagramArrow(**{"from": 3, "to": 4, "label": "SSE push"}),
        ],
        notes="Walk through the 5-step flow left to right. Emphasize: zero page reloads, real-time SSE.",
    ),

    # ── 4. KEY FEATURES — TWO COLUMN ─────────────────────────
    TwoColSlide(
        title="Features That Matter",
        left_head="For Fans",
        right_head="For Organizers",
        left=[
            BulletItem(text="Photo-first reviews — snap and rate", level=0),
            BulletItem(text="Live leaderboard — see top picks in real time", level=0),
            BulletItem(text="PWA — install from browser, works offline", level=0),
            BulletItem(text="OTP login — no passwords, 10-second onboarding", level=0),
        ],
        right=[
            BulletItem(text="Real-time quality signal across all stalls", level=0),
            BulletItem(text="AI content moderation — no manual review needed", level=0),
            BulletItem(text="Per-item + per-category analytics", level=0),
            BulletItem(text="Single-URL deploy — works on any device instantly", level=0),
        ],
    ),

    # ── 5. AI / GEMINI INTEGRATION ────────────────────────────
    DiagramSlide(
        title="Gemini AI — The Invisible Referee",
        subtitle="Content governance that runs in the background, not in the way",
        boxes=[
            DiagramBox(label="Review\nSubmitted", x=0.05, y=0.3, w=0.18, h=0.3,
                       shape="round", color="#f4a261", text_color="#2b2d42", bold=True, font_size=11),
            DiagramBox(label="Gemini 2.5 Flash\n\nSafety check\nRelevance check\nPII detection", x=0.35, y=0.2, w=0.3, h=0.5,
                       shape="rect", color="#1d3557", text_color="#ffffff", bold=True, font_size=11),
            DiagramBox(label="Approved\n\nShown on\nleaderboard", x=0.78, y=0.1, w=0.18, h=0.3,
                       shape="round", color="#2a9d8f", text_color="#ffffff", bold=True, font_size=11),
            DiagramBox(label="Flagged\n\nHidden from\naggregates", x=0.78, y=0.55, w=0.18, h=0.3,
                       shape="round", color="#e63946", text_color="#ffffff", bold=True, font_size=11),
        ],
        arrows=[
            DiagramArrow(**{"from": 0, "to": 1, "label": "async"}),
            DiagramArrow(**{"from": 1, "to": 2, "label": "safe"}),
            DiagramArrow(**{"from": 1, "to": 3, "label": "unsafe"}),
        ],
        notes="Gemini runs as a background task — doesn't block the user. ~$0.001 per review with Flash.",
    ),

    # ── 6. TECH STACK TABLE ───────────────────────────────────
    TableSlide(
        title="Built to Ship Fast",
        subtitle="Modern stack, single Dockerfile, zero DevOps overhead",
        headers=["Layer", "Technology", "Why"],
        rows=[
            ["Frontend", "React 19 + Vite + TanStack + Tailwind", "PWA-ready, type-safe, instant HMR"],
            ["Backend", "FastAPI + Firestore + PyJWT", "Async, Pydantic validation, SSE-native"],
            ["AI", "Gemini 2.5 Flash (google-genai)", "Fast, cheap (~$0.001/call), multimodal"],
            ["Real-time", "Server-Sent Events", "One-way push, auto-reconnect, no WS overhead"],
            ["Deploy", "Cloud Run (single container)", "One URL, auto-scale, $0 at idle"],
        ],
    ),

    # ── 7. ENGAGEMENT & VALUE ─────────────────────────────────
    ContentSlide(
        title="Why This Matters",
        subtitle="Real engagement, real signal, real-time",
        bullets=[
            BulletItem(text="Turns passive spectators into active participants", level=0),
            BulletItem(text="Creates a social feedback loop — reviews drive curiosity, curiosity drives reviews", level=0),
            BulletItem(text="Stall owners can adapt mid-event based on live ratings", level=0),
            BulletItem(text="Organizers get data to negotiate better vendors next time", level=0),
            BulletItem(text="Works at any live event — concerts, expos, conferences, not just cricket", level=0),
        ],
    ),

    # ── 8. LIVE DEMO FLOW — VISUAL ───────────────────────────
    DiagramSlide(
        title="Live Demo",
        subtitle="Open your phone. Scan the QR. Rate something.",
        boxes=[
            DiagramBox(label="Scan QR\n& Install", x=0.0, y=0.3, w=0.17, h=0.35,
                       shape="round", color="#264653", text_color="#ffffff", bold=True, font_size=11),
            DiagramBox(label="Login\n+91 + OTP", x=0.22, y=0.3, w=0.17, h=0.35,
                       shape="round", color="#2a9d8f", text_color="#ffffff", bold=True, font_size=11),
            DiagramBox(label="Pick food\n& Rate", x=0.44, y=0.3, w=0.17, h=0.35,
                       shape="round", color="#e9c46a", text_color="#2b2d42", bold=True, font_size=11),
            DiagramBox(label="Watch the\nleaderboard\nupdate LIVE", x=0.70, y=0.2, w=0.28, h=0.55,
                       shape="rect", color="#e63946", text_color="#ffffff", bold=True, font_size=14),
        ],
        arrows=[
            DiagramArrow(**{"from": 0, "to": 1}),
            DiagramArrow(**{"from": 1, "to": 2}),
            DiagramArrow(**{"from": 2, "to": 3}),
        ],
        notes="This is the interactive slide. Have the leaderboard projected on screen while audience submits reviews.",
    ),

    # ── 9. CLOSE ──────────────────────────────────────────────
    EndSlide(
        title="StadiumBite — Rate. Rave. Repeat.",
    ),
]

OUT.parent.mkdir(parents=True, exist_ok=True)
render_deck(slides, brand, template, OUT)
print(f"Deck written to {OUT}")
