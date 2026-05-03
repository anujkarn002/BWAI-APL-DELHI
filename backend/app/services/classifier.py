"""AI Food Classifier — identify food from images using Gemini Vision.

Uses Gemini 2.5 Flash (Vertex AI) to classify food images and match them
to the StadiumBite catalog stored in Firestore.
"""
import base64
import json
import logging
from typing import Optional

from google import genai
from google.genai import types

from ..config import settings
from ..firestore import get_db

log = logging.getLogger("stadiumbite.classifier")

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(
            vertexai=True,
            project=settings.gcp_project,
            location=settings.gemini_location,
        )
    return _client


def _get_catalog_slugs() -> list[str]:
    """Fetch active food slugs from Firestore."""
    db = get_db()
    docs = db.collection("foods").where("isActive", "==", True).stream()
    return [d.id for d in docs]


CLASSIFY_PROMPT = """You are a food image classifier for StadiumBite, a stadium food rating app in India.

Analyze this image and identify the food item(s). Then try to match to one of these catalog items:
{catalog}

Return ONLY a JSON object (no markdown fences) with these fields:
- "is_food": boolean — whether the image contains food
- "identified_food": string — what food you see (be specific, e.g. "Vada Pav" not just "sandwich")
- "confidence": float 0.0-1.0 — confidence in your identification
- "catalog_matches": array of objects, each with "slug" (string) and "confidence" (float 0.0-1.0), sorted by confidence descending. Empty array if no match.
- "description": string — brief 1-sentence description of the image
"""


def classify_image(photo_base64: str) -> dict:
    """Classify a food image and match to catalog.

    Args:
        photo_base64: Base64 data URI (data:image/jpeg;base64,...) or raw base64 string.

    Returns:
        dict with keys: is_food, identified_food, confidence, catalog_matches, description
    """
    # Strip data URI prefix if present
    if photo_base64.startswith("data:"):
        _, b64_data = photo_base64.split(",", 1)
    else:
        b64_data = photo_base64

    img_bytes = base64.b64decode(b64_data)

    # Determine mime type from data URI or default to jpeg
    mime_type = "image/jpeg"
    if photo_base64.startswith("data:"):
        mime_type = photo_base64.split(";")[0].split(":")[1]

    catalog_slugs = _get_catalog_slugs()

    client = _get_client()
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=[
            types.Content(
                role="user",
                parts=[
                    types.Part.from_bytes(data=img_bytes, mime_type=mime_type),
                    types.Part.from_text(
                        text=CLASSIFY_PROMPT.format(
                            catalog=json.dumps(catalog_slugs, indent=2)
                        )
                    ),
                ],
            )
        ],
        config=types.GenerateContentConfig(
            temperature=0.1,
            max_output_tokens=500,
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        ),
    )

    text = response.text.strip()
    # Strip markdown fences if present
    if "```" in text:
        text = text.split("```json")[-1].split("```")[0].strip()
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        text = text[start:end]

    result = json.loads(text)
    log.info(
        "Classified image: %s (conf=%.2f, matches=%s)",
        result.get("identified_food"),
        result.get("confidence", 0),
        [m["slug"] for m in result.get("catalog_matches", [])],
    )
    return result
