"""AI Governance — review moderation using Gemini (via Vertex AI).

Uses Google ADK Agent pattern with Gemini 2.5 Flash to check review feedback for:
1. Safety (no slurs, PII, abuse)
2. On-topic (about food/dining experience)

Returns moderation verdict that updates the review document.
"""
import json
import logging
from datetime import datetime, timezone

from google import genai
from google.genai import types

from ..config import settings

log = logging.getLogger("stadiumbite.governance")

# Lazy-init client
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


MODERATION_PROMPT = """You are a content moderator for StadiumBite, a stadium food rating app.

Analyze this review feedback and return a JSON object with exactly these fields:
- "safe": boolean — true if the text contains no slurs, hate speech, personal attacks, PII (phone numbers, emails, addresses), or explicit content
- "on_topic": boolean — true if the text is about food, dining, taste, service, or the stadium food experience
- "reason": string — brief explanation of your verdict (1 sentence)

Return ONLY the JSON object, no markdown fences, no extra text.

Review feedback: "{feedback}"
"""


async def moderate_review(feedback: str | None) -> dict:
    """Run Gemini moderation on review feedback.

    Returns: {"safe": bool, "on_topic": bool, "reason": str}
    """
    if not settings.governance_enabled:
        return {"safe": True, "on_topic": True, "reason": "Governance disabled"}

    if not feedback or not feedback.strip():
        return {"safe": True, "on_topic": True, "reason": "No feedback provided"}

    try:
        client = _get_client()
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=MODERATION_PROMPT.format(feedback=feedback),
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=200,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )

        result_text = response.text.strip()
        # Strip markdown fences if present
        if "```" in result_text:
            result_text = result_text.split("```json")[-1].split("```")[0].strip()
        # Find JSON object in response
        start = result_text.find("{")
        end = result_text.rfind("}") + 1
        if start >= 0 and end > start:
            result_text = result_text[start:end]
        verdict = json.loads(result_text)
        log.info("Moderation verdict for '%s...': %s", feedback[:30], verdict)
        return {
            "safe": verdict.get("safe", True),
            "on_topic": verdict.get("on_topic", True),
            "reason": verdict.get("reason", ""),
        }

    except Exception as e:
        log.warning("Moderation failed (allowing review): %s", e)
        # Fail open — don't block reviews if AI is down
        return {"safe": True, "on_topic": True, "reason": f"Moderation error: {str(e)[:80]}"}
