"""Review submission route."""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from google.cloud.firestore_v1 import Increment

from ..deps import get_current_user
from ..firestore import get_db
from ..services.governance import moderate_review

router = APIRouter()
log = logging.getLogger("stadiumbite.reviews")

MAX_PHOTO_SIZE = 900_000  # ~900KB base64


class ReviewSubmission(BaseModel):
    foodIds: list[str]
    photoBase64: Optional[str] = None
    itemRatings: dict[str, int]
    overallRating: int
    feedback: Optional[str] = None


async def _run_moderation(review_id: str, feedback: str | None):
    """Background task: run ADK moderation agent and update review doc."""
    try:
        verdict = await moderate_review(feedback)
        db = get_db()
        status = "approved" if (verdict["safe"] and verdict["on_topic"]) else "flagged"
        db.collection("reviews").document(review_id).update({
            "moderation": {
                "status": status,
                "reason": verdict.get("reason"),
                "checkedAt": datetime.now(timezone.utc),
            }
        })
        log.info("Review %s moderation: %s (%s)", review_id, status, verdict.get("reason", ""))
    except Exception as e:
        log.warning("Background moderation failed for %s: %s", review_id, e)


@router.post("")
async def submit_review(
    body: ReviewSubmission,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    if not body.foodIds:
        raise HTTPException(400, "Must select at least one food")
    if body.overallRating < 1 or body.overallRating > 5:
        raise HTTPException(400, "Overall rating must be 1-5")
    for fid, rating in body.itemRatings.items():
        if rating < 1 or rating > 5:
            raise HTTPException(400, f"Rating for {fid} must be 1-5")
        if fid not in body.foodIds:
            raise HTTPException(400, f"Rating for {fid} but not in foodIds")

    if body.photoBase64 and len(body.photoBase64) > MAX_PHOTO_SIZE:
        raise HTTPException(400, "Photo too large. Please resize to 800px max.")

    db = get_db()

    # Write review + update food aggregates in a transaction
    review_ref = db.collection("reviews").document()
    review_data = {
        "userId": user["phone"],
        "foodIds": body.foodIds,
        "photoBase64": body.photoBase64,
        "itemRatings": body.itemRatings,
        "overallRating": body.overallRating,
        "feedback": body.feedback,
        "createdAt": datetime.now(timezone.utc),
        "moderation": {
            "status": "pending",  # will be updated by background moderation
            "reason": None,
            "checkedAt": None,
        },
    }

    @db.transactional
    def create_review(transaction):
        transaction.set(review_ref, review_data)

        # Update each food's aggregates
        for food_id in body.foodIds:
            food_ref = db.collection("foods").document(food_id)
            rating = body.itemRatings.get(food_id, body.overallRating)
            food_doc = food_ref.get(transaction=transaction)
            if not food_doc.exists:
                continue
            fd = food_doc.to_dict()
            new_count = fd.get("reviewCount", 0) + 1
            new_sum = fd.get("ratingSum", 0) + rating
            new_avg = new_sum / new_count
            transaction.update(food_ref, {
                "reviewCount": new_count,
                "ratingSum": new_sum,
                "ratingAvg": round(new_avg, 2),
            })

        # Increment user review count
        user_ref = db.collection("users").document(user["phone"])
        transaction.update(user_ref, {"reviewCount": Increment(1)})

    transaction = db.transaction()
    create_review(transaction)

    # Run AI moderation in background (non-blocking)
    background_tasks.add_task(_run_moderation, review_ref.id, body.feedback)

    log.info("Review %s created by %s for %s", review_ref.id, user["phone"], body.foodIds)
    return {"ok": True, "reviewId": review_ref.id}
