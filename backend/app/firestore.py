from google.cloud import firestore

from .config import settings

_client: firestore.Client | None = None


def get_db() -> firestore.Client:
    global _client
    if _client is None:
        _client = firestore.Client(
            project=settings.gcp_project,
            database=settings.firestore_database,
        )
    return _client
