import json
from typing import List, Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from utils.retry import gemini_retry

# Both roles run on Gemini now - the original split (Gemini for RAG,
# Claude for creative writing) required two paid providers for no
# functional benefit; Gemini's text model handles structured creative
# generation fine via with_structured_output. temperature is set per
# call site below since one LLM instance now serves both purposes.
llm_rag = ChatGoogleGenerativeAI(model="gemini-3.5-flash", temperature=0)
llm_creative = ChatGoogleGenerativeAI(model="gemini-3.5-flash", temperature=0.7)


async def _get_facts_for_topic(topic: str) -> str:
    """
    MOCK RAG. In production this should retrieve from a vetted vector
    store (Supabase pgvector / Pinecone) of real textbooks rather than
    asking the model to be its own textbook - that's just an LLM call
    with no retrieval, which is fine for a hackathon MVP but is NOT
    RAG and you should say so honestly in the pitch, not call it RAG.
    """
    print(f"Mining facts for topic: {topic} (MOCKED - no real retrieval)...")

    system_prompt = (
        "You are an authoritative academic textbook. Provide 5 canonical, "
        "non-negotiable facts about the requested topic that must be "
        "understood for mastery. Do not hallucinate. Format as a numbered list."
    )

    @gemini_retry
    async def _call():
        return await llm_rag.ainvoke([
            ("system", system_prompt),
            ("human", f"Provide key facts for: {topic}"),
        ])

    response = await _call()
    return response.content


class NarrativeNode(BaseModel):
    chapter_index: int = Field(..., description="The week/chapter number (1, 2, 3...)")
    topic: str = Field(..., description="The curriculum topic for this chapter")
    unlocked_by: List[int] = Field(..., description="chapter_index values required to unlock this one")
    brief_summary: str = Field(..., description="A 1-sentence summary of this narrative step")


class TermNarrativeArc(BaseModel):
    curriculum_name: str
    genre: str
    chapters: List[NarrativeNode] = Field(..., description="Ordered chapters forming the story")


ARCHITECT_SYSTEM_PROMPT = """
You are an expert Instructional Designer and Creative Narrative Architect.
Take the provided list of topics (with their canonical facts) and weave
them into a single, cohesive, term-long narrative arc in the {genre} genre.

Topics and facts:
{topics_data_json}

Guidelines:
- The protagonist must face challenges tied directly to the facts.
- The story must be a Directed Acyclic Graph: chapters are sequential,
  but you may express dependencies via unlocked_by.
- Output the entire structure as JSON matching the requested schema.
"""


async def generate_narrative_arc(
    curriculum_name: str,
    topics_data: List[Dict[str, str]],
    genre: str,
) -> Dict[str, Any]:
    """
    Agent 2: The Narrative Architect.
    Takes topics_data as [{"topic": ..., "facts": ...}, ...] - already
    mined by the caller (main.py) - and structures the term-long story.
    This does NOT re-mine facts itself; that duplicate work was a bug
    in the earlier draft (two separate RAG passes over the same topics).
    """
    print(f"Architecting narrative arc for {curriculum_name} in {genre} style...")

    topics_data_json = json.dumps(topics_data, indent=2)

    prompt = ChatPromptTemplate.from_messages([
        ("system", ARCHITECT_SYSTEM_PROMPT),
        ("human", f"Design the narrative arc for: {curriculum_name}"),
    ])

    structured_llm = llm_creative.with_structured_output(TermNarrativeArc)
    chain = prompt | structured_llm

    @gemini_retry
    async def _call():
        return await chain.ainvoke({
            "genre": genre,
            "topics_data_json": topics_data_json,
        })

    arc_output = await _call()
    return arc_output.dict()
