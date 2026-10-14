"""Environment-driven settings for the path service."""
import os

from dotenv import load_dotenv

load_dotenv()

DEFAULT_MAX_STATES = 200_000


def mongo_uri() -> str:
    return os.getenv("MONGO_URI", "")


def mongo_db() -> str | None:
    """Explicit DB name; None means 'use the database named in the URI'."""
    return os.getenv("MONGO_DB") or None


def skills_collection() -> str:
    return os.getenv("SKILLS_COLLECTION", "skills")


def edges_collection() -> str:
    return os.getenv("EDGES_COLLECTION", "skilledges")


def internal_api_key() -> str:
    return os.getenv("INTERNAL_API_KEY", "")


def max_states() -> int:
    return int(os.getenv("MAX_STATES", DEFAULT_MAX_STATES))
