"""Leaderboard routes."""
from fastapi import APIRouter, Depends

from ..deps import get_current_user
from ..firestore import get_db

router = APIRouter()

MIN_REVIEWS = 1  # minimum reviews to appear on leaderboard


@router.get("")
async def get_leaderboard(_user: dict = Depends(get_current_user)):
    db = get_db()
    foods = []
    for doc in db.collection("foods").where("isActive", "==", True).stream():
        d = doc.to_dict()
        d["id"] = doc.id
        foods.append(d)

    # Filter by minimum review count
    qualified = [f for f in foods if f.get("reviewCount", 0) >= MIN_REVIEWS]
    qualified.sort(key=lambda f: f.get("ratingAvg", 0), reverse=True)

    overall = qualified[:10]

    # By category
    by_category: dict[str, list] = {}
    for f in qualified:
        cat = f.get("category", "other")
        if cat not in by_category:
            by_category[cat] = []
        if len(by_category[cat]) < 5:
            by_category[cat].append(f)

    return {"overall": overall, "byCategory": by_category}
