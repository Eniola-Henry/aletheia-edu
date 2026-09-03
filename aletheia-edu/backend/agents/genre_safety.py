"""
Genre safety gate.

Not an AI agent — a simple, auditable mapping so sensitive subjects
cannot be paired with flippant tones for a school-age audience.
"""

from typing import List

ALL_GENRES = [
    "survival_horror",
    "fantasy_quest",
    "sitcom",
    "historical_drama",
    "mystery_noir",
    "space_odyssey",
    "sports_drama",
    "mythic_fable",
]

# subject substring (lowercase) -> allowed genre ids
# Default: all genres allowed when subject is unknown.
GENRE_RESTRICTIONS = {
    "biology": ["fantasy_quest", "historical_drama", "mystery_noir", "space_odyssey", "mythic_fable", "sports_drama"],
    "chemistry": ["fantasy_quest", "historical_drama", "mystery_noir", "space_odyssey", "mythic_fable"],
    "physics": ["fantasy_quest", "historical_drama", "mystery_noir", "space_odyssey", "mythic_fable", "sports_drama"],
    "history": ["historical_drama", "mystery_noir", "mythic_fable", "fantasy_quest"],
    "mathematics": ["fantasy_quest", "mystery_noir", "space_odyssey", "mythic_fable", "sports_drama", "sitcom"],
}


def get_allowed_genres(subject: str) -> List[str]:
    key = (subject or "").lower()
    for subject_key, genres in GENRE_RESTRICTIONS.items():
        if subject_key in key:
            return genres
    return list(ALL_GENRES)


def is_genre_allowed(subject: str, genre: str) -> bool:
    return genre in get_allowed_genres(subject)
