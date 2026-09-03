"""
test_engine.py

Tests the core AI engine (Architect + Screenwriter) with real API calls,
completely decoupled from Supabase and FastAPI. This is the fastest way
to answer "does our engine actually work" before wiring anything else.

Run from backend/ with the venv active:
    python test_engine.py
"""
import asyncio
import json

# Bug fix: same gap as test_grader.py - none of this script's imports
# (agents.architect, agents.forger, agents.screenwriter) ever call
# load_dotenv(), so GOOGLE_API_KEY was never actually loaded from .env
# when running this script standalone.
from dotenv import load_dotenv
load_dotenv()

from agents.architect import generate_narrative_arc
from agents.forger import forge_character
from agents.screenwriter import generate_chapter_script

# Matches the seed data in supabase_schema.sql - real, hand-verified
# facts, not LLM-invented ones. If this works, your "fact-anchored"
# claim is genuinely true for this topic.
TOPICS_DATA = [
    {
        "topic": "Cell Structure",
        "facts": (
            "1. All living things are made of cells. "
            "2. Animal cells have a nucleus, cytoplasm, cell membrane, and "
            "mitochondria but no cell wall. "
            "3. Plant cells additionally have a cell wall (cellulose), "
            "chloroplasts, and a permanent vacuole. "
            "4. The nucleus contains genetic material (DNA) and controls "
            "the cell. "
            "5. Mitochondria are the site of aerobic respiration, "
            "releasing energy."
        ),
    },
    {
        "topic": "Diffusion",
        "facts": (
            "1. Diffusion is the net movement of particles from higher to "
            "lower concentration. "
            "2. It happens because particles are in constant random "
            "motion. "
            "3. It requires no energy input from the cell. "
            "4. Rate increases with higher concentration gradient, higher "
            "temperature, shorter distance. "
            "5. Oxygen entering blood in the lungs is a real example."
        ),
    },
]

GENRE = "survival_horror"
CHARACTER_NAME = "Alex"
CHARACTER_DESC = "A curious student wearing a hoodie."


async def main():
    print("=" * 60)
    print("STEP 1: Forge character (no API call, should be instant)")
    print("=" * 60)
    character_profile = forge_character(CHARACTER_NAME, CHARACTER_DESC)
    print(json.dumps(character_profile, indent=2))
    assert character_profile["available_poses"], "No poses returned - forger.py broke."
    print("PASS: character profile has poses.\n")

    print("=" * 60)
    print("STEP 2: Architect - generate narrative arc (real Gemini call)")
    print("=" * 60)
    try:
        narrative_arc = await generate_narrative_arc(
            "Cambridge IGCSE Biology (0610)",
            TOPICS_DATA,
            GENRE,
        )
    except Exception as e:
        print(f"FAIL: Architect crashed - {e}")
        return

    print(json.dumps(narrative_arc, indent=2))
    chapters = narrative_arc.get("chapters", [])
    if len(chapters) < 2:
        print(f"WARNING: expected at least 2 chapters (one per topic), got {len(chapters)}.")
    else:
        print(f"PASS: got {len(chapters)} chapters.\n")

    print("=" * 60)
    print("STEP 3: Screenwriter - generate chapter 1 script (real Gemini call)")
    print("=" * 60)
    chapter_1 = next((c for c in chapters if c["chapter_index"] == 1), None)
    if not chapter_1:
        print("FAIL: no chapter_index == 1 in the narrative arc - check Architect's output shape.")
        return

    topic_facts = next(t["facts"] for t in TOPICS_DATA if t["topic"] == chapter_1["topic"])

    try:
        script = await generate_chapter_script(
            topic=chapter_1["topic"],
            genre=GENRE,
            character_name=CHARACTER_NAME,
            available_poses=character_profile["available_poses"],
            facts_context=topic_facts,
        )
    except Exception as e:
        print(f"FAIL: Screenwriter crashed - {e}")
        return

    print(json.dumps(script, indent=2))

    panels = script.get("panels", [])
    if len(panels) != 6:
        print(f"WARNING: expected exactly 6 panels, got {len(panels)}.")

    bad_poses = [
        p["character_pose"] for p in panels
        if p.get("character_pose") not in character_profile["available_poses"]
    ]
    if bad_poses:
        print(f"FAIL: Screenwriter used poses that don't exist: {bad_poses}")
    else:
        print("PASS: every panel uses a valid pose name.\n")

    print("=" * 60)
    print("DONE. Read through the printed JSON above and judge the actual")
    print("writing quality yourself - this script checks structure/shape,")
    print("not whether the story is any good. That call is yours.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
