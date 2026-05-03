"""Test: Can Gemini 2.5 Flash classify food images and match to catalog?

Run: cd backend && python -m tests.test_image_classification
Requires: ADC configured (gcloud auth application-default login)
"""
import base64
import json
import pathlib
import sys

from google import genai
from google.genai import types

# ── Config ──────────────────────────────────────────────────────────────
PROJECT = "prototype-anuj"
LOCATION = "us-central1"
MODEL = "gemini-2.5-flash"

# Our food catalog (slugs + names)
CATALOG = [
    "vada-pav", "samosa", "bhel-puri", "masala-peanuts",
    "pav-bhaji", "chole-bhature", "biryani", "paneer-tikka-roll",
    "filter-coffee", "masala-chai", "mango-mocktail", "nimbu-pani",
    "gulab-jamun", "kulfi", "brownie", "jalebi",
]

CLASSIFY_PROMPT = """You are a food image classifier for StadiumBite, a stadium food app.

Given this image, identify the food item and try to match it to one of these catalog items:
{catalog}

Return ONLY a JSON object with these fields:
- "identified_food": string — what food you see in the image
- "confidence": float 0-1 — how confident you are in the identification
- "catalog_match": string|null — the matching catalog slug, or null if no match
- "match_confidence": float 0-1 — confidence in the catalog match (0 if no match)
- "is_food": boolean — whether the image actually contains food
- "description": string — brief description of what you see

Return ONLY the JSON object, no markdown fences.
"""

IMG_DIR = pathlib.Path(__file__).parent / "test_images"


def classify_image(client: genai.Client, image_path: pathlib.Path) -> dict:
    """Send an image to Gemini and get classification."""
    img_bytes = image_path.read_bytes()
    b64 = base64.b64encode(img_bytes).decode()

    response = client.models.generate_content(
        model=MODEL,
        contents=[
            types.Content(
                role="user",
                parts=[
                    types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"),
                    types.Part.from_text(
                        text=CLASSIFY_PROMPT.format(catalog=json.dumps(CATALOG, indent=2))
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
    # Parse JSON
    if "```" in text:
        text = text.split("```json")[-1].split("```")[0].strip()
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        text = text[start:end]
    return json.loads(text)


def main():
    print(f"Initializing Gemini client (project={PROJECT}, location={LOCATION})...")
    client = genai.Client(vertexai=True, project=PROJECT, location=LOCATION)

    # Find all real test images
    images = sorted(IMG_DIR.glob("*_real.jpg"))
    if not images:
        images = sorted(IMG_DIR.glob("*.jpg"))

    if not images:
        print("ERROR: No test images found in", IMG_DIR)
        sys.exit(1)

    print(f"Found {len(images)} test images\n")
    print("=" * 60)

    for img_path in images:
        print(f"\nClassifying: {img_path.name}")
        print("-" * 40)
        try:
            result = classify_image(client, img_path)
            print(f"  Food:           {result.get('identified_food')}")
            print(f"  Confidence:     {result.get('confidence')}")
            print(f"  Is food:        {result.get('is_food')}")
            print(f"  Catalog match:  {result.get('catalog_match')}")
            print(f"  Match conf:     {result.get('match_confidence')}")
            print(f"  Description:    {result.get('description')}")
        except Exception as e:
            print(f"  ERROR: {e}")

    print("\n" + "=" * 60)
    print("Test complete. If you see results above, Gemini vision is working!")


if __name__ == "__main__":
    main()
