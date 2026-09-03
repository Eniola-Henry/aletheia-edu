"""
Agent 0: The Character Forger (code-rendered version).

Character is defined as structured data that the frontend renders as a
parametrized black-and-white SVG. Five fixed archetypes guarantee
perfect consistency across every panel.
"""

from typing import Dict, Any

CANONICAL_POSES = [
    "neutral", "happy", "pointing", "thinking",
    "shocked", "sad", "running", "determined",
    "sleeping", "celebrating", "confused", "waving",
]

VALID_ARCHETYPES = {"alex", "jordan", "sam", "riley", "pixel"}


def forge_character(
    character_name: str,
    character_desc: str,
    archetype: str = "alex",
) -> Dict[str, Any]:
    """
    Packages the character's identity for the frontend SVG renderer.
    archetype must be one of: alex | jordan | sam | riley | pixel
    """
    print(f"Defining character: {character_name} ({archetype}) — {character_desc}")

    if archetype not in VALID_ARCHETYPES:
        archetype = "alex"

    return {
        "name": character_name,
        "description": character_desc,
        "archetype": archetype,
        "available_poses": CANONICAL_POSES,
    }
