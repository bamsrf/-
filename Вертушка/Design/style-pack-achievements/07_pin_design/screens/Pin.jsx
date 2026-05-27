/* Pin renderer — wraps SVG pin assets with state styling
   States: unlocked | locked | near-unlock (progress >= 0.75) | locked-empty
   Variants: default | meta (larger, gold double-rim plinth) | egg (ember rim)
   Sizes: sm 56 · md 80 · lg 96 · xl 120 · hero 200 */

const PIN_SRC = {
  A1: "pins/A1_first_record.svg",
  A2: "pins/A2_first_wishlist.svg",
  A3: "pins/A3_avatar_set.svg",
  A4: "pins/A4_public_profile.svg",
  B1: "pins/B1_starter.svg",
  B2: "pins/B2_collector.svg",
  J1: "pins/J1_first_gift.svg",
  META_F: "pins/META_foundation.svg",
  R_SELF: "pins/R_self_titled.svg",
  R_33: "pins/R_thirty_three.svg",
  /* Placeholders — already include gold rim, navy plate and lock badge */
  PH_TROPHY: "pins/PLACEHOLDER_trophy.png",
  PH_GIFT:   "pins/PLACEHOLDER_gift.png",
  PH_EGG:    "pins/PLACEHOLDER_egg.png",
};

const IS_PLACEHOLDER = (code) => code && code.startsWith("PH_");

/* Tier halo colors */
const TIER_HALO = {
  simple:   "#A5C8E1",   // 💧
  notable:  "#5B7DD8",   // 🔵
  rare:     "#E89AC0",   // 🌸
  epic:     "#1B237D",   // 🌌
  legend:   "#1A1A2E",   // ⚫
};

const GOLD = "#D9A84E";
const GOLD_HI = "#F2C770";
const GOLD_LO = "#A87E32";

/* A "locked silhouette" version of a pin — same shape rendered as engraved gold outline
   on dark navy plate. Implementation: we render an empty navy enamel disc with a gold
   double-rim and overlay a centered SVG of the pin at 35% opacity, desaturated, dim.
   This reads as "the gnezdo is here, the prize hasn't landed yet".
*/

function Halo({ tier, size, intensity = 1, animated = false, dim = false }) {
  const color = TIER_HALO[tier] || TIER_HALO.simple;
  const blur = Math.round(size * 0.18);
  const o = dim ? 0.18 : 0.55 * intensity;
  return (
    <div style={{
      position: "absolute", inset: -size * 0.12, borderRadius: "50%", zIndex: 0,
      background: `radial-gradient(closest-side, ${color} 0%, ${color}00 70%)`,
      filter: `blur(${blur * 0.4}px)`,
      opacity: o,
      animation: animated ? "halo-pulse 2.2s ease-in-out infinite" : "none",
    }}/>
  );
}

function LockBadge({ size }) {
  const s = Math.max(16, size * 0.22);
  return (
    <div style={{
      position: "absolute",
      right: `${size * 0.06}px`, bottom: `${size * 0.04}px`,
      width: s, height: s,
      borderRadius: "50%",
      background: `linear-gradient(180deg, ${GOLD_HI}, ${GOLD}, ${GOLD_LO})`,
      boxShadow: "0 1px 0 rgba(0,0,0,.4), inset 0 -1px 0 rgba(0,0,0,.3)",
      display: "grid", placeItems: "center",
      zIndex: 4,
    }}>
      <svg viewBox="0 0 24 24" width={s * 0.6} height={s * 0.6} fill="none">
        <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="#0B1438" strokeWidth="2.2" strokeLinecap="round"/>
        <rect x="6" y="11" width="12" height="9" rx="1.5" fill="#0B1438"/>
        <circle cx="12" cy="15" r="1.4" fill={GOLD_HI}/>
      </svg>
    </div>
  );
}

function ProgressRing({ size, progress }) {
  const r = size * 0.46;
  const c = 2 * Math.PI * r;
  const dash = c * progress;
  return (
    <svg style={{
      position: "absolute", inset: -size * 0.04, width: size * 1.08, height: size * 1.08, zIndex: 3,
      transform: "rotate(-90deg)",
    }} viewBox={`0 0 ${size * 1.08} ${size * 1.08}`}>
      <defs>
        <linearGradient id={`pg-${size}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={GOLD_HI}/>
          <stop offset="1" stopColor="#E85A2A"/>
        </linearGradient>
      </defs>
      <circle cx={size * 0.54} cy={size * 0.54} r={r}
        stroke={GOLD} strokeOpacity=".18" strokeWidth="2" fill="none"/>
      <circle cx={size * 0.54} cy={size * 0.54} r={r}
        stroke={`url(#pg-${size})`} strokeWidth="2.6" strokeLinecap="round" fill="none"
        strokeDasharray={`${dash} ${c}`}>
        <animate attributeName="stroke-opacity" values=".6;1;.6" dur="2.2s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
}

function Pin({
  code, tier = "simple", size = 80, state = "unlocked", progress = 0,
  variant = "default", animated = false
}) {
  const src = PIN_SRC[code];
  const locked = state === "locked";
  const isMeta = variant === "meta";
  const isEgg = variant === "egg";
  const isPH = IS_PLACEHOLDER(code);

  /* Placeholder pins are self-contained illustrations (own rim + lock badge).
     Render them at full size without our locked filters / plinth. */
  if (isPH) {
    return (
      <div style={{
        position: "relative", width: size, height: size, display: "grid", placeItems: "center",
      }}>
        <img src={src} alt="" style={{
          width: "100%", height: "100%", objectFit: "contain",
          filter: locked
            ? "drop-shadow(0 3px 5px rgba(0,0,0,.35))"
            : "drop-shadow(0 3px 5px rgba(0,0,0,.35))",
        }}/>
      </div>
    );
  }

  const padPin = isMeta ? size * 0.12 : 0;
  const innerSize = size - padPin * 2;

  // META variant — render on plinth (navy plate with double gold rim)
  if (isMeta) {
    return (
      <div style={{
        position: "relative", width: size, height: size,
        display: "grid", placeItems: "center",
      }}>
        {/* Halo behind */}
        {!locked && <Halo tier={tier} size={size} animated={animated}/>}
        {/* Plate */}
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: size * 0.18,
          background: "linear-gradient(180deg, #15205A 0%, #0B1438 60%, #070C24 100%)",
          boxShadow: locked
            ? "inset 0 0 0 1px rgba(217,168,78,.35), inset 0 2px 8px rgba(0,0,0,.5)"
            : `0 8px 20px -8px rgba(0,0,0,.6), 0 0 0 1px ${GOLD}88 inset, 0 0 0 3px #0B1438 inset, 0 0 0 4px ${GOLD}66 inset`,
        }}/>
        {/* Inner gold double frame */}
        <div style={{
          position: "absolute",
          inset: size * 0.08,
          borderRadius: size * 0.12,
          border: `1.5px solid ${locked ? GOLD + "55" : GOLD}`,
          boxShadow: locked
            ? "none"
            : `0 0 0 1px #0B1438, 0 0 0 2.5px ${GOLD_HI}`,
        }}/>
        {/* Pin svg */}
        <img src={src} alt="" style={{
          position: "relative", zIndex: 2,
          width: innerSize, height: innerSize, overflow: "visible",
          filter: locked
            ? "saturate(0) brightness(.38) contrast(1.05) opacity(.5)"
            : "drop-shadow(0 4px 6px rgba(0,0,0,.3))",
          mixBlendMode: locked ? "luminosity" : "normal",
        }}/>
        {locked && <LockBadge size={size}/>}
      </div>
    );
  }

  // EGG variant — same idea but ember rim
  if (isEgg) {
    return (
      <div style={{ position: "relative", width: size, height: size, display: "grid", placeItems: "center" }}>
        {!locked && (
          <div style={{
            position: "absolute", inset: -size * 0.12, borderRadius: "50%",
            background: "radial-gradient(closest-side, #E85A2A 0%, #E85A2A00 65%)",
            opacity: .35, filter: `blur(${size * 0.08}px)`,
            animation: animated ? "halo-pulse 2.2s ease-in-out infinite" : "none",
          }}/>
        )}
        <img src={src} alt="" style={{
          position: "relative", zIndex: 1,
          width: size * 0.92, height: size * 0.92, overflow: "visible",
          filter: locked ? "saturate(0) brightness(.45) opacity(.45)" : "drop-shadow(0 3px 4px rgba(0,0,0,.35))",
        }}/>
        {locked && <LockBadge size={size}/>}
      </div>
    );
  }

  // Default variant
  return (
    <div style={{
      position: "relative", width: size, height: size,
      display: "grid", placeItems: "center",
    }}>
      {!locked && <Halo tier={tier} size={size} animated={animated}/>}
      {state === "near" && <ProgressRing size={size} progress={progress}/>}
      <img src={src} alt="" style={{
        position: "relative", zIndex: 1,
        width: "100%", height: "100%", overflow: "visible",
        filter: locked
          ? "saturate(0) brightness(.42) contrast(1.05) opacity(.42)"
          : "drop-shadow(0 4px 5px rgba(0,0,0,.32))",
        mixBlendMode: locked ? "luminosity" : "normal",
      }}/>
      {locked && <LockBadge size={size}/>}
    </div>
  );
}

window.Pin = Pin;
window.GOLD = GOLD;
window.GOLD_HI = GOLD_HI;
window.GOLD_LO = GOLD_LO;
window.TIER_HALO = TIER_HALO;
