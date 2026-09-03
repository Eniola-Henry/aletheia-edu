"""
Shared retry/backoff for Gemini API calls.

Free-tier flash models have tight per-minute rate limits. Without a
retry, a single transient 429 or brief network hiccup takes down the
entire request it's part of - and /api/start-learning makes several
sequential Gemini calls, so the odds of hitting at least one over the
course of a full run are not negligible. This wraps each LLM call site
with a short retry + exponential backoff instead of failing immediately.

Usage:
    from utils.retry import gemini_retry

    @gemini_retry
    async def _call_llm(...):
        return await llm.ainvoke(...)
"""

from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# Deliberately broad exception type: the google-genai / langchain-google-genai
# error hierarchy isn't stable enough across versions to safely narrow this
# to "only rate-limit errors" without risking silently NOT retrying a
# transient error that comes through as a different exception class.
# 3 attempts total (1 initial + 2 retries), short exponential backoff -
# this needs to stay fast enough that a full pipeline run (4-5 sequential
# calls) doesn't balloon past what's tolerable in a live demo recording.
gemini_retry = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=15),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
