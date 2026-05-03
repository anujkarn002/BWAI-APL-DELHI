"""Admin routes — review management, stats, food catalog."""
import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from ..config import settings
from ..firestore import get_db

router = APIRouter()
log = logging.getLogger("stadiumbite.admin")


def verify_admin(x_admin_key: str = Header(...)):
    """Simple admin key auth via header."""
    if x_admin_key != settings.admin_key:
        raise HTTPException(401, "Invalid admin key")
    return True


# ── Reviews ─────────────────────────────────────────────────────────────


@router.get("/reviews")
async def list_reviews(
    status: Optional[str] = Query(None, description="Filter by moderation status: pending|approved|flagged"),
    limit: int = Query(50, ge=1, le=200),
    _admin: bool = Depends(verify_admin),
):
    """List all reviews with full moderation + classification data."""
    db = get_db()
    query = db.collection("reviews").order_by("createdAt", direction="DESCENDING").limit(limit)

    docs = list(query.stream())
    reviews = []
    for doc in docs:
        d = doc.to_dict()
        mod_status = (d.get("moderation") or {}).get("status", "pending")
        if status and mod_status != status:
            continue
        reviews.append({
            "id": doc.id,
            "userId": d.get("userId"),
            "foodIds": d.get("foodIds", []),
            "itemRatings": d.get("itemRatings", {}),
            "overallRating": d.get("overallRating"),
            "feedback": d.get("feedback"),
            "hasPhoto": bool(d.get("photoBase64")),
            "createdAt": d.get("createdAt").isoformat() if d.get("createdAt") else None,
            "moderation": d.get("moderation"),
            "classification": d.get("classification"),
        })

    return {"reviews": reviews, "total": len(reviews)}


@router.delete("/reviews/{review_id}")
async def delete_review(
    review_id: str,
    _admin: bool = Depends(verify_admin),
):
    """Delete (hard-delete) a review and decrement food aggregates."""
    db = get_db()
    ref = db.collection("reviews").document(review_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(404, "Review not found")

    data = doc.to_dict()

    # Decrement food aggregates
    for food_id in data.get("foodIds", []):
        food_ref = db.collection("foods").document(food_id)
        food_doc = food_ref.get()
        if not food_doc.exists:
            continue
        fd = food_doc.to_dict()
        rating = data.get("itemRatings", {}).get(food_id, data.get("overallRating", 0))
        new_count = max(0, fd.get("reviewCount", 0) - 1)
        new_sum = max(0, fd.get("ratingSum", 0) - rating)
        new_avg = (new_sum / new_count) if new_count > 0 else 0
        food_ref.update({
            "reviewCount": new_count,
            "ratingSum": new_sum,
            "ratingAvg": round(new_avg, 2),
        })

    ref.delete()
    log.info("Admin deleted review %s", review_id)
    return {"ok": True, "deleted": review_id}


@router.patch("/reviews/{review_id}/hide")
async def hide_review(
    review_id: str,
    _admin: bool = Depends(verify_admin),
):
    """Mark a review as hidden (soft-delete)."""
    db = get_db()
    ref = db.collection("reviews").document(review_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(404, "Review not found")

    ref.update({
        "moderation": {
            **doc.to_dict().get("moderation", {}),
            "status": "hidden",
            "hiddenAt": datetime.now(timezone.utc),
        }
    })
    log.info("Admin hid review %s", review_id)
    return {"ok": True, "hidden": review_id}


# ── Stats ───────────────────────────────────────────────────────────────


@router.get("/stats")
async def get_stats(
    _admin: bool = Depends(verify_admin),
):
    """Overview stats: totals, averages, reviews-per-hour for last 24h."""
    db = get_db()

    # All reviews
    reviews = list(db.collection("reviews").stream())
    total_reviews = len(reviews)

    # Moderation breakdown
    mod_counts = {"pending": 0, "approved": 0, "flagged": 0, "hidden": 0}
    ratings = []
    hourly: dict[str, int] = {}  # ISO hour -> count
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=24)

    for doc in reviews:
        d = doc.to_dict()
        status = (d.get("moderation") or {}).get("status", "pending")
        mod_counts[status] = mod_counts.get(status, 0) + 1
        if d.get("overallRating"):
            ratings.append(d["overallRating"])
        created = d.get("createdAt")
        if created and created >= cutoff:
            hour_key = created.strftime("%Y-%m-%dT%H:00")
            hourly[hour_key] = hourly.get(hour_key, 0) + 1

    avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else 0

    # Build 24h hourly series
    hourly_series = []
    for i in range(24):
        h = (now - timedelta(hours=23 - i)).strftime("%Y-%m-%dT%H:00")
        hourly_series.append({"hour": h, "count": hourly.get(h, 0)})

    # Food count
    food_count = len(list(db.collection("foods").stream()))

    # User count
    user_count = len(list(db.collection("users").stream()))

    return {
        "totalReviews": total_reviews,
        "avgRating": avg_rating,
        "moderationCounts": mod_counts,
        "totalFoods": food_count,
        "totalUsers": user_count,
        "reviewsPerHour": hourly_series,
    }


# ── Food catalog management ────────────────────────────────────────────


@router.get("/foods")
async def list_foods(
    _admin: bool = Depends(verify_admin),
):
    """List all foods with full data."""
    db = get_db()
    docs = list(db.collection("foods").stream())
    foods = []
    for doc in docs:
        d = doc.to_dict()
        foods.append({
            "id": doc.id,
            **d,
        })
    return {"foods": foods}


class FoodUpdate(BaseModel):
    name: Optional[str] = None
    stallName: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    isActive: Optional[bool] = None


@router.patch("/foods/{food_id}")
async def update_food(
    food_id: str,
    body: FoodUpdate,
    _admin: bool = Depends(verify_admin),
):
    """Update food item fields."""
    db = get_db()
    ref = db.collection("foods").document(food_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(404, "Food not found")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")

    ref.update(updates)
    log.info("Admin updated food %s: %s", food_id, updates)
    return {"ok": True, "updated": food_id, "fields": list(updates.keys())}
