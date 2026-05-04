"""Review submission route."""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from google.cloud import firestore
from google.cloud.firestore_v1 import Increment

from ..deps import get_current_user
from ..firestore import get_db
from ..ratelimit import rate_limit, review_submit, review_edit, read_api
from ..services.governance import moderate_review
from ..services.classifier import classify_image

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


def _run_classification(review_id: str, photo_base64: str):
    """Background task: classify food image and update review doc."""
    try:
        result = classify_image(photo_base64)
        db = get_db()
        db.collection("reviews").document(review_id).update({
            "classification": {
                "identified_food": result.get("identified_food"),
                "confidence": result.get("confidence", 0),
                "catalog_matches": result.get("catalog_matches", []),
                "is_food": result.get("is_food", False),
                "description": result.get("description", ""),
                "classifiedAt": datetime.now(timezone.utc),
            }
        })
        log.info("Review %s classified: %s", review_id, result.get("identified_food"))
    except Exception as e:
        log.warning("Background classification failed for %s: %s", review_id, e)


@router.post("")
async def submit_review(
    body: ReviewSubmission,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    _=Depends(rate_limit(review_submit)),
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

    @firestore.transactional
    def create_review(transaction):
        # ── All reads FIRST (Firestore requires reads before writes) ──
        food_snapshots = {}
        for food_id in body.foodIds:
            food_ref = db.collection("foods").document(food_id)
            food_doc = food_ref.get(transaction=transaction)
            if food_doc.exists:
                food_snapshots[food_id] = (food_ref, food_doc.to_dict())

        # ── All writes AFTER reads ──
        transaction.set(review_ref, review_data)

        for food_id, (food_ref, fd) in food_snapshots.items():
            rating = body.itemRatings.get(food_id, body.overallRating)
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

    # Run AI image classification in background (non-blocking)
    if body.photoBase64:
        background_tasks.add_task(_run_classification, review_ref.id, body.photoBase64)

    log.info("Review %s created by %s for %s", review_ref.id, user["phone"], body.foodIds)
    return {"ok": True, "reviewId": review_ref.id}


# ── User's own reviews ──────────────────────────────────────

@router.get("/mine")
async def my_reviews(user: dict = Depends(get_current_user), _=Depends(rate_limit(read_api))):
    """Return the current user's reviews, newest first."""
    db = get_db()
    # Simple filter — sort client-side to avoid composite index requirement
    docs = (
        db.collection("reviews")
        .where("userId", "==", user["phone"])
        .limit(50)
        .stream()
    )
    reviews = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        # Don't send full base64 photo in list — just a flag
        d["hasPhoto"] = bool(d.get("photoBase64"))
        d.pop("photoBase64", None)
        reviews.append(d)
    # Sort newest first client-side
    reviews.sort(key=lambda r: r.get("createdAt", ""), reverse=True)
    return reviews


# ── Edit an existing review ─────────────────────────────────

class ReviewUpdate(BaseModel):
    itemRatings: Optional[dict[str, int]] = None
    overallRating: Optional[int] = None
    feedback: Optional[str] = None


@router.put("/{review_id}")
async def update_review(
    review_id: str,
    body: ReviewUpdate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    _=Depends(rate_limit(review_edit)),
):
    """Edit ratings/feedback on an existing review. Only the author can edit."""
    if body.overallRating is not None and not (1 <= body.overallRating <= 5):
        raise HTTPException(400, "Overall rating must be 1-5")
    if body.itemRatings:
        for fid, rating in body.itemRatings.items():
            if not (1 <= rating <= 5):
                raise HTTPException(400, f"Rating for {fid} must be 1-5")

    db = get_db()
    review_ref = db.collection("reviews").document(review_id)

    @firestore.transactional
    def do_update(transaction):
        # Read review
        review_doc = review_ref.get(transaction=transaction)
        if not review_doc.exists:
            raise HTTPException(404, "Review not found")
        old = review_doc.to_dict()

        if old["userId"] != user["phone"]:
            raise HTTPException(403, "You can only edit your own reviews")

        # Read food docs that need aggregate updates
        food_snapshots = {}
        affected_food_ids = set()
        if body.itemRatings:
            affected_food_ids = set(old.get("itemRatings", {}).keys()) | set(body.itemRatings.keys())
        for food_id in affected_food_ids:
            ref = db.collection("foods").document(food_id)
            doc = ref.get(transaction=transaction)
            if doc.exists:
                food_snapshots[food_id] = (ref, doc.to_dict())

        # ── Writes ──
        update_fields = {"updatedAt": datetime.now(timezone.utc)}

        if body.itemRatings is not None:
            # Reverse old ratings, apply new ones on food aggregates
            old_ratings = old.get("itemRatings", {})
            for food_id, (ref, fd) in food_snapshots.items():
                old_r = old_ratings.get(food_id)
                new_r = body.itemRatings.get(food_id)
                count = fd.get("reviewCount", 0)
                total = fd.get("ratingSum", 0)

                if old_r and food_id not in body.itemRatings:
                    # Food removed from review
                    count = max(0, count - 1)
                    total = max(0, total - old_r)
                elif new_r and food_id not in old_ratings:
                    # Food added to review
                    count += 1
                    total += new_r
                elif old_r and new_r and old_r != new_r:
                    # Rating changed
                    total = total - old_r + new_r

                avg = round(total / count, 2) if count > 0 else 0
                transaction.update(ref, {
                    "reviewCount": count,
                    "ratingSum": total,
                    "ratingAvg": avg,
                })

            update_fields["itemRatings"] = body.itemRatings
            update_fields["foodIds"] = list(body.itemRatings.keys())

        if body.overallRating is not None:
            update_fields["overallRating"] = body.overallRating

        if body.feedback is not None:
            update_fields["feedback"] = body.feedback
            # Re-run moderation on changed feedback
            update_fields["moderation"] = {
                "status": "pending",
                "reason": None,
                "checkedAt": None,
            }

        transaction.update(review_ref, update_fields)
        return update_fields

    transaction = db.transaction()
    result = do_update(transaction)

    # Re-moderate if feedback changed
    if body.feedback is not None:
        background_tasks.add_task(_run_moderation, review_id, body.feedback)

    log.info("Review %s updated by %s", review_id, user["phone"])
    return {"ok": True, "reviewId": review_id}
