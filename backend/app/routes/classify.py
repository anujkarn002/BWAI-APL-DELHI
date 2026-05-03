"""Food image classification route."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..deps import get_current_user
from ..services.classifier import classify_image

router = APIRouter()
log = logging.getLogger("stadiumbite.classify")


class ClassifyRequest(BaseModel):
    photoBase64: str  # data URI or raw base64


class ClassifyResponse(BaseModel):
    is_food: bool
    identified_food: str
    confidence: float
    catalog_matches: list[dict]  # [{slug, confidence}]
    description: str


@router.post("", response_model=ClassifyResponse)
async def classify_food(
    body: ClassifyRequest,
    user: dict = Depends(get_current_user),
):
    """Classify a food image and suggest catalog matches."""
    if not body.photoBase64:
        raise HTTPException(400, "photoBase64 is required")
    if len(body.photoBase64) > 900_000:
        raise HTTPException(400, "Photo too large")

    try:
        result = classify_image(body.photoBase64)
        return ClassifyResponse(
            is_food=result.get("is_food", False),
            identified_food=result.get("identified_food", "Unknown"),
            confidence=result.get("confidence", 0),
            catalog_matches=result.get("catalog_matches", []),
            description=result.get("description", ""),
        )
    except Exception as e:
        log.error("Classification failed: %s", e)
        raise HTTPException(500, f"Classification failed: {str(e)[:100]}")
