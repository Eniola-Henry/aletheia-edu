"use client";

/**
 * CharacterAvatar — black-and-white ink protagonist.
 * Richer linework than the first version, still pure SVG (no live images).
 */

export type CharacterPose =
  | "neutral" | "happy" | "pointing" | "thinking"
  | "shocked" | "sad" | "running" | "determined"
  | "sleeping" | "celebrating" | "confused" | "waving";

export type CharacterArchetype = "alex" | "jordan" | "sam" | "riley" | "pixel";

export const ARCHETYPES: {
  id: CharacterArchetype;
  label: string;
  blurb: string;
}[] = [
  { id: "alex",   label: "Alex",   blurb: "Everyday student" },
  { id: "jordan", label: "Jordan", blurb: "Tall & lean" },
  { id: "sam",    label: "Sam",    blurb: "Softer build" },
  { id: "riley",  label: "Riley",  blurb: "Feminine build" },
  { id: "pixel",  label: "Pixel",  blurb: "Curious little creature" },
];

interface CharacterAvatarProps {
  pose: CharacterPose;
  archetype?: CharacterArchetype;
  size?: number;
  static?: boolean;
  className?: string;
}

const POSE_CONFIG: Record<CharacterPose, {
  mouth: string;
  eyeScaleY: number;
  armAngleL: number;
  armAngleR: number;
  brow: number;
  browShape: "flat" | "angled";
  bodyTilt: number;
}> = {
  neutral:     { mouth: "M 70 108 Q 90 114 110 108", eyeScaleY: 1,    armAngleL: 15,  armAngleR: -15,  brow: 0,   browShape: "flat",   bodyTilt: 0 },
  happy:       { mouth: "M 68 102 Q 90 128 112 102", eyeScaleY: 0.55, armAngleL: 35,  armAngleR: -35,  brow: -2,  browShape: "flat",   bodyTilt: 0 },
  pointing:    { mouth: "M 72 108 Q 90 114 108 108", eyeScaleY: 1,    armAngleL: 12,  armAngleR: -95,  brow: -4,  browShape: "angled", bodyTilt: 3 },
  thinking:    { mouth: "M 78 110 Q 90 106 102 110", eyeScaleY: 0.9,  armAngleL: 15,  armAngleR: 125,  brow: 3,   browShape: "flat",   bodyTilt: -2 },
  shocked:     { mouth: "M 82 106 A 8 11 0 1 0 98 106 A 8 11 0 1 0 82 106", eyeScaleY: 1.45, armAngleL: 55, armAngleR: -55, brow: -9, browShape: "angled", bodyTilt: 0 },
  sad:         { mouth: "M 72 116 Q 90 100 108 116", eyeScaleY: 0.85, armAngleL: 8,   armAngleR: -8,   brow: 7,   browShape: "flat",   bodyTilt: 0 },
  running:     { mouth: "M 70 106 Q 90 120 110 106", eyeScaleY: 0.55, armAngleL: 75,  armAngleR: -75,  brow: -3,  browShape: "angled", bodyTilt: 6 },
  determined:  { mouth: "M 74 110 Q 90 106 106 110", eyeScaleY: 0.55, armAngleL: 25,  armAngleR: -25,  brow: -7,  browShape: "angled", bodyTilt: 0 },
  sleeping:    { mouth: "M 80 110 Q 90 114 100 110", eyeScaleY: 0.05, armAngleL: 12,  armAngleR: -12,  brow: 1,   browShape: "flat",   bodyTilt: 0 },
  celebrating: { mouth: "M 68 102 Q 90 130 112 102", eyeScaleY: 0.55, armAngleL: 155, armAngleR: -155, brow: -4,  browShape: "flat",   bodyTilt: 0 },
  confused:    { mouth: "M 76 110 Q 88 104 100 112", eyeScaleY: 1,    armAngleL: 10,  armAngleR: 105,  brow: -5,  browShape: "angled", bodyTilt: 0 },
  waving:      { mouth: "M 70 102 Q 90 126 110 102", eyeScaleY: 0.55, armAngleL: 15,  armAngleR: -145, brow: -3,  browShape: "flat",   bodyTilt: 0 },
};

const BODY: Record<CharacterArchetype, {
  headR: number; headY: number; bodyRx: number; bodyRy: number; bodyY: number;
  armW: number; armH: number; legHint: boolean; ears: "none" | "pointy"; extra: "none" | "antenna";
  cape: boolean; belt: boolean;
}> = {
  alex:   { headR: 44, headY: 78, bodyRx: 40, bodyRy: 50, bodyY: 136, armW: 14, armH: 50, legHint: true,  ears: "none",   extra: "none",    cape: true,  belt: true },
  jordan: { headR: 42, headY: 74, bodyRx: 34, bodyRy: 56, bodyY: 138, armW: 12, armH: 56, legHint: true,  ears: "none",   extra: "none",    cape: true,  belt: true },
  sam:    { headR: 46, headY: 80, bodyRx: 50, bodyRy: 48, bodyY: 134, armW: 16, armH: 46, legHint: true,  ears: "none",   extra: "none",    cape: true,  belt: true },
  riley:  { headR: 43, headY: 76, bodyRx: 36, bodyRy: 52, bodyY: 134, armW: 12, armH: 52, legHint: true,  ears: "none",   extra: "none",    cape: true,  belt: true },
  pixel:  { headR: 40, headY: 86, bodyRx: 38, bodyRy: 36, bodyY: 142, armW: 13, armH: 34, legHint: false, ears: "pointy", extra: "antenna", cape: false, belt: false },
};

export default function CharacterAvatar({
  pose,
  archetype = "alex",
  size = 200,
  static: isStatic = false,
  className = "",
}: CharacterAvatarProps) {
  const cfg = POSE_CONFIG[pose] ?? POSE_CONFIG.neutral;
  const body = BODY[archetype] ?? BODY.alex;
  const ink = "#1c1916";
  const paper = "#f7f1e6";

  const bodyLive = !isStatic && pose !== "sleeping";
  const eyeLive = !isStatic && pose !== "sleeping" && pose !== "shocked";

  const shoulderL = 90 - body.bodyRx * 0.55;
  const shoulderR = 90 + body.bodyRx * 0.55;
  const shoulderY = body.bodyY - body.bodyRy * 0.55;

  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 180 220"
        xmlns="http://www.w3.org/2000/svg"
        className={bodyLive ? "avatar-body-live" : undefined}
      >
        {/* Ground shadow */}
        <ellipse cx="90" cy="208" rx="42" ry="7" fill={ink} opacity="0.1" />

        {/* Cape (behind body) */}
        {body.cape && (
          <path
            d={`M ${90 - body.bodyRx * 0.7} ${body.bodyY - body.bodyRy * 0.4}
                Q ${90 - body.bodyRx * 1.3} ${body.bodyY + 20} ${90 - body.bodyRx * 0.9} ${body.bodyY + body.bodyRy + 8}
                L ${90 + body.bodyRx * 0.9} ${body.bodyY + body.bodyRy + 8}
                Q ${90 + body.bodyRx * 1.3} ${body.bodyY + 20} ${90 + body.bodyRx * 0.7} ${body.bodyY - body.bodyRy * 0.4}
                Z`}
            fill={paper}
            stroke={ink}
            strokeWidth="2.8"
            opacity="0.95"
          />
        )}

        {/* Legs */}
        {body.legHint && (
          <>
            <line x1="78" y1={body.bodyY + body.bodyRy - 10} x2="70" y2="202" stroke={ink} strokeWidth="4.5" strokeLinecap="round" />
            <line x1="102" y1={body.bodyY + body.bodyRy - 10} x2="110" y2="202" stroke={ink} strokeWidth="4.5" strokeLinecap="round" />
            {/* Simple boots */}
            <ellipse cx="68" cy="204" rx="10" ry="4" fill={paper} stroke={ink} strokeWidth="2" />
            <ellipse cx="112" cy="204" rx="10" ry="4" fill={paper} stroke={ink} strokeWidth="2" />
          </>
        )}

        {/* Arms */}
        <g transform={`rotate(${cfg.bodyTilt} 90 ${body.bodyY})`}>
          <rect
            x={shoulderR - body.armW / 2}
            y={shoulderY}
            width={body.armW}
            height={body.armH}
            rx={body.armW / 2}
            fill={paper}
            stroke={ink}
            strokeWidth="3"
            transform={`rotate(${cfg.armAngleR} ${shoulderR} ${shoulderY + 4})`}
          />
          <rect
            x={shoulderL - body.armW / 2}
            y={shoulderY}
            width={body.armW}
            height={body.armH}
            rx={body.armW / 2}
            fill={paper}
            stroke={ink}
            strokeWidth="3"
            transform={`rotate(${cfg.armAngleL} ${shoulderL} ${shoulderY + 4})`}
          />

          {/* Torso */}
          <ellipse
            cx="90"
            cy={body.bodyY}
            rx={body.bodyRx}
            ry={body.bodyRy}
            fill={paper}
            stroke={ink}
            strokeWidth="3.6"
          />

          {/* Belt */}
          {body.belt && (
            <>
              <rect
                x={90 - body.bodyRx * 0.7}
                y={body.bodyY + 4}
                width={body.bodyRx * 1.4}
                height={8}
                rx="2"
                fill={paper}
                stroke={ink}
                strokeWidth="2"
              />
              <circle cx="90" cy={body.bodyY + 8} r="5" fill={paper} stroke={ink} strokeWidth="2" />
            </>
          )}

          {/* Collar fold */}
          <path
            d={`M ${90 - body.bodyRx * 0.45} ${body.bodyY - body.bodyRy * 0.55}
                Q 90 ${body.bodyY - body.bodyRy * 0.25} ${90 + body.bodyRx * 0.45} ${body.bodyY - body.bodyRy * 0.55}`}
            fill="none"
            stroke={ink}
            strokeWidth="1.8"
            opacity="0.5"
          />
        </g>

        {/* Head */}
        <circle cx="90" cy={body.headY} r={body.headR} fill={paper} stroke={ink} strokeWidth="3.6" />

        {body.ears === "pointy" && (
          <>
            <path d={`M ${90 - body.headR + 8} ${body.headY - 6} L ${90 - body.headR - 6} ${body.headY - 26} L ${90 - body.headR + 20} ${body.headY - 16} Z`} fill={paper} stroke={ink} strokeWidth="2.4" />
            <path d={`M ${90 + body.headR - 8} ${body.headY - 6} L ${90 + body.headR + 6} ${body.headY - 26} L ${90 + body.headR - 20} ${body.headY - 16} Z`} fill={paper} stroke={ink} strokeWidth="2.4" />
          </>
        )}

        {body.extra === "antenna" && (
          <>
            <line x1="90" y1={body.headY - body.headR} x2="90" y2={body.headY - body.headR - 16} stroke={ink} strokeWidth="2.4" />
            <circle cx="90" cy={body.headY - body.headR - 20} r="4" fill={paper} stroke={ink} strokeWidth="2" />
          </>
        )}

        {/* Brows */}
        {cfg.browShape === "angled" ? (
          <>
            <line x1="68" y1={body.headY - 20 + cfg.brow} x2="82" y2={body.headY - 24 + cfg.brow} stroke={ink} strokeWidth="3.2" strokeLinecap="round" />
            <line x1="98" y1={body.headY - 24 + cfg.brow} x2="112" y2={body.headY - 20 + cfg.brow} stroke={ink} strokeWidth="3.2" strokeLinecap="round" />
          </>
        ) : (
          <>
            <rect x="68" y={body.headY - 22 + cfg.brow} width="15" height="3.2" rx="1.5" fill={ink} />
            <rect x="97" y={body.headY - 22 + cfg.brow} width="15" height="3.2" rx="1.5" fill={ink} />
          </>
        )}

        {/* Eyes */}
        <g className={eyeLive ? "avatar-eye-live" : undefined}>
          <ellipse cx="76" cy={body.headY - 2} rx="5.5" ry={8 * cfg.eyeScaleY} fill={ink} />
          <ellipse cx="104" cy={body.headY - 2} rx="5.5" ry={8 * cfg.eyeScaleY} fill={ink} />
          {/* Tiny highlight */}
          {cfg.eyeScaleY > 0.3 && (
            <>
              <circle cx="74" cy={body.headY - 5} r="1.6" fill={paper} opacity="0.9" />
              <circle cx="102" cy={body.headY - 5} r="1.6" fill={paper} opacity="0.9" />
            </>
          )}
        </g>

        {/* Mouth */}
        <path
          d={cfg.mouth}
          stroke={ink}
          strokeWidth="3.2"
          fill="none"
          strokeLinecap="round"
          transform={`translate(0 ${body.headY - 82})`}
        />

        {/* Motion lines */}
        {(pose === "running" || pose === "shocked") && (
          <>
            <line x1="10" y1="92" x2="30" y2="92" stroke={ink} strokeWidth="2" opacity="0.5" />
            <line x1="8" y1="108" x2="26" y2="108" stroke={ink} strokeWidth="2" opacity="0.35" />
          </>
        )}
      </svg>
    </div>
  );
}
