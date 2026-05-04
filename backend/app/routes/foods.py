"""Food catalog routes."""
from typing import Optional

from fastapi import APIRouter, Depends

from ..deps import get_current_user
from ..firestore import get_db
from ..ratelimit import rate_limit, read_api

router = APIRouter()


@router.get("")
async def list_foods(category: Optional[str] = None, _user: dict = Depends(get_current_user), _rl=Depends(rate_limit(read_api))):
    db = get_db()
    query = db.collection("foods")
    if category:
        query = query.where("category", "==", category)
    query = query.where("isActive", "==", True)

    docs = query.stream()
    foods = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        foods.append(d)

    return foods
