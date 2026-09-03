"""
Agent 4: The Socratic Grader.

Returns a numeric rubric score alongside qualitative feedback, and -
when the score is low - a targeted correction naming the specific
misconception and restating the correct fact in plain language.

Design note: the LLM always generates a correction draft in the same
call (cheap, no extra API round-trip), but whether it's actually
EXPOSED to the caller is decided deterministically in code by
comparing the computed rubric average against LOW_SCORE_THRESHOLD -
not left to the model's own judgment about when to include it. A
model asked "only include X if the score is low" can forget, hedge, or
be inconsistent across calls; a code-level threshold check on numbers
it already returned cannot.
"""

from typing import Dict, Any, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field
from utils.retry import gemini_retry

llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash", temperature=0)

# Average of the 3 rubric dimensions (each 1-5) below this triggers a
# visible correction. 3.0 = "middling" on a 1-5 scale - chosen so a
# genuinely shallow or wrong answer gets a correction, but a merely
# imperfect-but-solid answer doesn't get flagged as if it were wrong.
LOW_SCORE_THRESHOLD = 3.0


class RubricScore(BaseModel):
    core_concept_understanding: int = Field(..., ge=1, le=5, description="Did they grasp the central idea? 1=no, 5=fully")
    factual_accuracy: int = Field(..., ge=1, le=5, description="Are the specific facts they cited correct? 1=wrong, 5=accurate")
    depth_of_explanation: int = Field(..., ge=1, le=5, description="Surface recall vs real explanation? 1=surface, 5=deep")

    def average(self) -> float:
        return (self.core_concept_understanding + self.factual_accuracy + self.depth_of_explanation) / 3


class GradingResult(BaseModel):
    rubric: RubricScore
    feedback: str = Field(..., description="2-4 sentences: whether they got the core concept, then one specific constructive note")
    correction_draft: str = Field(
        ...,
        description=(
            "ALWAYS populate this, regardless of score. If the answer has a "
            "misconception, name the SPECIFIC misconception in the student's "
            "own answer and restate the correct fact in 2-3 short, plain-"
            "language sentences suitable for a 9-17 year old. If the answer "
            "has no significant misconception, write 'No significant "
            "misconception - answer aligns with the facts.'"
        ),
    )


GRADER_SYSTEM_PROMPT = """
You are an encouraging but rigorous teacher grading a student's
open-ended answer to a Socratic question.

Score the answer honestly against the provided facts - do not inflate
scores to be encouraging. A shallow or partially-wrong answer should
score low even if it's enthusiastic. A student who states a fact
incorrectly should score low on factual_accuracy regardless of how
confident their answer sounds.

Topic: {topic}
Question asked: {question}
Canonical facts (the ground truth to grade against): {facts}
Comic script context: {script}
"""


async def grade_answer(topic: str, question: str, facts: str, script: str, student_answer: str) -> Dict[str, Any]:
    prompt = GRADER_SYSTEM_PROMPT.format(topic=topic, question=question, facts=facts, script=script)

    structured_llm = llm.with_structured_output(GradingResult)

    @gemini_retry
    async def _call():
        return await structured_llm.ainvoke([
            ("system", prompt),
            ("human", f"Student's answer: {student_answer}"),
        ])

    result = await _call()
    avg = result.rubric.average()
    correction_draft = result.correction_draft

    # Always return a flat rubric dict of numbers for the frontend.
    rubric_flat = {
        "core_concept_understanding": int(result.rubric.core_concept_understanding),
        "factual_accuracy": int(result.rubric.factual_accuracy),
        "depth_of_explanation": int(result.rubric.depth_of_explanation),
    }

    return {
        "rubric": rubric_flat,
        "feedback": result.feedback,
        # Deterministic gate: only expose correction when average is low.
        "correction": correction_draft if avg < LOW_SCORE_THRESHOLD else None,
        "rubric_average": round(avg, 2),
    }
