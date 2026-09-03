"use client";
import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import AnimatedComicReveal from "@/components/AnimatedComicReveal";
import Link from "next/link";
import { PenLine, ArrowLeft, RotateCcw, Map, Share2 } from "lucide-react";
import { ChapterSkeleton } from "@/components/Skeleton";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:8000";

export default function ChapterPage({
  params,
}: {
  params: { id: string; index: string };
}) {
  const [chapter, setChapter] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [answer, setAnswer] = useState("");
  const [gradingResult, setGradingResult] = useState<{
    rubric: Record<string, number>;
    feedback: string;
    correction: string | null;
    rubric_average: number;
  } | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [explainMore, setExplainMore] = useState<string | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);

  const pageRef = useRef<HTMLDivElement>(null);
  const correctionRef = useRef<HTMLDivElement>(null);
  const comicRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChapter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!chapter || !pageRef.current) return;
    gsap.fromTo(
      pageRef.current,
      { opacity: 0, scale: 1.04, rotate: -1.2 },
      { opacity: 1, scale: 1, rotate: 0, duration: 0.5, ease: "power3.out" }
    );
  }, [chapter]);

  useEffect(() => {
    if (gradingResult?.correction && correctionRef.current) {
      gsap.fromTo(
        correctionRef.current,
        { opacity: 0, y: -8, rotate: -3 },
        { opacity: 1, y: 0, rotate: -1.5, duration: 0.45, ease: "back.out(1.4)" }
      );
    }
  }, [gradingResult]);

  async function fetchChapter() {
    setErrorMessage(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/session/${params.id}/chapter/${params.index}`);
      if (!res.ok) throw new Error(`Failed to fetch chapter (status ${res.status}).`);
      const data = await res.json();
      setChapter(data.chapter);
      setSession(data.session);
    } catch (error: any) {
      console.error("Error fetching chapter:", error);
      setErrorMessage(error?.message || "Couldn't load this chapter. Check your connection and try again.");
    }
  }

  async function handleSubmitAnswer() {
    if (!answer.trim()) return;
    setIsGrading(true);
    setGradingResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/grade-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: params.id,
          chapter_index: Number(params.index),
          student_answer: answer,
        }),
      });
      if (!res.ok) throw new Error("Grading failed.");
      const data = await res.json();
      setGradingResult(data);
      setAttemptCount((n) => n + 1);
    } catch (error) {
      console.error("Error grading answer:", error);
      setGradingResult({
        rubric: {},
        feedback: "Something went wrong grading your answer - try again.",
        correction: null,
        rubric_average: 0,
      });
    } finally {
      setIsGrading(false);
    }
  }

  function handleTryAgain() {
    setGradingResult(null);
    setAnswer("");
    // Scroll comic back into view so student re-reads
    comicRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const avg = gradingResult?.rubric_average ?? 0;
  const didWell = avg >= 3.5;
  const needsWork = avg > 0 && avg < 3.5;
  const nextIndex = Number(params.index) + 1;

  async function handleExplainMore() {
    if (!gradingResult?.correction && !chapter?.topic) return;
    setExplainLoading(true);
    setExplainMore(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/explain-more`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: params.id,
          chapter_index: Number(params.index),
          student_answer: answer,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setExplainMore(data.explanation || "Try re-reading the comic panels that introduce the main idea.");
    } catch {
      setExplainMore("Re-read the comic slowly. Focus on the captions that state the key fact, then answer in one clear sentence.");
    } finally {
      setExplainLoading(false);
    }
  }

  if (errorMessage && !chapter) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center space-y-4">
        <p className="text-xl text-amber-text font-medium">{errorMessage}</p>
        <button
          onClick={fetchChapter}
          className="px-5 py-2.5 rounded-xl bg-ink text-cream font-medium hover:bg-ink-soft transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!chapter || !session) {
    return <ChapterSkeleton />;
  }

  return (
    <div ref={pageRef} className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/session/${params.id}`}
          className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to story map
        </Link>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              // soft feedback without toast dependency issues
              alert("Link copied — share this chapter.");
            } catch {
              alert(window.location.href);
            }
          }}
          className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink transition-colors"
        >
          <Share2 className="size-3.5" />
          Copy link
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink transition-colors"
        >
          Print / PDF
        </button>
      </div>

      <div>
        <p className="text-ink-soft font-semibold uppercase tracking-wide text-sm">
          Chapter {chapter.index}
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-ink">{chapter.topic}</h1>
      </div>

      {/* Comic */}
      <div ref={comicRef}>
        {(chapter.script?.panels || []).length === 0 ? (
          <div className="rounded-xl border border-ink/15 p-10 text-center text-ink-soft text-sm">
            No panels in this chapter yet. Go back to the story map and generate it again.
          </div>
        ) : (
          <AnimatedComicReveal
            panels={chapter.script?.panels || []}
            archetype={
              session?.character_profile?.archetype ||
              session?.character_profile_json?.archetype ||
              "alex"
            }
            genre={session?.genre || "fantasy_quest"}
          />
        )}
      </div>

      {/* Understanding check — the learning loop */}
      <div className="bg-cream-alt border border-ink/20 rounded-2xl p-6 sm:p-8 space-y-5">
        <div>
          <p className="text-sm uppercase tracking-wide text-ink-soft font-semibold">
            Check your understanding
          </p>
          <p className="font-serif text-xl text-ink mt-2">{chapter.socratic_prompt}</p>
        </div>

        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={4}
          placeholder="Explain in your own words..."
          disabled={!!gradingResult && didWell}
          className="w-full p-4 rounded-lg bg-cream border-2 border-ink/20 text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink resize-none disabled:opacity-60"
        />

        {!gradingResult && (
          <button
            onClick={handleSubmitAnswer}
            disabled={isGrading || !answer.trim()}
            className="px-6 py-3 rounded-lg bg-ink text-cream font-semibold hover:bg-ink-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isGrading ? "Grading..." : "Submit Answer"}
          </button>
        )}

        {gradingResult && (
          <div className="bg-cream border border-ink/20 rounded-xl p-5 space-y-4">
            {/* Rubric */}
            {gradingResult.rubric && Object.keys(gradingResult.rubric).length > 0 && (
              <div className="flex flex-wrap gap-4">
                {Object.entries(gradingResult.rubric).map(([key, score]) => (
                  <div key={key} className="flex-1 min-w-[120px]">
                    <p className="text-xs text-ink-soft mb-1 capitalize">{key.replace(/_/g, " ")}</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div
                          key={n}
                          className={`h-2 flex-1 rounded-full ${n <= (score as number) ? "bg-ink" : "bg-ink/15"}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <p className="text-sm uppercase tracking-wide text-ink-soft font-semibold mb-1">Feedback</p>
              <p className="text-ink">{gradingResult.feedback}</p>
            </div>

            {gradingResult.correction && (
              <div
                ref={correctionRef}
                className="relative bg-amber-soft border-2 border-dashed border-amber rounded-lg p-4 pl-5 shadow-sm"
                style={{ transform: "rotate(-1.5deg)" }}
              >
                <div className="flex items-start gap-2">
                  <PenLine className="size-5 text-amber-text shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-amber-text font-bold mb-1">
                      Let&apos;s clear this up
                    </p>
                    <p className="font-serif italic text-amber-text leading-snug">
                      {gradingResult.correction}
                    </p>
                    <button
                      type="button"
                      onClick={handleExplainMore}
                      disabled={explainLoading}
                      className="text-xs font-medium text-amber-text underline underline-offset-2 hover:no-underline disabled:opacity-50"
                    >
                      {explainLoading ? "Thinking…" : "Explain more"}
                    </button>
                    {explainMore && (
                      <p className="text-sm text-amber-text/90 leading-relaxed border-t border-amber/30 pt-2">
                        {explainMore}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Learning-loop actions */}
            <div className="pt-2 flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
              {needsWork && (
                <button
                  onClick={handleTryAgain}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-ink text-cream font-medium hover:bg-ink-soft transition-colors"
                >
                  <RotateCcw className="size-4" />
                  Re-read & try again
                </button>
              )}

              {didWell && (
                <Link
                  href={`/session/${params.id}`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-ink text-cream font-medium hover:bg-ink-soft transition-colors"
                >
                  <Map className="size-4" />
                  Continue on story map
                </Link>
              )}

              <Link
                href={`/session/${params.id}`}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border-2 border-ink/30 text-ink font-medium hover:border-ink transition-colors"
              >
                Story map
              </Link>

              {attemptCount > 0 && (
                <p className="text-xs text-ink-faint self-center">
                  Attempt {attemptCount}
                  {didWell ? " · Solid understanding" : needsWork ? " · Keep going" : ""}
                </p>
              )}
            </div>

            {didWell && (
              <p className="text-sm text-ink-soft">
                You can generate the next chapter from the story map when you&apos;re ready.
              </p>
            )}
            {needsWork && (
              <p className="text-sm text-ink-soft">
                Scroll up, re-read the comic, then answer again in your own words.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
