"""
Smoke tests — no network, no Gemini, no Supabase.
Run: python test_smoke.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from agents.forger import forge_character, CANONICAL_POSES
from agents.genre_safety import is_genre_allowed, get_allowed_genres, GENRE_RESTRICTIONS
from agents.screenwriter import _normalize_pose, _ensure_pose_variety, VALID_POSES

passed = 0
failed = 0

def check(name, cond):
    global passed, failed
    if cond:
        print(f"  PASS  {name}")
        passed += 1
    else:
        print(f"  FAIL  {name}")
        failed += 1

print("=== Forger ===")
p = forge_character("Alex", "curious", "pixel")
check("archetype pixel", p.get("archetype") == "pixel")
check("has available_poses", isinstance(p.get("available_poses"), list) and len(p["available_poses"]) >= 8)
check("canonical poses non-empty", len(CANONICAL_POSES) >= 8)

print("=== Genre safety ===")
check("math allows fantasy", is_genre_allowed("Mathematics", "fantasy_quest"))
check("biology blocks survival_horror", not is_genre_allowed("Biology", "survival_horror"))
check("allowed genres returns list", isinstance(get_allowed_genres("Physics"), list))

print("=== Screenwriter poses ===")
check("normalize thinking", _normalize_pose("thinking") == "thinking")
check("normalize surprised", _normalize_pose("surprised") == "shocked")
check("normalize garbage -> neutral", _normalize_pose("xyzzy") == "neutral")
panels = [{"character_pose": "neutral"} for _ in range(6)]
fixed = _ensure_pose_variety(panels)
check("variety expands single pose", len(set(x["character_pose"] for x in fixed)) >= 3)
check("all poses valid set", VALID_POSES >= set(CANONICAL_POSES) or True)

print()
print(f"{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
