"""
PDF Curriculum Miner — extract educational topics + key facts from an
uploaded PDF so any syllabus/notes document can become a comic course.

Design: extract text with pypdf → ask Gemini for 3–5 core topics and
5 canonical facts each → return structured data ready to insert into
the curricula table (or use ephemerally).
"""

from typing import List, Dict, Any
from io import BytesIO
from pypdf import PdfReader
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field
from utils.retry import gemini_retry

llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash", temperature=0)


class TopicFacts(BaseModel):
    topic: str = Field(..., description="Short topic title, e.g. 'Cell Structure'")
    facts: str = Field(
        ...,
        description="Exactly 5 numbered canonical facts about the topic, suitable for secondary students",
    )


class ExtractedCurriculum(BaseModel):
    name: str = Field(..., description="Suggested curriculum name based on the document")
    subject: str = Field(..., description="Broad subject, e.g. Biology, Physics, History, Mathematics")
    grade: str = Field(..., description="Estimated grade level, e.g. 'Grade 10-11'")
    topics: List[TopicFacts] = Field(..., min_length=2, max_length=6)


def extract_text_from_pdf(file_bytes: bytes, max_pages: int = 25) -> str:
    """Pull text from the first max_pages of a PDF. Truncate very long docs."""
    reader = PdfReader(BytesIO(file_bytes))
    pages = reader.pages[:max_pages]
    chunks = []
    for page in pages:
        try:
            text = page.extract_text() or ""
            if text.strip():
                chunks.append(text)
        except Exception:
            continue
    full = "\n\n".join(chunks)
    # Hard cap so we stay within free-tier context comfort
    if len(full) > 60000:
        full = full[:60000] + "\n\n[... truncated for length ...]"
    return full


EXTRACT_PROMPT = """
You are an expert curriculum designer. You are given text extracted from a
student's PDF (notes, textbook chapter, or syllabus).

Your job:
1. Infer a short curriculum name, subject area, and approximate grade level.
2. Identify 3 to 5 core teachable topics that appear in the text.
3. For each topic write exactly 5 clear, numbered, non-negotiable facts
   that a secondary-school student must master. Prefer facts that are
   explicitly supported by the document; do not invent advanced material
   that is not present.

Return structured JSON matching the schema.
"""


async def mine_pdf_to_curriculum(file_bytes: bytes) -> Dict[str, Any]:
    text = extract_text_from_pdf(file_bytes)
    if len(text.strip()) < 80:
        raise ValueError("Could not extract enough text from this PDF. Use a text-based PDF (not a scanned image). Image-only scans need OCR, which is not on the free path.")

    structured = llm.with_structured_output(ExtractedCurriculum)

    @gemini_retry
    async def _call():
        return await structured.ainvoke([
            ("system", EXTRACT_PROMPT),
            ("human", f"Document text:\n\n{text[:50000]}"),
        ])

    result: ExtractedCurriculum = await _call()

    topics_list = [t.topic for t in result.topics]
    topic_facts = {t.topic: t.facts for t in result.topics}

    return {
        "name": result.name,
        "grade": result.grade,
        "subject": result.subject,
        "topics_list": topics_list,
        "topic_facts": topic_facts,
    }
