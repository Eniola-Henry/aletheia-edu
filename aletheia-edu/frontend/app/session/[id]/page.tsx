"use client";
import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ensureSession } from "@/lib/auth";
import Link from "next/link";
import { CheckCircle, MapPin, Feather, ArrowLeft } from "lucide-react";
import CharacterAvatar, { type CharacterArchetype } from "@/components/CharacterAvatar";
import { StoryMapSkeleton } from "@/components/Skeleton";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:8000";

export default function SessionPage({ params }: { params: { id: string } }) {
  const supabase = createClientComponentClient();
  const session_id = params.id;

  const [session, setSession] = useState<any>(null);
  const [unlockedChapters, setUnlockedChapters] = useState<number[]>([]);
  const [narrativeArc, setNarrativeArc] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatingChapter, setGeneratingChapter] = useState<number | null>(null);
  const [chapterScores, setChapterScores] = useState<Record<string, number>>({});

  useEffect(() => {
    checkAuthAndFetchSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkAuthAndFetchSession() {
    setErrorMessage(null);
    try {
      await ensureSession(supabase);

      // Dedicated session endpoint — does not require chapter 1 to exist
      const res = await fetch(`${BACKEND_URL}/api/session/${session_id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to fetch session (status ${res.status}).`);
      }

      const data = await res.json();
      setSession(data.session);
      setNarrativeArc(data.session?.narrative_arc || { chapters: [] });
      setUnlockedChapters(
        Array.isArray(data.unlocked_chapters) ? data.unlocked_chapters : [1]
      );
      setChapterScores(data.chapter_scores || {});
    } catch (error: any) {
      console.error("Error fetching session:", error);
      setErrorMessage(
        error?.message || "Something went wrong loading this story. Check your connection and try again."
      );
    }
  }

  async function handleGenerateChapter(chapterIndex: number) {
    setGeneratingChapter(chapterIndex);
    setErrorMessage(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/session/${session_id}/generate-chapter/${chapterIndex}`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err.detail === "string" ? err.detail : `Failed to generate chapter ${chapterIndex}.`
        );
      }
      setUnlockedChapters((prev) => {
        const next = new Set(prev);
        next.add(chapterIndex);
        return Array.from(next).sort((a, b) => a - b);
      });
    } catch (error: any) {
      console.error("Error generating chapter:", error);
      setErrorMessage(error?.message || `Couldn't generate chapter ${chapterIndex}. Try again.`);
    } finally {
      setGeneratingChapter(null);
    }
  }

  if (errorMessage && !session) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center space-y-4">
        <p className="text-xl text-amber-text font-medium">{errorMessage}</p>
        <button
          onClick={checkAuthAndFetchSession}
          className="px-5 py-2.5 rounded-xl bg-ink text-cream font-medium hover:bg-ink-soft transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!session || !narrativeArc) {
    return <StoryMapSkeleton />;
  }

  const chapters = Array.isArray(narrativeArc.chapters) ? narrativeArc.chapters : [];
  const totalChapters = chapters.length;
  const unlockedCount = unlockedChapters.length;
  const progressPct = totalChapters > 0 ? Math.round((unlockedCount / totalChapters) * 100) : 0;
  const archetype = (session.character_profile?.archetype || "alex") as CharacterArchetype;
  const nextChapter = chapters.find((c: any) => !unlockedChapters.includes(c.chapter_index));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink transition-colors">
        <ArrowLeft className="size-4" />
        Back to courses
      </Link>

      <div className="flex flex-col sm:flex-row items-center gap-6 bg-cream-alt border border-ink/15 rounded-2xl p-6">
        <div className="bg-cream rounded-2xl p-2 border-2 border-ink/20 shrink-0">
          <CharacterAvatar pose="determined" size={100} archetype={archetype} />
        </div>
        <div className="flex-1 text-center sm:text-left space-y-3 w-full">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-ink">
              {session.character_name || "Hero"}&apos;s Journey
            </h1>
            <p className="text-ink-soft capitalize mt-1">
              {(session.genre || "").replaceAll("_", " ")}
              {totalChapters > 0 ? ` · ${unlockedCount} of ${totalChapters} chapters open` : ""}
            </p>
          </div>
          {totalChapters > 0 && (
            <div className="w-full max-w-md mx-auto sm:mx-0">
              <div className="h-2.5 rounded-full bg-ink/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-ink transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-ink-faint mt-1.5">{progressPct}% complete</p>
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-amber/40 bg-amber-soft px-4 py-3 text-amber-text text-sm">
          {errorMessage}
        </div>
      )}

      {nextChapter && (
        <p className="text-sm text-ink-soft">
          Next up: Chapter {nextChapter.chapter_index} — {nextChapter.topic}
        </p>
      )}

      {chapters.length === 0 ? (
        <p className="text-ink-soft text-center py-12">
          No chapters in this story yet. Generation may still be running — refresh in a moment.
        </p>
      ) : (
        <div className="relative space-y-0">
          {/* Path line */}
          <div className="absolute left-[27px] top-4 bottom-4 w-px bg-ink/15 hidden sm:block" />
          {chapters.map((chapter: any, idx: number) => {
            const isUnlocked = unlockedChapters.includes(chapter.chapter_index);
            const isGenerating = generatingChapter === chapter.chapter_index;
            const prerequisites: number[] = chapter.unlocked_by || [];
            const prerequisitesMet = prerequisites.every((i: number) =>
              unlockedChapters.includes(i)
            );
            const canGenerate = !isUnlocked && prerequisitesMet;
            const isNext = nextChapter?.chapter_index === chapter.chapter_index;

            return (
              <div
                key={chapter.chapter_index}
                className={`relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-5 pl-0 sm:pl-14 ${
                  idx < chapters.length - 1 ? "border-b border-ink/8" : ""
                } ${isNext ? "opacity-100" : isUnlocked ? "opacity-100" : "opacity-60"}`}
              >
                <div className="hidden sm:flex absolute left-0 w-14 items-center justify-center">
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 z-10 ${
                      isUnlocked ? "bg-ink border-ink" : isNext ? "bg-cream border-ink" : "bg-cream border-ink/25"
                    }`}
                  />
                </div>
                <div>
                  <p className="font-serif text-lg text-ink">
                    Chapter {chapter.chapter_index}: {chapter.topic}
                    {chapterScores[String(chapter.chapter_index)] != null && (
                      <span className="ml-2 text-xs font-sans font-medium text-ink-soft">
                        · best {Number(chapterScores[String(chapter.chapter_index)]).toFixed(1)}/5
                      </span>
                    )}
                  </p>
                  <p className="text-ink-faint text-sm mt-0.5">{chapter.brief_summary}</p>
                </div>
                {isUnlocked ? (
                  <Link
                    href={`/session/${session_id}/chapter/${chapter.chapter_index}`}
                    className="px-5 py-2 rounded-full bg-ink text-cream text-sm font-medium hover:bg-ink-soft transition-colors text-center shrink-0"
                  >
                    Read
                  </Link>
                ) : canGenerate ? (
                  <button
                    onClick={() => handleGenerateChapter(chapter.chapter_index)}
                    disabled={isGenerating}
                    className="px-5 py-2 rounded-full border border-ink text-ink text-sm font-medium hover:bg-ink hover:text-cream transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                  >
                    {isGenerating && <Feather className="size-3.5 animate-pulse" />}
                    {isGenerating ? "Forging…" : "Generate"}
                  </button>
                ) : (
                  <span className="text-xs text-ink-faint px-2 shrink-0">Locked</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
