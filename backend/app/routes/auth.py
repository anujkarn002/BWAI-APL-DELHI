"""Auth routes — simulated OTP login."""
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import jwt

from ..config import settings
from ..firestore import get_db
from ..ratelimit import rate_limit, auth_otp_request, auth_otp_verify

router = APIRouter()
log = logging.getLogger("stadiumbite.auth")


class RequestOTPBody(BaseModel):
    phone: str


class VerifyOTPBody(BaseModel):
    phone: str
    otp: str


@router.post("/request-otp")
async def request_otp(body: RequestOTPBody, _=Depends(rate_limit(auth_otp_request))):
    """Simulate sending an OTP. Logs it to stdout."""
    otp = str(uuid.uuid4().int)[:6]  # random 6-digit
    db = get_db()

    # Store OTP in Firestore with TTL (5 min)
    db.collection("otps").document(body.phone).set({
        "otp": otp,
        "createdAt": datetime.now(timezone.utc),
    })

    # TODO: replace with real SMS provider (Twilio/MSG91)
    log.info("OTP for %s: %s", body.phone, otp)

    return {"ok": True, "message": "OTP sent (check server logs for demo)"}


@router.post("/verify-otp")
async def verify_otp(body: VerifyOTPBody, _=Depends(rate_limit(auth_otp_verify))):
    """Verify OTP (or accept master OTP) and return JWT."""
    db = get_db()
    is_valid = False

    # Check master OTP first
    if body.otp == settings.demo_master_otp:
        is_valid = True
    else:
        # Check Firestore OTP
        doc = db.collection("otps").document(body.phone).get()
        if doc.exists:
            stored = doc.to_dict()
            if stored and stored.get("otp") == body.otp:
                is_valid = True
                # Delete used OTP
                db.collection("otps").document(body.phone).delete()

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid OTP")

    # Upsert user
    user_ref = db.collection("users").document(body.phone)
    user_doc = user_ref.get()
    if not user_doc.exists:
        user_ref.set({
            "phone": body.phone,
            "createdAt": datetime.now(timezone.utc),
            "reviewCount": 0,
        })

    # Mint JWT
    token = jwt.encode(
        {
            "sub": body.phone,
            "phone": body.phone,
            "exp": datetime.now(timezone.utc).timestamp() + settings.jwt_ttl_seconds,
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )

    return {"token": token, "user_id": body.phone}
