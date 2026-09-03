"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ensureSession } from "@/lib/auth";
import CharacterAvatar, { ARCHETYPES, type CharacterArchetype } from "@/components/CharacterAvatar";
import { BookOpen, Feather, Upload, FileText } from "lucide-react";
import toast from "react-hot-toast";

const GENRES = [
  { id: "fantasy_quest", name: "Fantasy Quest", blurb: "Wonder, trials, mentors", mark: "F" },
  { id: "mystery_noir", name: "Mystery Noir", blurb: "Clues, cases, reveals", mark: "M" },
  { id: "sitcom", name: "Sitcom", blurb: "Awkward, funny, everyday", mark: "S" },
  { id: "historical_drama", name: "Historical Drama", blurb: "Weight, duty, era", mark: "H" },
  { id: "space_odyssey", name: "Space Odyssey", blurb: "Scale, systems, awe", mark: "Ω" },
  { id: "sports_drama", name: "Sports Drama", blurb: "Effort, comeback, team", mark: "R" },
  { id: "mythic_fable", name: "Mythic Fable", blurb: "Simple, sharp lesson", mark: "μ" },
  { id: "survival_horror", name: "Survival Horror", blurb: "Tension, caution, scarce", mark: "X" },
];
const BACKEND_URL = "https://aletheia-edu.onrender.com";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [user, setUser] = useState<any>(null);
  const [curricula, setCurricula] = useState<any[]>([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState("");
  const [allowedGenreIds, setAllowedGenreIds] = useState<string[]>(GENRES.map((g) => g.id));
  const [genre, setGenre] = useState("fantasy_quest");
  const [characterName, setCharacterName] = useState("Alex");
  const [characterDesc, setCharacterDesc] = useState("A curious student ready to learn.");
  const [archetype, setArchetype] = useState<CharacterArchetype>("alex");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [savedSessions, setSavedSessions] = useState<any[]>([]);
  const [showTip, setShowTip] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{
    id: string;
    name: string;
    subject: string;
    grade: string;
    topics_preview: { topic: string; facts_preview: string }[];
  } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    checkUser();
    fetchCurricula();
    try {
      if (typeof window !== "undefined" && !localStorage.getItem("aletheia_tip_seen")) {
        setShowTip(true);
      }
    } catch { /* ignore */ }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function checkUser() {
    const u = await ensureSession(supabase);
    setUser(u);
    if (u?.id) fetchSavedSessions(u.id);
  }

  async function fetchSavedSessions(userId: string) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/${userId}/sessions`);
      if (!res.ok) return;
      const data = await res.json();
      setSavedSessions(data.sessions || []);
    } catch {
      /* non-fatal */
    }
  }

  async function deleteSession(sessionId: string) {
    if (!user?.id) return;
    if (!confirm("Remove this course from your list?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/${user.id}/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Could not delete");
      setSavedSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success("Course removed");
    } catch {
      toast.error("Could not remove course");
    }
  }

  async function fetchCurricula() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/curricula`);
      const data = await res.json();
      setCurricula(data);
      if (!selectedCurriculum && data[0]?.id) setSelectedCurriculum(data[0].id);
    } catch {
      toast.error("Failed to load curricula.");
    }
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user?.id) {
      toast.error("Session not ready — wait a moment and try again.");
      return;
    }
    setIsUploadingPdf(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("user_id", user.id);
      const res = await fetch(`${BACKEND_URL}/api/curricula/from-pdf`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "PDF upload failed");
      }
      const data = await res.json();
      toast.success(`Extracted: ${data.name}`);
      await fetchCurricula();
      if (data.id) setSelectedCurriculum(data.id);
      setPdfPreview({
        id: data.id,
        name: data.name,
        subject: data.subject || "",
        grade: data.grade || "",
        topics_preview: data.topics_preview || (data.topics_list || []).map((topic: string) => ({
          topic,
          facts_preview: "",
        })),
      });
    } catch (err: any) {
      toast.error(err?.message || "Could not process PDF");
    } finally {
      setIsUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  useEffect(() => {
    if (!selectedCurriculum) return;
    fetch(`${BACKEND_URL}/api/curricula/${selectedCurriculum}/allowed-genres`)
      .then((r) => r.json())
      .then((data) => {
        const allowed: string[] = data.allowed_genres || GENRES.map((g) => g.id);
        setAllowedGenreIds(allowed);
        if (!allowed.includes(genre)) setGenre(allowed[0] || "fantasy_quest");
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurriculum]);

  async function handleStartLearning(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) {
      toast.error("Preparing your session… try again in a second.");
      await checkUser();
      return;
    }
    setIsLoading(true);
    setLoadingStage("Mining the syllabus…");
    try {
      const res = await fetch(`${BACKEND_URL}/api/start-learning`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          curriculum_id: selectedCurriculum,
          genre,
          character_name: characterName,
          character_desc: characterDesc,
          character_archetype: archetype,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to start");
      }
      const data = await res.json();
      const sessionId = data.session_id;
      setLoadingStage("Drawing the narrative arc…");

      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        if (attempts === 4) setLoadingStage("Writing chapter one…");
        if (attempts === 8) setLoadingStage("Almost ready…");
        if (attempts > 40) {
          if (pollRef.current) clearInterval(pollRef.current);
          setIsLoading(false);
          toast.error("Taking longer than expected. Open the story map to check.");
          router.push(`/session/${sessionId}`);
          return;
        }
        try {
          const st = await fetch(`${BACKEND_URL}/api/session/${sessionId}/status`);
          if (!st.ok) return;
          const status = await st.json();
          if (status.is_complete) {
            if (pollRef.current) clearInterval(pollRef.current);
            setLoadingStage("Opening your story…");
            router.push(`/session/${sessionId}`);
          }
        } catch {
          /* keep polling */
        }
      }, 2000);
    } catch (error: any) {
      setIsLoading(false);
      toast.error(error?.message || "Could not start learning");
    }
  }

  const selectedName = curricula.find((c) => c.id === selectedCurriculum)?.name;
  const genreMeta = GENRES.find((g) => g.id === genre);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-6 text-center px-6 rise-in">
        <div className="w-10 h-10 rounded-full border border-ink/25 border-t-ink animate-spin" />
        <div className="space-y-2 max-w-xs">
          <h2 className="font-serif text-2xl text-ink">Forging your course</h2>
          <p className="text-ink-soft text-sm">{loadingStage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10 sm:space-y-12">
      <div className="rise-in text-center space-y-3">
        <p className="text-xs tracking-greek uppercase text-ink-faint">New course</p>
        <h1 className="font-serif text-4xl text-ink">Cast your journey</h1>
        <p className="text-ink-soft text-sm leading-relaxed">
          Subject → genre → character. Then the comic is written for you.
        </p>
      </div>

      {/* Live preview card */}
      <div className="rise-in rise-in-delay-1 flex flex-col items-center gap-3 py-6 border border-ink/10 rounded-2xl bg-cream-alt/50">
        <CharacterAvatar pose="waving" size={120} archetype={archetype} />
        <p className="font-serif text-xl text-ink">{characterName || "Protagonist"}</p>
        <p className="text-xs text-ink-faint">
          {[selectedName, genreMeta?.name].filter(Boolean).join(" · ") || "Choose options below"}
        </p>
      </div>

      <section className="rise-in rise-in-delay-1 space-y-3">
        <p className="text-xs tracking-greek uppercase text-ink-faint">Your courses</p>
        {savedSessions.length === 0 ? (
          <p className="text-sm text-ink-faint py-2">
            No saved courses yet. Forge one below — it will show up here so you can return.
          </p>
        ) : (
          <div className="space-y-2">
            {savedSessions.slice(0, 8).map((s) => (
              <div
                key={s.id}
                className="w-full p-3.5 rounded-xl border border-ink/12 bg-cream flex items-center justify-between gap-3"
              >
                <button
                  type="button"
                  onClick={() => router.push(`/session/${s.id}`)}
                  className="min-w-0 text-left flex-1 hover:opacity-80 transition-opacity"
                >
                  <p className="font-serif text-ink truncate">
                    {s.character_name || "Hero"} · {(s.genre || "").replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-ink-faint mt-0.5">
                    {s.unlocked_count}/{s.chapter_count || "?"} chapters
                    {s.title ? ` · ${s.title}` : ""}
                  </p>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => router.push(`/session/${s.id}`)}
                    className="text-xs text-ink-soft hover:text-ink px-2 py-1"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSession(s.id)}
                    className="text-xs text-ink-faint hover:text-amber-text px-2 py-1"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="greek-rule" />
      </section>

      <form onSubmit={handleStartLearning} className="space-y-10 rise-in rise-in-delay-2">
        {/* Step 1 */}
        <section className="space-y-4">
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-ink/20 text-2xl">01</span>
            <h2 className="font-serif text-xl text-ink">Subject</h2>
          </div>
          {curricula.length === 0 ? (
            <p className="text-sm text-ink-faint">Loading subjects…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {curricula.map((curr) => {
                const selected = selectedCurriculum === curr.id;
                return (
                  <button
                    key={curr.id}
                    type="button"
                    onClick={() => setSelectedCurriculum(curr.id)}
                    className={`text-left p-3.5 rounded-xl border transition-all ${
                      selected
                        ? "border-ink bg-ink text-cream"
                        : "border-ink/15 bg-cream hover:border-ink/40"
                    }`}
                  >
                    <span className={`block text-sm font-medium ${selected ? "text-cream" : "text-ink"}`}>
                      {curr.name}
                    </span>
                    <span className={`block text-[11px] mt-0.5 ${selected ? "text-cream/70" : "text-ink-faint"}`}>
                      {curr.grade}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {/* keep value for form validity */}
          <input type="hidden" value={selectedCurriculum} required readOnly />
          <div className="flex items-center gap-3">
            <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPdf}
              className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink transition-colors disabled:opacity-50"
            >
              {isUploadingPdf ? <Feather className="size-4 animate-pulse" /> : <Upload className="size-4" />}
              {isUploadingPdf ? "Reading PDF…" : "Or upload your own PDF"}
            </button>
          </div>

          {pdfPreview && (
            <div className="mt-4 rounded-xl border border-ink/15 bg-cream-alt/60 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs tracking-greek uppercase text-ink-faint">From your PDF</p>
                  <p className="font-serif text-lg text-ink mt-1">{pdfPreview.name}</p>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {[pdfPreview.subject, pdfPreview.grade].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPdfPreview(null)}
                  className="text-xs text-ink-faint hover:text-ink"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-sm text-ink-soft">We found these topics — they will become your chapters:</p>
              <ul className="space-y-2">
                {pdfPreview.topics_preview.map((t, i) => (
                  <li key={i} className="border-t border-ink/10 pt-2">
                    <p className="text-sm font-medium text-ink">{i + 1}. {t.topic}</p>
                    {t.facts_preview && (
                      <p className="text-xs text-ink-faint mt-1 line-clamp-2">{t.facts_preview}</p>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-ink-faint">
                Subject is selected. Choose genre and character below, then Forge course.
              </p>
            </div>
          )}
        </section>

        <div className="greek-rule" />

        {/* Step 2 */}
        <section className="space-y-4">
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-ink/20 text-2xl">02</span>
            <h2 className="font-serif text-xl text-ink">Genre</h2>
          </div>
          <p className="text-xs text-ink-faint">Changes story tone, dialogue, and energy — not just a label.</p>
          <div className="grid grid-cols-2 gap-2">
            {GENRES.map((g) => {
              const allowed = allowedGenreIds.includes(g.id);
              const selected = genre === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  disabled={!allowed}
                  onClick={() => setGenre(g.id)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    !allowed
                      ? "opacity-30 cursor-not-allowed border-ink/5"
                      : selected
                        ? "border-ink bg-ink text-cream"
                        : "border-ink/15 hover:border-ink/40 bg-cream"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-serif text-lg leading-none ${selected && allowed ? "text-cream/80" : "text-ink/30"}`}>
                      {g.mark}
                    </span>
                    <span className={`block text-sm font-medium ${selected && allowed ? "text-cream" : "text-ink"}`}>
                      {g.name}
                    </span>
                  </div>
                  <span className={`block text-[11px] mt-0.5 ${selected && allowed ? "text-cream/70" : "text-ink-faint"}`}>
                    {allowed ? g.blurb : "Not for this subject"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="greek-rule" />

        {/* Step 3 */}
        <section className="space-y-5">
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-ink/20 text-2xl">03</span>
            <h2 className="font-serif text-xl text-ink">Character</h2>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {ARCHETYPES.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setArchetype(a.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                  archetype === a.id ? "border-ink bg-cream-alt" : "border-ink/10 hover:border-ink/30"
                }`}
              >
                <CharacterAvatar pose="neutral" size={44} archetype={a.id} static={true} />
                <span className="text-[10px] text-ink-soft">{a.label}</span>
              </button>
            ))}
          </div>
          <input
            type="text"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            placeholder="Name"
            className="w-full p-3.5 rounded-xl border border-ink/20 bg-cream text-ink focus:outline-none focus:border-ink"
            required
          />
          <textarea
            value={characterDesc}
            onChange={(e) => setCharacterDesc(e.target.value)}
            placeholder="Personality in a line…"
            rows={2}
            className="w-full p-3.5 rounded-xl border border-ink/20 bg-cream text-ink focus:outline-none focus:border-ink resize-none"
            required
          />
        </section>

        <div className="rounded-xl border border-ink/10 bg-cream-alt/40 px-4 py-3 text-center">
          <p className="text-xs text-ink-faint">Ready to forge</p>
          <p className="text-sm text-ink mt-0.5">
            {(curricula.find((c) => c.id === selectedCurriculum)?.name) || "Subject"}
            {" · "}
            {(GENRES.find((g) => g.id === genre)?.name) || genre}
            {" · "}
            {characterName || "Hero"}
          </p>
        </div>

        <button
          type="submit"
          className="w-full py-4 rounded-full bg-ink text-cream font-medium text-base hover:bg-ink-soft transition-colors sticky bottom-4 shadow-sm"
        >
          Forge course
        </button>
      </form>
    </div>
  );
}
