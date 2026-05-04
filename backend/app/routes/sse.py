"""SSE leaderboard stream."""
import asyncio
import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, Query, HTTPException, Request
from fastapi.responses import StreamingResponse
import jwt

from ..config import settings
from ..firestore import get_db
from ..ratelimit import rate_limit, sse_connect

router = APIRouter()
log = logging.getLogger("stadiumbite.sse")


async def leaderboard_stream(user_phone: str) -> AsyncGenerator[str, None]:
    """Poll Firestore every 3 seconds and emit SSE events on change."""
    db = get_db()
    last_hash = ""

    while True:
        try:
            foods = []
            for doc in db.collection("foods").where("isActive", "==", True).stream():
                d = doc.to_dict()
                foods.append({"id": doc.id, "avg": d.get("ratingAvg", 0), "cnt": d.get("reviewCount", 0)})

            current_hash = json.dumps(sorted(foods, key=lambda x: x["id"]), default=str)
            if current_hash != last_hash:
                last_hash = current_hash
                yield f"data: {json.dumps({'type': 'update', 'ts': asyncio.get_event_loop().time()})}\n\n"
        except Exception as e:
            log.warning("SSE error: %s", e)

        await asyncio.sleep(3)


@router.get("/leaderboard")
async def sse_leaderboard(request: Request, token: str = Query(...), _=Depends(rate_limit(sse_connect))):
    """SSE endpoint. Auth via query param (EventSource doesn't support headers)."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

    return StreamingResponse(
        leaderboard_stream(payload["phone"]),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
