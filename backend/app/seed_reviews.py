"""Seed fake reviews for demo leaderboard data."""
import random
import logging
from datetime import datetime, timezone

from .firestore import get_db

log = logging.getLogger("stadiumbite.seed_reviews")

DEMO_USERS = [
    "+919876543210", "+919876543211", "+919876543212",
    "+919876543213", "+919876543214", "+919876543215",
    "+919876543216", "+919876543217", "+919876543218",
    "+919876543219", "+919876543220", "+919876543221",
]

FEEDBACK_SAMPLES = [
    "Amazing taste!", "Could be better", "Best I've had at the stadium!",
    "Too spicy for me", "Perfect portion size", "Will order again!",
    "A bit cold but still tasty", "Love the flavors", "Great value for money",
    "The chai was perfect", "Biryani was top-notch!", "Needs more spice",
    None, None, None,  # some reviews without feedback
]


def seed_reviews(count: int = 40):
    db = get_db()

    # Get all active foods
    foods = []
    for doc in db.collection("foods").where("isActive", "==", True).stream():
        foods.append({"id": doc.id, **doc.to_dict()})

    if not foods:
        log.error("No foods found. Run seed.py first.")
        return

    # Ensure demo users exist
    for phone in DEMO_USERS:
        user_ref = db.collection("users").document(phone)
        if not user_ref.get().exists:
            user_ref.set({
                "phone": phone,
                "createdAt": datetime.now(timezone.utc),
                "reviewCount": 0,
            })

    # Reset food aggregates
    for food in foods:
        db.collection("foods").document(food["id"]).update({
            "reviewCount": 0, "ratingSum": 0, "ratingAvg": 0,
        })

    # Create reviews
    for i in range(count):
        user = random.choice(DEMO_USERS)
        # Pick 1-3 random foods
        num_foods = random.randint(1, 3)
        selected = random.sample(foods, min(num_foods, len(foods)))

        item_ratings = {}
        for f in selected:
            # Bias ratings: popular items get higher scores
            base = {"biryani": 4.2, "filter-coffee": 4.5, "pav-bhaji": 4.0,
                     "vada-pav": 4.3, "gulab-jamun": 4.1, "kulfi": 4.4,
                     "masala-chai": 4.3, "samosa": 3.8}.get(f["id"], 3.5)
            rating = max(1, min(5, round(base + random.uniform(-1.5, 1.0))))
            item_ratings[f["id"]] = rating

        overall = max(1, min(5, round(sum(item_ratings.values()) / len(item_ratings) + random.uniform(-0.5, 0.5))))

        review_ref = db.collection("reviews").document()
        review_ref.set({
            "userId": user,
            "foodIds": [f["id"] for f in selected],
            "photoBase64": None,
            "itemRatings": item_ratings,
            "overallRating": overall,
            "feedback": random.choice(FEEDBACK_SAMPLES),
            "createdAt": datetime.now(timezone.utc),
            "moderation": {"status": "approved", "reason": None, "checkedAt": None},
        })

        # Update food aggregates
        for f in selected:
            food_ref = db.collection("foods").document(f["id"])
            food_doc = food_ref.get().to_dict()
            new_count = food_doc.get("reviewCount", 0) + 1
            new_sum = food_doc.get("ratingSum", 0) + item_ratings[f["id"]]
            food_ref.update({
                "reviewCount": new_count,
                "ratingSum": new_sum,
                "ratingAvg": round(new_sum / new_count, 2),
            })

    log.info("Seeded %d reviews across %d foods", count, len(foods))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed_reviews()
    print(f"Done. Seeded reviews.")
