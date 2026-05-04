"""Social feed — recent reviews with photos."""
from fastapi import APIRouter, Depends, Query

from ..deps import get_current_user
from ..firestore import get_db
from ..ratelimit import rate_limit, read_api

router = APIRouter()


@router.get("")
async def get_feed(
    limit: int = Query(default=20, le=50),
    _user: dict = Depends(get_current_user),
    _rl=Depends(rate_limit(read_api)),
):
    """Return recent reviews, prioritizing ones with photos."""
    db = get_db()

    # Get recent reviews ordered by creation time
    docs = (
        db.collection("reviews")
        .order_by("createdAt", direction="DESCENDING")
        .limit(limit)
        .stream()
    )

    # Get food names for display
    foods_cache: dict[str, str] = {}

    def get_food_name(food_id: str) -> str:
        if food_id not in foods_cache:
            fdoc = db.collection("foods").document(food_id).get()
            if fdoc.exists:
                foods_cache[food_id] = fdoc.to_dict().get("name", food_id)
            else:
                foods_cache[food_id] = food_id
        return foods_cache[food_id]

    feed = []
    for doc in docs:
        d = doc.to_dict()
        food_names = [get_food_name(fid) for fid in d.get("foodIds", [])]
        feed.append({
            "id": doc.id,
            "userId": d.get("userId", "")[:4] + "****",  # partial mask
            "photoBase64": d.get("photoBase64"),
            "foodNames": food_names,
            "itemRatings": d.get("itemRatings", {}),
            "overallRating": d.get("overallRating", 0),
            "feedback": d.get("feedback"),
            "createdAt": d.get("createdAt").isoformat() if d.get("createdAt") else None,
            "hasPhoto": d.get("photoBase64") is not None,
        })

    # Sort: photos first, then by time
    feed.sort(key=lambda x: (not x["hasPhoto"], x.get("createdAt", "") or ""), reverse=False)
    feed.sort(key=lambda x: x.get("createdAt", "") or "", reverse=True)

    return feed
