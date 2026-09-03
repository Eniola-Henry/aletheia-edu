import uuid
from typing import List, Dict, Any, TypedDict

# Bug fix: load_dotenv() previously only existed inside
# utils/supabase_client.py, and agents/architect.py, screenwriter.py,
# and grader.py all construct their ChatGoogleGenerativeAI client at
# MODULE IMPORT time - none of those three files import
# supabase_client, so nothing in their own import chain ever triggered
# load_dotenv(). Depending on import order and whether the Gemini
# client reads its API key eagerly at construction, this could mean
# GOOGLE_API_KEY was never actually loaded from .env before it was
# needed. Explicit and first, so there's no ambiguity left.
from dotenv import load_dotenv
load_dotenv()

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI

from agents.forger import forge_character
from agents.architect import generate_narrative_arc, _get_facts_for_topic
from agents.screenwriter import generate_chapter_script
from agents.miner import get_mock_curriculum_list, get_mock_curriculum_details
from agents.grader import grade_answer
from agents.genre_safety import is_genre_allowed, get_allowed_genres
from agents.pdf_miner import mine_pdf_to_curriculum
from utils.supabase_client import supabase
from utils.retry import gemini_retry
from fastapi import UploadFile, File

app = FastAPI(title="Aletheia.edu Backend")

# Allow localhost for local dev + common Vercel/Netlify preview patterns.
# For a public hosted demo, set ALLOWED_ORIGINS env var to a comma-separated list.
import os
_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Lightweight in-memory rate limit (per IP, best-effort) ---
from collections import defaultdict
import time as _time

_rate_buckets: dict = defaultdict(list)
_RATE_MAX = 40          # requests
_RATE_WINDOW = 60.0     # seconds

@app.middleware("http")
async def simple_rate_limit(request, call_next):
    if request.url.path.startswith("/api/"):
        ip = request.client.host if request.client else "unknown"
        now = _time.time()
        bucket = _rate_buckets[ip]
        # drop old
        _rate_buckets[ip] = [t for t in bucket if now - t < _RATE_WINDOW]
        if len(_rate_buckets[ip]) >= _RATE_MAX:
            from fastapi.responses import JSONResponse
            return JSONResponse({"detail": "Too many requests — wait a moment."}, status_code=429)
        _rate_buckets[ip].append(now)
    return await call_next(request)


class GameState(TypedDict):
    session_id: str
    curriculum_id: str
    curriculum_name: str
    genre: str
    character_name: str
    character_desc: str
    character_archetype: str
    topics_list: List[str]
    topic_facts: Dict[str, str]
    topics_data_facts: List[Dict[str, Any]]
    character_profile: Dict[str, Any]
    narrative_arc: Dict[str, Any]
    is_generation_complete: bool


async def node_mine_curriculum(state: GameState):
    curr_res = (
        supabase.table("curricula")
        .select("name, topics_list, topic_facts")
        .eq("id", state["curriculum_id"])
        .single()
        .execute()
    )
    curriculum_name = curr_res.data["name"]
    topics_list = curr_res.data["topics_list"]
    print(f"Mined Curriculum: {curriculum_name}, Topics: {topics_list}")
    # topic_facts (hand-written, real facts) travels through state so
    # node_architect_story can use them instead of asking an LLM to
    # invent facts for topics we already have verified answers for.
    return {
        "curriculum_name": curriculum_name,
        "topics_list": topics_list,
        "topic_facts": curr_res.data.get("topic_facts") or {},
    }


async def node_forge_character(state: GameState):
    """No longer an API call - packages the character as data. Instant, free."""
    session_id = state["session_id"]
    character_profile = forge_character(
        state["character_name"],
        state["character_desc"],
        state.get("character_archetype", "alex"),
    )

    supabase.table("user_sessions").update({
        "character_profile_json": character_profile,
        "character_name": state["character_name"],
    }).eq("id", session_id).execute()

    return {"character_profile": character_profile}


async def node_architect_story(state: GameState):
    session_id = state["session_id"]
    topics_list = state["topics_list"]
    topic_facts = state.get("topic_facts", {})

    topics_data_facts = []
    for topic in topics_list:
        if topic in topic_facts:
            # Real, human-written facts - the honest "fact-anchored"
            # story you can actually defend to a judge.
            facts = topic_facts[topic]
        else:
            # No verified facts on file for this topic - fall back to
            # the LLM mining step. Be upfront in the pitch that these
            # topics are LLM-generated "best effort," not verified.
            facts = await _get_facts_for_topic(topic)
        topics_data_facts.append({"topic": topic, "facts": facts})

    narrative_arc = await generate_narrative_arc(
        state["curriculum_name"],
        topics_data_facts,
        state["genre"],
    )

    supabase.table("user_sessions").update({
        "narrative_arc_json": narrative_arc,
        "topics_data_facts_json": topics_data_facts,
    }).eq("id", session_id).execute()

    return {"narrative_arc": narrative_arc, "topics_data_facts": topics_data_facts}


async def generate_chapter(
    session_id: str,
    chapter_index: int,
    narrative_arc: Dict[str, Any],
    topics_data_facts: List[Dict[str, Any]],
    genre: str,
    character_name: str,
    available_poses: List[str],
) -> Dict[str, Any]:
    """
    Generates one chapter's script + Socratic question and stores it.
    Extracted from the old node_generate_chapter_one, which was
    hardcoded to chapter_index == 1 - the Council's stress test
    recommended pre-generating 2-3 chapters for the demo, which was
    literally impossible with the old code. This function takes any
    chapter_index, so a follow-up endpoint (or a manual pre-gen script)
    can call it for chapter 2, 3, etc.
    """
    chapter_data = next((c for c in narrative_arc["chapters"] if c["chapter_index"] == chapter_index), None)
    if chapter_data is None:
        raise ValueError(f"No chapter_index {chapter_index} in narrative_arc")
    topic = chapter_data["topic"]

    topic_facts_obj = next((t for t in topics_data_facts if t.get("topic") == topic), None)
    facts_string = (topic_facts_obj or {}).get("facts") or f"Key facts about {topic}."

    script = await generate_chapter_script(
        topic=topic,
        genre=genre,
        character_name=character_name,
        available_poses=available_poses,
        facts_context=facts_string,
    )

    llm_socratic = ChatGoogleGenerativeAI(model="gemini-3.5-flash", temperature=0)

    @gemini_retry
    async def _call_socratic():
        return await llm_socratic.ainvoke([
            (
                "system",
                "You are a professor grading an exam. Based strictly on the "
                "provided facts, generate one open-ended Socratic question to "
                "test understanding of the comic script below.",
            ),
            ("human", f"Facts: {facts_string}\n\nComic Script: {script}"),
        ])
    
    socratic_prompt_res = await _call_socratic()
    raw = getattr(socratic_prompt_res, "content", socratic_prompt_res)

    # Turn whatever Gemini returned into plain text
    if raw is None:
        socratic_prompt = ""
    elif isinstance(raw, str):
        socratic_prompt = raw.strip()
    elif isinstance(raw, list):
        parts = []
        for block in raw:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("text"):
                parts.append(str(block["text"]))
        socratic_prompt = "\n".join(parts).strip()
    else:
        socratic_prompt = str(raw).strip()

    # If it still looks like JSON, pull out the "text" field
    if socratic_prompt.startswith("[") or '"type"' in socratic_prompt[:80]:
        import re
        m = re.search(r'"text"\s*:\s*"((?:\\.|[^"\\])*)"', socratic_prompt)
        if m:
            socratic_prompt = m.group(1)
        socratic_prompt = re.sub(r'\{[^}]*"signature"[^}]*\}', '', socratic_prompt).strip()

    if not socratic_prompt or len(socratic_prompt) < 10:
        socratic_prompt = f"In your own words, what is the most important idea about {topic} from this chapter?"

    supabase.table("chapters").insert({
        "session_id": session_id,
        "chapter_index": chapter_index,
        "topic": topic,
        "script_json": script,
        "socratic_prompt": socratic_prompt,
    }).execute()

    return {"chapter_index": chapter_index, "topic": topic, "script": script, "socratic_prompt": socratic_prompt}


async def node_generate_chapter_one(state: GameState):
    """
    Graph entry point still only auto-generates chapter 1 on
    /api/start-learning - that's still the right scope for the demo
    (Council: "prove one loop, don't build general pre-generation
    infra"). Chapters 2+ are generated on demand via
    POST /api/session/{id}/generate-chapter/{index} - see below - for
    manual pre-verification before recording, not automatically for
    every session.
    """
    session_id = state["session_id"]
    result = await generate_chapter(
        session_id=session_id,
        chapter_index=1,
        narrative_arc=state["narrative_arc"],
        topics_data_facts=state["topics_data_facts"],
        genre=state["genre"],
        character_name=state["character_name"],
        available_poses=state["character_profile"]["available_poses"],
    )

    supabase.table("user_sessions").update({
        "story_state_json": {"unlocked_chapters": [1]},
        "is_complete": True,
    }).eq("id", session_id).execute()

    return {"is_generation_complete": True}


workflow = StateGraph(GameState)
workflow.add_node("mine_curriculum", node_mine_curriculum)
workflow.add_node("forge_character", node_forge_character)
workflow.add_node("architect_story", node_architect_story)
workflow.add_node("generate_chapter_one", node_generate_chapter_one)

workflow.set_entry_point("mine_curriculum")
workflow.add_edge("mine_curriculum", "forge_character")
workflow.add_edge("forge_character", "architect_story")
workflow.add_edge("architect_story", "generate_chapter_one")
workflow.add_edge("generate_chapter_one", END)

compiled_graph = workflow.compile()


class StartLearningRequest(BaseModel):
    user_id: str
    curriculum_id: str
    genre: str
    character_name: str
    character_desc: str
    character_archetype: str = "alex"


@app.get("/")
def read_root():
    return {"status": "Nominally Operational"}


@app.get("/api/curricula")
async def list_curricula():
    return get_mock_curriculum_list()


@app.post("/api/curricula/from-pdf")
async def create_curriculum_from_pdf(file: UploadFile = File(...)):
    """
    Upload a PDF syllabus / notes / textbook excerpt.
    We extract text, ask Gemini for 3–5 core topics + verified-style facts,
    insert a new row into curricula, and return it so the dashboard can
    immediately start a learning session from the student's own material.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a .pdf file")

    content = await file.read()
    if len(content) > 12 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="PDF too large (max 12 MB)")

    try:
        mined = await mine_pdf_to_curriculum(content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"PDF mining failed: {e}")
        raise HTTPException(status_code=500, detail=f"Could not process PDF: {e}")

    try:
        insert_res = (
            supabase.table("curricula")
            .insert({
                "name": mined["name"],
                "grade": mined["grade"],
                "subject": mined["subject"],
                "topics_list": mined["topics_list"],
                "topic_facts": mined["topic_facts"],
            })
            .execute()
        )
        row = insert_res.data[0]
    except Exception as e:
        print(f"Failed to insert curriculum: {e}")
        raise HTTPException(status_code=500, detail="Extracted topics but could not save curriculum")

    # topic_facts may be dict topic->facts; expose a clean preview list
    topics_preview = []
    tf = mined.get("topic_facts") or {}
    for topic in mined.get("topics_list") or []:
        topics_preview.append({
            "topic": topic,
            "facts_preview": (tf.get(topic) or "")[:220],
        })

    return {
        "id": row["id"],
        "name": row["name"],
        "grade": row["grade"],
        "subject": row["subject"],
        "topics_list": row["topics_list"],
        "topics_preview": topics_preview,
        "message": "Curriculum created from your PDF. Review the topics below, then forge your course.",
    }


@app.get("/api/curricula/{curriculum_id}")
async def get_curriculum(curriculum_id: str):
    return get_mock_curriculum_details(curriculum_id)


@app.get("/api/curricula/{curriculum_id}/allowed-genres")
async def get_allowed_genres_for_curriculum(curriculum_id: str):
    """
    Genre-safety guardrail, surfaced to the frontend so the dashboard
    can only show genres actually allowed for the chosen subject,
    instead of only rejecting after submit. See agents/genre_safety.py.
    """
    curr_res = (
        supabase.table("curricula")
        .select("subject")
        .eq("id", curriculum_id)
        .single()
        .execute()
    )
    if not curr_res.data:
        raise HTTPException(status_code=404, detail="Curriculum not found")
    return {"allowed_genres": get_allowed_genres(curr_res.data["subject"])}


@app.post("/api/start-learning")
async def api_start_learning(request: StartLearningRequest):
    """
    Runs the pipeline synchronously. Now that there's no image
    generation, this is just a handful of text LLM calls - fast enough
    that the polling mechanism is a safety net, not a hard requirement,
    but kept since a slow LLM response can still exceed some proxy
    timeouts.
    """
    try:
        curr_res = (
            supabase.table("curricula")
            .select("subject")
            .eq("id", request.curriculum_id)
            .single()
            .execute()
        )
        subject = curr_res.data["subject"]

        if not is_genre_allowed(subject, request.genre):
            allowed = get_allowed_genres(subject)
            raise HTTPException(
                status_code=400,
                detail=f"'{request.genre}' isn't offered for {subject} content. Allowed genres: {allowed}",
            )

        session_id = str(uuid.uuid4())

        session_data = {
            "id": session_id,
            "user_id": request.user_id,
            "curriculum_id": request.curriculum_id,
            "genre": request.genre,
            "character_name": request.character_name,
            "narrative_arc_json": {},
            "is_complete": False,
        }
        supabase.table("user_sessions").insert(session_data).execute()

        initial_state: GameState = {
            "session_id": session_id,
            "curriculum_id": request.curriculum_id,
            "curriculum_name": "",
            "genre": request.genre,
            "character_name": request.character_name,
            "character_desc": request.character_desc,
            "character_archetype": getattr(request, "character_archetype", "alex") or "alex",
            "topics_list": [],
            "topic_facts": {},
            "topics_data_facts": [],
            "character_profile": {},
            "narrative_arc": {},
            "is_generation_complete": False,
        }

        print(f"Starting session {session_id}...")
        result_state = await compiled_graph.ainvoke(initial_state)
        print(f"Session {session_id} completed: {result_state['is_generation_complete']}")

        return {
            "status": "success",
            "session_id": session_id,
            "message": "Session created and Chapter 1 generated.",
        }

    except Exception as e:
        print(f"Critical Error in /api/start-learning: {e}")
        raise HTTPException(status_code=500, detail=str(e))




@app.get("/api/users/{user_id}/sessions")
async def list_user_sessions(user_id: str):
    """Saved courses for this user — resume from the dashboard."""
    res = (
        supabase.table("user_sessions")
        .select("id, genre, character_name, character_profile_json, narrative_arc_json, story_state_json, is_complete, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(30)
        .execute()
    )
    rows = res.data or []
    out = []
    for row in rows:
        arc = row.get("narrative_arc_json") or {}
        chapters = arc.get("chapters") if isinstance(arc, dict) else []
        if not isinstance(chapters, list):
            chapters = []
        state = row.get("story_state_json") or {}
        unlocked = state.get("unlocked_chapters") or []
        profile = row.get("character_profile_json") or {}
        out.append({
            "id": row["id"],
            "genre": row.get("genre") or "",
            "character_name": row.get("character_name") or "",
            "archetype": profile.get("archetype") if isinstance(profile, dict) else "alex",
            "chapter_count": len(chapters),
            "unlocked_count": len(unlocked) if isinstance(unlocked, list) else 0,
            "is_complete": bool(row.get("is_complete")),
            "created_at": row.get("created_at"),
            "title": (chapters[0].get("topic") if chapters and isinstance(chapters[0], dict) else None)
                or row.get("character_name")
                or "Course",
        })
    return {"sessions": out}



@app.delete("/api/users/{user_id}/sessions/{session_id}")
async def delete_user_session(user_id: str, session_id: str):
    """Remove a saved course (and its chapters) for this user."""
    session_res = (
        supabase.table("user_sessions")
        .select("id, user_id")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not session_res.data:
        raise HTTPException(status_code=404, detail="Session not found")
    supabase.table("chapters").delete().eq("session_id", session_id).execute()
    supabase.table("user_sessions").delete().eq("id", session_id).execute()
    return {"status": "deleted", "session_id": session_id}


@app.get("/api/session/{session_id}")
async def get_session(session_id: str):
    """Story-map data without requiring chapter 1 to exist yet."""
    session_res = (
        supabase.table("user_sessions")
        .select("id, genre, character_name, character_profile_json, narrative_arc_json, story_state_json, is_complete")
        .eq("id", session_id)
        .execute()
    )
    if not session_res.data:
        raise HTTPException(status_code=404, detail="Session not found")
    row = session_res.data[0]
    narrative = row.get("narrative_arc_json") or {}
    if not isinstance(narrative, dict):
        narrative = {}
    if "chapters" not in narrative or not isinstance(narrative.get("chapters"), list):
        narrative = {**narrative, "chapters": narrative.get("chapters") or []}
    story_state = row.get("story_state_json") or {"unlocked_chapters": []}
    return {
        "session": {
            "id": row["id"],
            "genre": row["genre"],
            "character_name": row["character_name"],
            "character_profile": row.get("character_profile_json") or {},
            "narrative_arc": narrative,
            "is_complete": row.get("is_complete", False),
        },
        "unlocked_chapters": story_state.get("unlocked_chapters") or [],
        "chapter_scores": story_state.get("chapter_scores") or {},
        "chapter_attempts": story_state.get("chapter_attempts") or {},
    }


@app.get("/api/session/{session_id}/chapter/{index}")
async def get_chapter_content(session_id: str, index: int):
    chapter_res = (
        supabase.table("chapters")
        .select("*")
        .eq("session_id", session_id)
        .eq("chapter_index", index)
        .execute()
    )
    if not chapter_res.data:
        raise HTTPException(status_code=404, detail="Chapter not found")

    chapter_data = chapter_res.data[0]

    session_res = (
        supabase.table("user_sessions")
        .select("genre, character_name, character_profile_json, narrative_arc_json, is_complete")
        .eq("id", session_id)
        .execute()
    )
    if not session_res.data:
        raise HTTPException(status_code=404, detail="Session not found")
    session_data = session_res.data[0]

    script = chapter_data.get("script_json") or {}
    if not isinstance(script, dict):
        script = {}
    if "panels" not in script or not isinstance(script.get("panels"), list):
        script = {**script, "panels": script.get("panels") or []}

    session_profile = session_data.get("character_profile_json") or {}
    narrative = session_data.get("narrative_arc_json") or {}
    if not isinstance(narrative, dict):
        narrative = {}

    return {
        "chapter": {
            "index": chapter_data["chapter_index"],
            "topic": chapter_data["topic"],
            "script": script,
            "socratic_prompt": chapter_data.get("socratic_prompt") or "",
        },
        "session": {
            "genre": session_data.get("genre") or "",
            "character_name": session_data.get("character_name") or "",
            "character_profile": session_profile,
            "narrative_arc": narrative,
            "is_complete": session_data.get("is_complete", False),
        },
    }


@app.get("/api/session/{session_id}/status")
async def get_session_status(session_id: str):
    res = (
        supabase.table("user_sessions")
        .select("is_complete")
        .eq("id", session_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session_id": session_id, "is_complete": res.data[0]["is_complete"]}


@app.post("/api/session/{session_id}/generate-chapter/{chapter_index}")
async def api_generate_chapter(session_id: str, chapter_index: int):
    """
    Generates a chapter beyond chapter 1. Use this to manually
    pre-generate and verify chapter 2/3 for your demo curriculum BEFORE
    recording - per the Council's recommendation, this replaces the
    idea of general async pre-generation infrastructure, which isn't
    worth building for a 2-minute pre-recorded demo.
    """
    session_res = (
        supabase.table("user_sessions")
        .select("narrative_arc_json, topics_data_facts_json, genre, character_name, character_profile_json, story_state_json")
        .eq("id", session_id)
        .execute()
    )
    if not session_res.data:
        raise HTTPException(status_code=404, detail="Session not found")

    session_data = session_res.data[0]
    narrative_arc = session_data["narrative_arc_json"]
    topics_data_facts = session_data["topics_data_facts_json"]

    if not narrative_arc or not topics_data_facts:
        raise HTTPException(status_code=400, detail="Session hasn't completed initial generation yet")

    # Bug fix: this endpoint used to trust whatever chapter_index was
    # passed in, with no check against unlocked_by - only the frontend
    # gated order. A direct call (curl, Postman, a stray click before
    # the UI re-renders) could generate chapter 3 before chapter 2
    # exists. Mirrors the same check session/[id]/page.tsx does client-side.
    chapters = (narrative_arc or {}).get("chapters") or []
    if not isinstance(chapters, list):
        chapters = []
    chapter_data = next(
        (c for c in chapters if c.get("chapter_index") == chapter_index), None
    )
    if chapter_data is None:
        raise HTTPException(status_code=404, detail=f"No chapter_index {chapter_index} in this session's arc")

    story_state = session_data.get("story_state_json") or {"unlocked_chapters": []}
    unlocked_chapters = set(story_state.get("unlocked_chapters", []))
    prerequisites = chapter_data.get("unlocked_by", [])
    missing = [p for p in prerequisites if p not in unlocked_chapters]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Chapter {chapter_index} requires chapter(s) {missing} to be unlocked first",
        )

    # If chapter already exists, just unlock and return
    existing = (
        supabase.table("chapters")
        .select("chapter_index, topic")
        .eq("session_id", session_id)
        .eq("chapter_index", chapter_index)
        .execute()
    )
    if existing.data:
        story_state = session_data.get("story_state_json") or {"unlocked_chapters": []}
        unlocked = set(story_state.get("unlocked_chapters", []))
        unlocked.add(chapter_index)
        supabase.table("user_sessions").update({
            "story_state_json": {"unlocked_chapters": sorted(unlocked)},
        }).eq("id", session_id).execute()
        return {"status": "success", "chapter": existing.data[0], "already_existed": True}

    try:
        result = await generate_chapter(
            session_id=session_id,
            chapter_index=chapter_index,
            narrative_arc=narrative_arc,
            topics_data_facts=topics_data_facts,
            genre=session_data.get("genre") or "fantasy_quest",
            character_name=session_data.get("character_name") or "Alex",
            available_poses=(session_data.get("character_profile_json") or {}).get("available_poses")
            or ["neutral", "happy", "pointing", "thinking", "shocked", "sad",
                "running", "determined", "sleeping", "celebrating", "confused", "waving"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"generate_chapter failed: {e}")
        raise HTTPException(status_code=500, detail=f"Chapter generation failed: {e}")

    story_state = session_data.get("story_state_json") or {"unlocked_chapters": []}
    unlocked = set(story_state.get("unlocked_chapters", []))
    unlocked.add(chapter_index)
    supabase.table("user_sessions").update({
        "story_state_json": {"unlocked_chapters": sorted(unlocked)},
    }).eq("id", session_id).execute()

    return {"status": "success", "chapter": result}


class GradeAnswerRequest(BaseModel):
    session_id: str
    chapter_index: int
    student_answer: str


@app.post("/api/grade-answer")
async def api_grade_answer(request: GradeAnswerRequest):
    """
    Wires up the Socratic Grader (Agent 4). Now returns a rubric score
    (3 dimensions, 1-5 each) alongside qualitative feedback - see
    agents/grader.py. A judge skimming quickly sees a visible score,
    not just a paragraph of AI-generated encouragement.
    """
    chapter_res = (
        supabase.table("chapters")
        .select("topic, script_json, socratic_prompt")
        .eq("session_id", request.session_id)
        .eq("chapter_index", request.chapter_index)
        .execute()
    )
    if not chapter_res.data:
        raise HTTPException(status_code=404, detail="Chapter not found")

    chapter = chapter_res.data[0]

    # Re-fetch the canonical facts for this chapter's topic so grading
    # is checked against the same ground truth the chapter was written
    # from, not re-derived or guessed.
    session_res = (
        supabase.table("user_sessions")
        .select("topics_data_facts_json")
        .eq("id", request.session_id)
        .execute()
    )
    topics_data_facts = session_res.data[0].get("topics_data_facts_json") or []
    facts_obj = next((t for t in topics_data_facts if t["topic"] == chapter["topic"]), None)
    facts = facts_obj["facts"] if facts_obj else "No verified facts on file for this topic."

    result = await grade_answer(
        topic=chapter["topic"],
        question=chapter["socratic_prompt"],
        facts=facts,
        script=str(chapter["script_json"]),
        student_answer=request.student_answer,
    )

    # Persist mastery score + attempt into story_state_json
    try:
        sess = (
            supabase.table("user_sessions")
            .select("story_state_json")
            .eq("id", request.session_id)
            .execute()
        )
        state = (sess.data[0].get("story_state_json") if sess.data else None) or {}
        if not isinstance(state, dict):
            state = {}
        scores = state.get("chapter_scores") or {}
        attempts = state.get("chapter_attempts") or {}
        key = str(request.chapter_index)
        prev_attempts = int(attempts.get(key) or 0)
        attempts[key] = prev_attempts + 1
        avg = float(result.get("rubric_average") or 0)
        prev_best = float(scores.get(key) or 0)
        scores[key] = max(prev_best, avg)
        state["chapter_scores"] = scores
        state["chapter_attempts"] = attempts
        supabase.table("user_sessions").update({
            "story_state_json": state,
        }).eq("id", request.session_id).execute()
        result["attempt_number"] = attempts[key]
        result["best_score"] = scores[key]
    except Exception as e:
        print(f"Could not persist mastery: {e}")

    return result


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


class ExplainMoreRequest(BaseModel):
    session_id: str
    chapter_index: int
    student_answer: str = ""


@app.post("/api/explain-more")
async def api_explain_more(request: ExplainMoreRequest):
    """Short extra explanation after a weak answer — still free Gemini text."""
    chapter_res = (
        supabase.table("chapters")
        .select("topic, script_json, socratic_prompt")
        .eq("session_id", request.session_id)
        .eq("chapter_index", request.chapter_index)
        .execute()
    )
    if not chapter_res.data:
        raise HTTPException(status_code=404, detail="Chapter not found")
    chapter = chapter_res.data[0]

    session_res = (
        supabase.table("user_sessions")
        .select("topics_data_facts_json")
        .eq("id", request.session_id)
        .execute()
    )
    topics_data = []
    if session_res.data:
        topics_data = session_res.data[0].get("topics_data_facts_json") or []
    facts = ""
    for trow in topics_data:
        if isinstance(trow, dict) and trow.get("topic") == chapter.get("topic"):
            facts = trow.get("facts") or ""
            break

    llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash", temperature=0.2)

    @gemini_retry
    async def _call():
        return await llm.ainvoke([
            (
                "system",
                "You help a secondary student who almost understood a topic. "
                "In 3-5 short sentences, explain the key idea more simply. "
                "Use the facts. No bullet spam. No praise filler.",
            ),
            (
                "human",
                f"Topic: {chapter.get('topic')}\nFacts:\n{facts}\n"
                f"Question: {chapter.get('socratic_prompt')}\n"
                f"Student answer: {request.student_answer}",
            ),
        ])

    try:
        res = await _call()
        text = getattr(res, "content", None) or str(res)
    except Exception as e:
        print(f"explain-more failed: {e}")
        text = (
            "Re-read the comic captions that state the main fact. "
            "Say that fact in your own words in one sentence, then add why it matters."
        )
    return {"explanation": text}

