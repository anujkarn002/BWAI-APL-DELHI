"""Seed food catalog into Firestore."""
import logging
from datetime import datetime, timezone

from .firestore import get_db

log = logging.getLogger("stadiumbite.seed")

FOODS = [
    {"slug": "vada-pav", "name": "Vada Pav", "category": "snacks", "stallName": "Stall 1", "description": "Spicy potato fritter in a bun", "tags": ["spicy", "veg"]},
    {"slug": "samosa", "name": "Samosa", "category": "snacks", "stallName": "Stall 1", "description": "Crispy fried pastry with spiced filling", "tags": ["spicy", "veg"]},
    {"slug": "bhel-puri", "name": "Bhel Puri", "category": "snacks", "stallName": "Stall 2", "description": "Puffed rice with tangy chutneys", "tags": ["tangy", "veg"]},
    {"slug": "masala-peanuts", "name": "Masala Peanuts", "category": "snacks", "stallName": "Stall 2", "description": "Roasted peanuts with spice mix", "tags": ["spicy", "veg"]},
    {"slug": "pav-bhaji", "name": "Pav Bhaji", "category": "mains", "stallName": "Stall 3", "description": "Spiced mashed vegetables with buttered bun", "tags": ["spicy", "veg"]},
    {"slug": "chole-bhature", "name": "Chole Bhature", "category": "mains", "stallName": "Stall 3", "description": "Spiced chickpeas with fried bread", "tags": ["spicy", "veg"]},
    {"slug": "biryani", "name": "Biryani", "category": "mains", "stallName": "Stall 4", "description": "Fragrant rice with spices and vegetables", "tags": ["spicy", "veg"]},
    {"slug": "paneer-tikka-roll", "name": "Paneer Tikka Roll", "category": "mains", "stallName": "Stall 4", "description": "Grilled paneer wrapped in paratha", "tags": ["spicy", "veg"]},
    {"slug": "filter-coffee", "name": "Filter Coffee", "category": "beverages", "stallName": "Stall 5", "description": "South Indian style decoction coffee", "tags": ["hot", "veg"]},
    {"slug": "masala-chai", "name": "Masala Chai", "category": "beverages", "stallName": "Stall 5", "description": "Spiced Indian tea with milk", "tags": ["hot", "veg"]},
    {"slug": "mango-mocktail", "name": "Mango Mocktail", "category": "beverages", "stallName": "Stall 6", "description": "Fresh mango blended mocktail", "tags": ["sweet", "cold", "veg"]},
    {"slug": "nimbu-pani", "name": "Nimbu Pani", "category": "beverages", "stallName": "Stall 6", "description": "Classic lemon water with salt and sugar", "tags": ["tangy", "cold", "veg"]},
    {"slug": "gulab-jamun", "name": "Gulab Jamun", "category": "desserts", "stallName": "Stall 7", "description": "Deep-fried milk dumplings in sugar syrup", "tags": ["sweet", "veg"]},
    {"slug": "kulfi", "name": "Kulfi", "category": "desserts", "stallName": "Stall 7", "description": "Traditional Indian ice cream", "tags": ["sweet", "cold", "veg"]},
    {"slug": "brownie", "name": "Brownie", "category": "desserts", "stallName": "Stall 8", "description": "Chocolate fudge brownie", "tags": ["sweet", "veg"]},
    {"slug": "jalebi", "name": "Jalebi", "category": "desserts", "stallName": "Stall 8", "description": "Crispy sweet spirals soaked in syrup", "tags": ["sweet", "veg"]},
]


def seed():
    db = get_db()
    batch = db.batch()

    for food in FOODS:
        ref = db.collection("foods").document(food["slug"])
        batch.set(ref, {
            **food,
            "id": food["slug"],
            "imageUrl": f"/foods/{food['slug']}.jpg",
            "isActive": True,
            "reviewCount": 0,
            "ratingSum": 0,
            "ratingAvg": 0,
        }, merge=True)

    batch.commit()
    log.info("Seeded %d foods", len(FOODS))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed()
    print(f"Seeded {len(FOODS)} foods.")
