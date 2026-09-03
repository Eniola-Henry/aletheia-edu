"""
test_grader.py

The Council's peer review flagged a real blind spot: nothing had
actually verified that the Socratic Grader can tell a strong answer
from a weak one - the risk being an ungrounded "great job!" for
anything, which is a visible technical failure if a judge probes it
in Q&A or tries a weak answer live.

This script runs three answers of clearly different quality through
the real grader and prints the scores side by side, so you can
eyeball whether the rubric actually discriminates between them BEFORE
you record your demo.

Run from backend/ with the venv active:
    python test_grader.py
"""
import asyncio
import json

# Bug fix: nothing in this script's import chain (agents.grader) ever
# called load_dotenv() - that only lived in utils/supabase_client.py,
# which this script never imports. Without this, GOOGLE_API_KEY would
# only be found if it happened to already be a real exported shell
# variable, not just present in your .env file.
from dotenv import load_dotenv
load_dotenv()

from agents.grader import grade_answer, LOW_SCORE_THRESHOLD

TOPIC = "Cell Structure"
QUESTION = "How does the cell membrane act as a fortress wall against toxins?"
FACTS = (
    "1. All living things are made of cells. "
    "2. Animal cells have a nucleus, cytoplasm, cell membrane, and "
    "mitochondria but no cell wall. "
    "3. Plant cells additionally have a cell wall (cellulose), "
    "chloroplasts, and a permanent vacuole. "
    "4. The nucleus contains genetic material (DNA) and controls the "
    "cell. "
    "5. Mitochondria are the site of aerobic respiration, releasing "
    "energy."
)
SCRIPT_CONTEXT = "Alex explores a cell, discovering the membrane, nucleus, and mitochondria along the way."

TEST_ANSWERS = {
    "strong (real understanding)": (
        "The cell membrane controls what enters and leaves the cell, "
        "so it can let in things the cell needs and block or filter out "
        "harmful substances - like a wall with a controlled gate rather "
        "than an open door. That's different from the cell wall in "
        "plants, which is mainly structural support, not a selective "
        "barrier."
    ),
    "weak (surface/keyword matching)": (
        "The cell membrane is like a wall around the cell. It has a "
        "nucleus and mitochondria too. Cells are important for life."
    ),
    "wrong (factually incorrect)": (
        "The cell membrane makes energy for the cell, that's why it's "
        "called the powerhouse. Toxins can't get through the cell wall "
        "because all cells have a thick wall like a castle."
    ),
}


async def main():
    print(f"Topic: {TOPIC}")
    print(f"Question: {QUESTION}")
    print(f"Low-score threshold (average of 3 rubric dims, 1-5 each): {LOW_SCORE_THRESHOLD}\n")

    failures = []

    for label, answer in TEST_ANSWERS.items():
        print("=" * 60)
        print(f"Testing: {label}")
        print(f"Answer: {answer}")
        print("-" * 60)

        result = await grade_answer(
            topic=TOPIC,
            question=QUESTION,
            facts=FACTS,
            script=SCRIPT_CONTEXT,
            student_answer=answer,
        )
        print(json.dumps(result, indent=2))

        avg = result["rubric_average"]
        correction = result.get("correction")

        # The actual assertion this update was for: whenever the score
        # is low, correction MUST be present and non-empty. This is
        # checked in the test process, not the grader itself - if this
        # fails, the bug is in the deterministic gate in grader.py's
        # grade_answer(), not in the LLM's judgment (which is exactly
        # the point of gating it in code instead of trusting the model).
        if avg < LOW_SCORE_THRESHOLD:
            if not correction or not correction.strip():
                msg = f"FAIL [{label}]: avg={avg} is below threshold but correction is empty/missing."
                print(msg)
                failures.append(msg)
            else:
                print(f"PASS [{label}]: avg={avg} is low, correction is present.")
        else:
            if correction:
                msg = f"FAIL [{label}]: avg={avg} is NOT low but correction was still exposed."
                print(msg)
                failures.append(msg)
            else:
                print(f"PASS [{label}]: avg={avg} is not low, correction correctly withheld.")

        print()

    print("=" * 60)
    print("CHECK 1: did the strong answer score meaningfully higher than")
    print("the weak one, and did the factually-wrong answer score low")
    print("on factual_accuracy specifically (not just overall)? If all")
    print("three scored similarly, the grader isn't discriminating and")
    print("the prompt in agents/grader.py needs work before you record.")
    print()
    print("CHECK 2 (automated above): correction field presence matches")
    print("the computed threshold for every test case.")
    print()
    if failures:
        print(f"{len(failures)} FAILURE(S):")
        for f in failures:
            print(f"  - {f}")
    else:
        print("All correction-gating checks PASSED.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
