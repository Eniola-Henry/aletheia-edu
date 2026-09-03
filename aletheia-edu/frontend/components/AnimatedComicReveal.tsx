"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import CharacterAvatar from "./CharacterAvatar";
import type { CharacterPose } from "./CharacterAvatar";
import { Play, Pause, SkipForward, RotateCcw, BookOpen, Maximize2, Minimize2 } from "lucide-react";

interface Panel {
  panel_number: number;
  caption?: string | null;
  dialogue?: string | null;
  character_pose: string;
  visual_description: string;
}

interface AnimatedComicRevealProps {
  panels: Panel[];
  archetype?: string;
  genre?: string;
}

const PAGE_CREAM = "#f7f1e6";
const INK = "#1c1916";

const GENRE_ATMOSPHERE: Record<string, { label: string; scene: SceneKind; place: string }> = {
  survival_horror: { label: "Survival Horror", scene: "dark",     place: "Sparse wilderness · thin light" },
  fantasy_quest:   { label: "Fantasy Quest",   scene: "fantasy",  place: "Path · hills · distant keep" },
  sitcom:          { label: "Sitcom",          scene: "indoor",   place: "Classroom · hallway · everyday room" },
  historical_drama:{ label: "Historical Drama", scene: "classic", place: "Hall · columns · formal ground" },
  mystery_noir:    { label: "Mystery Noir",    scene: "noir",     place: "Night street · lamp · rain" },
  space_odyssey:   { label: "Space Odyssey",   scene: "space",    place: "Stars · void · distant world" },
  sports_drama:    { label: "Sports Drama",    scene: "field",    place: "Track · field · open sky" },
  mythic_fable:    { label: "Mythic Fable",    scene: "fable",    place: "Clearing · old tree · quiet shrine" },
};

type SceneKind = "fantasy" | "indoor" | "noir" | "space" | "field" | "dark" | "classic" | "fable" | "plain";

function panelSpanClass(index: number, total: number): string {
  if (total <= 2) return "col-span-2";
  if (index === 0) return "col-span-2 md:col-span-3";
  if (index === total - 1 && total >= 5) return "col-span-2 md:col-span-3";
  return "col-span-1";
}

const ENTRY_ENERGY: Record<string, { fromX: number; overshoot: number; extraShake: boolean }> = {
  neutral:     { fromX: -50, overshoot: 1.02, extraShake: false },
  happy:       { fromX: -70, overshoot: 1.1,  extraShake: false },
  pointing:    { fromX: -50, overshoot: 1.05, extraShake: false },
  thinking:    { fromX: -35, overshoot: 1.0,  extraShake: false },
  shocked:     { fromX: -80, overshoot: 1.08, extraShake: true },
  sad:         { fromX: -25, overshoot: 1.0,  extraShake: false },
  running:     { fromX: -95, overshoot: 1.06, extraShake: false },
  determined:  { fromX: -60, overshoot: 1.05, extraShake: false },
  sleeping:    { fromX: -15, overshoot: 1.0,  extraShake: false },
  celebrating: { fromX: -70, overshoot: 1.14, extraShake: false },
  confused:    { fromX: -40, overshoot: 1.03, extraShake: true },
  waving:      { fromX: -55, overshoot: 1.08, extraShake: false },
};
/** Genre-specific ink locations — one place language per genre */
function SceneBackdrop({ kind, wide }: { kind: SceneKind; wide: boolean }) {
  const ink = INK;
  if (kind === "plain") return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      {/* Shared ground */}
      <path d="M0 248 Q120 235 220 250 T400 245" fill="none" stroke={ink} strokeWidth="1.4" opacity="0.28" />

      {kind === "fantasy" && (
        <>
          <path d="M0 255 Q80 210 150 250 T320 252 T400 248 L400 300 L0 300 Z" fill={ink} opacity="0.045" />
          <path d="M28 248 L42 175 L56 248 Z" fill="none" stroke={ink} strokeWidth="1.5" opacity="0.32" />
          <path d="M48 248 L65 155 L82 248 Z" fill="none" stroke={ink} strokeWidth="1.5" opacity="0.3" />
          <path d="M330 250 L348 165 L365 250 Z" fill="none" stroke={ink} strokeWidth="1.5" opacity="0.3" />
          {wide && (
            <>
              <rect x="278" y="150" width="36" height="48" fill="none" stroke={ink} strokeWidth="1.3" opacity="0.25" />
              <path d="M278 150 L296 132 L314 150" fill="none" stroke={ink} strokeWidth="1.3" opacity="0.25" />
              <line x1="286" y1="150" x2="286" y2="134" stroke={ink} strokeWidth="1.2" opacity="0.22" />
              <line x1="306" y1="150" x2="306" y2="130" stroke={ink} strokeWidth="1.2" opacity="0.22" />
              <path d="M40 248 Q120 220 200 248" fill="none" stroke={ink} strokeWidth="1.2" opacity="0.2" />
            </>
          )}
          <path d="M70 68 Q88 52 105 70 Q120 56 132 72" fill="none" stroke={ink} strokeWidth="1.2" opacity="0.22" />
          <path d="M240 50 Q262 36 282 55 Q298 42 312 58" fill="none" stroke={ink} strokeWidth="1.2" opacity="0.2" />
        </>
      )}

      {kind === "fable" && (
        <>
          <path d="M0 260 Q200 230 400 258 L400 300 L0 300 Z" fill={ink} opacity="0.04" />
          {/* Old tree */}
          <line x1="70" y1="250" x2="70" y2="140" stroke={ink} strokeWidth="3" opacity="0.28" />
          <path d="M70 160 Q40 120 55 90 Q70 110 90 95 Q100 130 70 160" fill="none" stroke={ink} strokeWidth="1.5" opacity="0.3" />
          {/* Simple shrine */}
          <rect x="300" y="200" width="36" height="28" fill="none" stroke={ink} strokeWidth="1.3" opacity="0.25" />
          <path d="M294 200 L318 180 L342 200" fill="none" stroke={ink} strokeWidth="1.3" opacity="0.25" />
        </>
      )}

      {kind === "indoor" && (
        <>
          <line x1="0" y1="55" x2="400" y2="55" stroke={ink} strokeWidth="1.2" opacity="0.15" />
          <line x1="0" y1="248" x2="400" y2="248" stroke={ink} strokeWidth="1.5" opacity="0.2" />
          {/* Window */}
          <rect x="40" y="75" width="70" height="55" fill="none" stroke={ink} strokeWidth="1.4" opacity="0.28" />
          <line x1="75" y1="75" x2="75" y2="130" stroke={ink} strokeWidth="1.1" opacity="0.22" />
          <line x1="40" y1="102" x2="110" y2="102" stroke={ink} strokeWidth="1.1" opacity="0.22" />
          {/* Door hint */}
          <rect x="320" y="150" width="40" height="98" fill="none" stroke={ink} strokeWidth="1.3" opacity="0.22" />
          <circle cx="350" cy="205" r="2.5" fill={ink} opacity="0.25" />
          {/* Desk line */}
          <rect x="140" y="210" width="100" height="8" fill="none" stroke={ink} strokeWidth="1.2" opacity="0.2" />
        </>
      )}

      {kind === "noir" && (
        <>
          <path d="M0 0 L400 0 L400 110 Q200 150 0 110 Z" fill={ink} opacity="0.07" />
          {/* Street lamp */}
          <line x1="340" y1="40" x2="340" y2="200" stroke={ink} strokeWidth="2" opacity="0.3" />
          <circle cx="340" cy="38" r="14" fill="none" stroke={ink} strokeWidth="1.4" opacity="0.28" />
          <path d="M340 52 Q360 80 355 120" fill="none" stroke={ink} strokeWidth="1" opacity="0.12" />
          {/* Rain lines */}
          <line x1="50" y1="20" x2="42" y2="50" stroke={ink} strokeWidth="1" opacity="0.15" />
          <line x1="90" y1="10" x2="82" y2="45" stroke={ink} strokeWidth="1" opacity="0.12" />
          <line x1="160" y1="25" x2="152" y2="55" stroke={ink} strokeWidth="1" opacity="0.14" />
          <line x1="220" y1="15" x2="214" y2="48" stroke={ink} strokeWidth="1" opacity="0.12" />
          <line x1="280" y1="30" x2="272" y2="58" stroke={ink} strokeWidth="1" opacity="0.13" />
          {/* Building silhouette */}
          <rect x="20" y="160" width="50" height="90" fill="none" stroke={ink} strokeWidth="1.2" opacity="0.22" />
          <rect x="30" y="175" width="12" height="12" fill="none" stroke={ink} strokeWidth="1" opacity="0.18" />
        </>
      )}

      {kind === "space" && (
        <>
          <circle cx="55" cy="45" r="1.6" fill={ink} opacity="0.4" />
          <circle cx="110" cy="75" r="1.1" fill={ink} opacity="0.35" />
          <circle cx="180" cy="30" r="1.4" fill={ink} opacity="0.38" />
          <circle cx="250" cy="90" r="1" fill={ink} opacity="0.3" />
          <circle cx="310" cy="40" r="1.5" fill={ink} opacity="0.36" />
          <circle cx="360" cy="100" r="1.2" fill={ink} opacity="0.32" />
          <circle cx="90" cy="130" r="0.9" fill={ink} opacity="0.28" />
          <circle cx="200" cy="120" r="1" fill={ink} opacity="0.25" />
          {/* Distant planet */}
          <circle cx="330" cy="70" r="28" fill="none" stroke={ink} strokeWidth="1.4" opacity="0.28" />
          <path d="M305 70 Q330 55 355 70" fill="none" stroke={ink} strokeWidth="1.1" opacity="0.2" />
          {wide && <ellipse cx="80" cy="200" rx="40" ry="8" fill="none" stroke={ink} strokeWidth="1.2" opacity="0.15" />}
        </>
      )}

      {kind === "field" && (
        <>
          <path d="M0 230 Q200 210 400 235" fill="none" stroke={ink} strokeWidth="1.5" opacity="0.28" />
          <path d="M0 255 Q160 240 320 260 T400 252" fill="none" stroke={ink} strokeWidth="1.2" opacity="0.2" />
          {/* Goal / post */}
          <line x1="50" y1="248" x2="50" y2="160" stroke={ink} strokeWidth="2" opacity="0.28" />
          <line x1="50" y1="160" x2="95" y2="160" stroke={ink} strokeWidth="2" opacity="0.28" />
          <line x1="95" y1="160" x2="95" y2="248" stroke={ink} strokeWidth="2" opacity="0.28" />
          {/* Track arc */}
          <path d="M120 248 Q200 220 280 248" fill="none" stroke={ink} strokeWidth="1.3" opacity="0.22" />
        </>
      )}

      {kind === "dark" && (
        <>
          <path d="M0 0 L400 0 L400 95 Q200 130 0 95 Z" fill={ink} opacity="0.08" />
          <path d="M0 255 Q100 225 200 258 T400 250 L400 300 L0 300 Z" fill={ink} opacity="0.06" />
          {/* Sparse trees / posts */}
          <line x1="60" y1="250" x2="60" y2="170" stroke={ink} strokeWidth="2" opacity="0.25" />
          <line x1="320" y1="252" x2="320" y2="180" stroke={ink} strokeWidth="2" opacity="0.22" />
          <path d="M40 190 Q60 160 80 190" fill="none" stroke={ink} strokeWidth="1.2" opacity="0.2" />
        </>
      )}

      {kind === "classic" && (
        <>
          <path d="M0 250 Q200 232 400 250" fill="none" stroke={ink} strokeWidth="1.4" opacity="0.25" />
          {/* Columns */}
          <line x1="40" y1="250" x2="40" y2="120" stroke={ink} strokeWidth="2.5" opacity="0.28" />
          <line x1="70" y1="250" x2="70" y2="120" stroke={ink} strokeWidth="2.5" opacity="0.28" />
          <path d="M28 120 L55 100 L82 120" fill="none" stroke={ink} strokeWidth="1.4" opacity="0.26" />
          {wide && (
            <>
              <line x1="320" y1="250" x2="320" y2="130" stroke={ink} strokeWidth="2.2" opacity="0.24" />
              <line x1="350" y1="250" x2="350" y2="130" stroke={ink} strokeWidth="2.2" opacity="0.24" />
              <path d="M308 130 L335 112 L362 130" fill="none" stroke={ink} strokeWidth="1.3" opacity="0.22" />
            </>
          )}
          <line x1="0" y1="100" x2="400" y2="100" stroke={ink} strokeWidth="1" opacity="0.1" />
        </>
      )}
    </svg>
  );
}

type Mode = "cinematic" | "reader";

export default function AnimatedComicReveal({
  panels,
  archetype = "alex",
  genre = "fantasy_quest",
}: AnimatedComicRevealProps) {
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const captionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const charRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dialogueRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [mode, setMode] = useState<Mode>("cinematic");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pageWrapRef = useRef<HTMLDivElement | null>(null);

  const shownPanels = panels.slice(0, 6);
  const atmosphere = GENRE_ATMOSPHERE[genre] || GENRE_ATMOSPHERE.fantasy_quest;

  const playCinematicReveal = useCallback(() => {
    const tl = gsap.timeline();
    tl.set(panelRefs.current, { opacity: 0, scale: 0.94 });
    tl.set(captionRefs.current, { opacity: 0, y: -8 });
    tl.set(dialogueRefs.current, { opacity: 0, scale: 0.7 });
    shownPanels.forEach((_, i) => {
      const energy = ENTRY_ENERGY[shownPanels[i].character_pose] ?? ENTRY_ENERGY.neutral;
      tl.set(charRefs.current[i], { opacity: 0, x: energy.fromX, scale: 0.88 });
    });

    shownPanels.forEach((panel, i) => {
      const energy = ENTRY_ENERGY[panel.character_pose] ?? ENTRY_ENERGY.neutral;
      const start = i * 0.48;
      tl.to(panelRefs.current[i], { opacity: 1, scale: 1, duration: 0.32, ease: "power2.out" }, start);
      if (panel.caption) {
        tl.to(captionRefs.current[i], { opacity: 1, y: 0, duration: 0.28 }, start + 0.08);
      }
      tl.to(
        charRefs.current[i],
        { opacity: 1, x: 0, scale: energy.overshoot, duration: 0.42, ease: "back.out(2)" },
        start + 0.12
      ).to(charRefs.current[i], { scale: 1, duration: 0.18 }, start + 0.5);
      if (energy.extraShake) {
        tl.to(charRefs.current[i], { x: 5, duration: 0.05, repeat: 3, yoyo: true }, start + 0.55);
      }
      if (panel.dialogue) {
        tl.to(dialogueRefs.current[i], { opacity: 1, scale: 1, duration: 0.24, ease: "back.out(1.6)" }, start + 0.58);
      }
    });
  }, [shownPanels]);

  useEffect(() => {
    if (!hasPlayed && mode === "cinematic") {
      playCinematicReveal();
      setHasPlayed(true);
    }
  }, [hasPlayed, mode, playCinematicReveal]);

  useEffect(() => {
    if (mode !== "reader") return;
    panelRefs.current.forEach((el, i) => {
      if (!el) return;
      gsap.to(el, {
        opacity: i === activeIndex ? 1 : 0.38,
        scale: i === activeIndex ? 1.02 : 0.98,
        duration: 0.28,
        ease: "power2.out",
      });
    });
  }, [activeIndex, mode]);

  useEffect(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    if (mode === "reader" && isAutoPlaying) {
      autoPlayRef.current = setInterval(() => {
        setActiveIndex((prev) => {
          if (prev >= shownPanels.length - 1) {
            setIsAutoPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2800);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlaying, mode, shownPanels.length]);

  useEffect(() => {
    if (mode !== "reader") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowRight") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, shownPanels.length - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, shownPanels.length]);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  function switchToReader() {
    setMode("reader");
    setActiveIndex(0);
    setIsAutoPlaying(false);
    gsap.set(panelRefs.current, { opacity: 1, scale: 1 });
    gsap.set(captionRefs.current, { opacity: 1, y: 0 });
    gsap.set(dialogueRefs.current, { opacity: 1, scale: 1 });
    gsap.set(charRefs.current, { opacity: 1, x: 0, scale: 1 });
  }

  function switchToCinematic() {
    setMode("cinematic");
    setIsAutoPlaying(false);
    setHasPlayed(false);
  }

  return (
    <div
      ref={pageWrapRef}
      className={`space-y-4 ${isFullscreen ? "fixed inset-0 z-50 bg-cream overflow-y-auto p-4 sm:p-8" : ""}`}
    >
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={switchToCinematic}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              mode === "cinematic" ? "bg-ink text-cream border-ink" : "bg-cream text-ink-soft border-ink/20 hover:border-ink/40"
            }`}
          >
            Cinematic
          </button>
          <button
            onClick={switchToReader}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 ${
              mode === "reader" ? "bg-ink text-cream border-ink" : "bg-cream text-ink-soft border-ink/20 hover:border-ink/40"
            }`}
          >
            <BookOpen className="size-3.5" />
            Reader
          </button>
        </div>

        <div className="flex items-center gap-2">
          {mode === "reader" && (
            <>
              <button
                onClick={() => setIsAutoPlaying((v) => !v)}
                className="p-2 rounded-full border border-ink/20 hover:border-ink/40 text-ink-soft"
                title={isAutoPlaying ? "Pause" : "Auto-play"}
              >
                {isAutoPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
              <button
                onClick={() => setActiveIndex((i) => Math.min(i + 1, shownPanels.length - 1))}
                className="p-2 rounded-full border border-ink/20 hover:border-ink/40 text-ink-soft"
                title="Next panel"
              >
                <SkipForward className="size-4" />
              </button>
              <span className="text-sm text-ink-faint tabular-nums">
                {activeIndex + 1} / {shownPanels.length}
              </span>
            </>
          )}
          <button
            onClick={() => setIsFullscreen((v) => !v)}
            className="p-2 rounded-full border border-ink/20 hover:border-ink/40 text-ink-soft"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>

        {mode === "cinematic" && (
          <button
            onClick={() => {
              setHasPlayed(false);
              playCinematicReveal();
              setHasPlayed(true);
            }}
            className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
          >
            <RotateCcw className="size-3.5" />
            Replay
          </button>
        )}
      </div>

      {/* Genre + place banner */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-3">
          <div className="h-px flex-1 max-w-[60px] bg-ink/20" />
          <p className="text-[11px] tracking-greek uppercase text-ink-faint">{atmosphere.label}</p>
          <div className="h-px flex-1 max-w-[60px] bg-ink/20" />
        </div>
        <p className="text-[11px] text-ink-faint">{atmosphere.place}</p>
      </div>

      {/* Comic page */}
      <div
        className="grid grid-cols-2 md:grid-cols-3 gap-1.5 sm:gap-2 p-2 sm:p-3 border-[3px] max-w-3xl mx-auto"
        style={{ backgroundColor: PAGE_CREAM, borderColor: INK }}
      >
        {shownPanels.map((panel, i) => {
          const isActive = mode === "reader" && i === activeIndex;
          const span = panelSpanClass(i, shownPanels.length);
          const isWide = span.includes("col-span-2") || span.includes("col-span-3");

          return (
            <div
              key={panel.panel_number}
              ref={(el) => { panelRefs.current[i] = el; }}
              onClick={() => mode === "reader" && setActiveIndex(i)}
              className={`relative border-[2.5px] overflow-hidden flex flex-col cursor-pointer ${span} ${
                isWide ? "min-h-[200px] sm:min-h-[240px]" : "min-h-[230px] sm:min-h-[260px]"
              } ${isActive ? "ring-2 ring-ink/30 z-10" : ""}`}
              style={{ backgroundColor: PAGE_CREAM, borderColor: INK }}
            >
              {/* Scene backdrop */}
              <SceneBackdrop kind={atmosphere.scene} wide={isWide} />

              {/* Panel number */}
              <div
                className="absolute top-1.5 left-1.5 z-20 min-w-[22px] h-[22px] px-1 flex items-center justify-center text-[11px] font-bold"
                style={{ backgroundColor: INK, color: PAGE_CREAM }}
              >
                {panel.panel_number}
              </div>

              {/* Caption */}
              {panel.caption && (
                <p
                  ref={(el) => { captionRefs.current[i] = el; }}
                  className="relative z-10 text-[11px] sm:text-xs font-semibold px-2 py-1.5 mx-2 mt-7 border text-center"
                  style={{ backgroundColor: PAGE_CREAM, borderColor: INK, color: INK }}
                >
                  {panel.caption}
                </p>
              )}

              {/* Character */}
              <div
                ref={(el) => { charRefs.current[i] = el; }}
                className="relative z-10 flex-1 flex items-center justify-center py-1"
              >
                <CharacterAvatar
                  pose={(panel.character_pose as CharacterPose) || "neutral"}
                  archetype={(archetype as any) || "alex"}
                  size={isActive ? (isWide ? 148 : 138) : isWide ? 128 : 118}
                />
              </div>

              {/* Dialogue bubble */}
              {panel.dialogue && (
                <div
                  ref={(el) => { dialogueRefs.current[i] = el; }}
                  className="relative z-10 mx-2 mb-2 rounded-2xl px-3 py-2 border-2"
                  style={{ backgroundColor: PAGE_CREAM, borderColor: INK }}
                >
                  <div
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 border-l-2 border-t-2"
                    style={{ backgroundColor: PAGE_CREAM, borderColor: INK }}
                  />
                  <p className="text-[11px] sm:text-xs font-medium text-center leading-snug" style={{ color: INK }}>
                    “{panel.dialogue}”
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {mode === "reader" && (
        <p className="text-[11px] text-ink-faint text-center">
          Click a panel · Space / → next · ← previous
        </p>
      )}
    </div>
  );
}
