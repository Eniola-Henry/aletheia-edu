"""
Agent 3: The Screenwriter.

Writes a 6-panel educational comic script.
Pose choice is NOT decorative — it must match the learning beat
and emotional reaction to the topic/facts in that panel.
"""

import json
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

VALID_POSES = {
    "neutral", "happy", "pointing", "thinking",
    "shocked", "sad", "running", "determined",
    "sleeping", "celebrating", "confused", "waving",
}


class ComicPanel(BaseModel):
    panel_number: int = Field(..., description="Panel number 1-6")
    caption: Optional[str] = Field(None, description="Narrative caption")
    dialogue: Optional[str] = Field(None, description="Character dialogue")
    character_pose: str = Field(
        ...,
        description="Exact pose name from the allowed list. Must match the emotional/learning beat of this panel.",
    )
    visual_description: str = Field(
        ...,
        description="What is happening visually, including how the character feels about the idea being taught",
    )


class ChapterScript(BaseModel):
    chapter_index: int
    topic: str
    panels: List[ComicPanel] = Field(..., max_length=6)


SCREENWRITER_SYSTEM_PROMPT = """
You are an expert educational comic writer.

Write a 6-panel comic that teaches the topic through story, starring {character_name},
in the {genre} genre.

═══════════════════════════════════════
POSE = REACTION TO THE LEARNING BEAT
═══════════════════════════════════════
character_pose is mandatory and must reflect how the character FEELS about
the idea in THAT panel — based on the facts and the teaching moment.

Allowed poses ONLY (exact spelling):
{available_poses_json}

Meaning of each pose (use these meanings):
- neutral     → calm setup, stating a basic fact
- thinking    → working through a concept, pausing to understand
- confused    → stuck, misconception, or first encounter with something hard
- shocked     → surprising fact or "I never knew that"
- pointing    → explaining / highlighting a key fact to the reader
- determined  → pushing through difficulty, resolving to learn
- happy       → something clicks, small win
- celebrating → mastery moment, end-of-chapter victory
- sad         → consequence, loss, or serious historical weight (use sparingly)
- running     → urgency, chase, kinetic energy (sports / action genres)
- waving      → greeting, invitation into the topic (often panel 1)
- sleeping    → only if the story truly needs exhaustion/inattention (rare)

Typical 6-panel emotional arc for learning (adapt to facts, do not copy blindly):
1. Invite / setup          → waving or neutral
2. Meet the core idea     → thinking or pointing
3. Struggle or surprise   → confused or shocked
4. Work the idea harder   → determined or thinking
5. Key insight lands      → happy or pointing
6. Resolve / own it       → celebrating or determined

Genre still shapes HOW they react (dialogue + captions), not whether they react:
- survival_horror: tension; determined/shocked more than happy
- fantasy_quest: wonder; thinking → determined → celebrating
- sitcom: awkward; confused → happy corrections
- historical_drama: weight; neutral/sad/determined — respectful
- mystery_noir: clues; thinking/pointing/shocked on reveals
- space_odyssey: awe; shocked/thinking/pointing
- sports_drama: effort; running/determined/celebrating
- mythic_fable: lesson; thinking → determined → neutral/celebrating

═══════════════════════════════════════
FACTS (do not invent beyond these)
═══════════════════════════════════════
{facts_context}

═══════════════════════════════════════
RULES
═══════════════════════════════════════
- Exactly 6 panels.
- The comic MUST teach the topic using the facts above.
- Every character_pose MUST be one of the allowed pose names.
- Do NOT use the same pose for all 6 panels.
- visual_description must mention the character's reaction (e.g. "looks confused at the diagram").
- Captions = narration; dialogue = character voice in genre tone.
- Keep language clear for secondary students.
"""


def _normalize_pose(pose: str) -> str:
    p = (pose or "").strip().lower().replace(" ", "_")
    if p in VALID_POSES:
        return p
    # soft aliases
    aliases = {
        "smile": "happy",
        "smiling": "happy",
        "joy": "happy",
        "excited": "celebrating",
        "celebrate": "celebrating",
        "fist": "determined",
        "angry": "determined",
        "surprise": "shocked",
        "surprised": "shocked",
        "think": "thinking",
        "point": "pointing",
        "wave": "waving",
        "run": "running",
        "sadness": "sad",
        "confused_look": "confused",
    }
    return aliases.get(p, "neutral")


def _ensure_pose_variety(panels: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """If the model collapsed to one pose, nudge a simple learning arc."""
    if not panels:
        return panels
    poses = [p.get("character_pose") for p in panels]
    if len(set(poses)) >= 3:
        return panels
    fallback_arc = ["waving", "thinking", "confused", "determined", "happy", "celebrating"]
    for i, panel in enumerate(panels):
        if i < len(fallback_arc):
            panel["character_pose"] = fallback_arc[i]
    return panels


async def generate_chapter_script(
    topic: str,
    genre: str,
    character_name: str,
    available_poses: List[str],
    facts_context: str = "",
) -> Dict[str, Any]:
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.prompts import ChatPromptTemplate
    from utils.retry import gemini_retry

    llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash", temperature=0.2)
    print(f"Writing script for {topic} in {genre} style for {character_name}...")

    available_poses_json = json.dumps(available_poses, indent=2)

    prompt = ChatPromptTemplate.from_messages([
        ("system", SCREENWRITER_SYSTEM_PROMPT),
        (
            "human",
            "Write a 6-panel comic that teaches this topic and matches "
            "each panel's character_pose to the learning emotion of that beat:\n\n{topic}",
        ),
    ])

    structured_llm = llm.with_structured_output(ChapterScript)
    chain = prompt | structured_llm

    @gemini_retry
    async def _call():
        return await chain.ainvoke({
            "topic": topic,
            "genre": genre,
            "character_name": character_name,
            "available_poses_json": available_poses_json,
            "facts_context": facts_context or "No facts provided — stay simple and accurate.",
        })

    script_output = await _call()
    data = script_output.dict()

    # Normalize + diversify poses so the frontend never gets garbage
    panels = data.get("panels") or []
    for panel in panels:
        panel["character_pose"] = _normalize_pose(panel.get("character_pose", "neutral"))
    data["panels"] = _ensure_pose_variety(panels)

    return data
