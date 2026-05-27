/* Main Achievements screen — the flagship artboard */

const NAVY = "#0B1438";
const NAVY_DEEP = "#070C24";
const COBALT = "#2A4BD7";
const COBALT_SOFT = "#5C7AE8";
const IVORY = "#F4EEE6";
const EMBER = "#E85A2A";

function GroovesBg({ opacity = 0.06, originX = 0, originY = 0 }) {
  // Concentric rings as embossed pattern
  const rings = [];
  for (let i = 1; i <= 14; i++) {
    rings.push(<circle key={i} cx={originX} cy={originY} r={i * 44} fill="none"
      stroke={IVORY} strokeOpacity={opacity} strokeWidth="1"/>);
  }
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
         viewBox="0 0 350 600" preserveAspectRatio="xMidYMid slice">
      {rings}
    </svg>
  );
}

function GrainOverlay({ opacity = 0.04 }) {
  // Tiny noise via SVG fractalNoise
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/>
        <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0"/>
      </filter>
      <rect width="100%" height="100%" filter="url(#noise)"/>
    </svg>
  );
}

function GoldCapsule({ children, size = "md", tone = "gold", style = {} }) {
  const tones = {
    gold:  { bg: "linear-gradient(180deg, #F2C770 0%, #D9A84E 50%, #A87E32 100%)", color: "#0B1438", border: "#A87E32" },
    ember: { bg: "linear-gradient(180deg, #FF8C5A 0%, #E85A2A 60%, #B33D14 100%)", color: "#FBF5EA", border: "#B33D14" },
    ivory: { bg: IVORY, color: NAVY, border: "#A87E32" },
    navy:  { bg: "rgba(11,20,56,.85)", color: IVORY, border: "rgba(217,168,78,.6)" },
  };
  const sizes = {
    sm: { fs: 10, pad: "4px 8px", radius: 999, weight: 700 },
    md: { fs: 12, pad: "5px 10px", radius: 999, weight: 700 },
    lg: { fs: 13, pad: "7px 12px", radius: 999, weight: 700 },
  };
  const t = tones[tone];
  const s = sizes[size];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: t.bg, color: t.color,
      fontSize: s.fs, fontWeight: s.weight, padding: s.pad,
      borderRadius: s.radius,
      border: `1px solid ${t.border}`,
      boxShadow: tone === "gold" || tone === "ember"
        ? "inset 0 1px 0 rgba(255,255,255,.45), inset 0 -1px 0 rgba(0,0,0,.25), 0 1px 0 rgba(0,0,0,.15)"
        : "none",
      letterSpacing: ".2px",
      fontVariantNumeric: "tabular-nums",
      ...style,
    }}>{children}</span>
  );
}

function ArchetypeChip({ label = "Новичок" }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "6px 12px 6px 8px",
      background: "rgba(244,238,230,.96)",
      color: NAVY,
      fontSize: 12, fontWeight: 700, letterSpacing: ".3px",
      borderRadius: 999,
      border: `1px solid ${GOLD}`,
      boxShadow: "0 0 0 1px rgba(217,168,78,.25), 0 4px 10px rgba(11,20,56,.3)",
    }}>
      <span style={{
        width: 14, height: 14, borderRadius: 999,
        background: "linear-gradient(180deg, #F2C770, #D9A84E 60%, #A87E32)",
        boxShadow: "inset 0 -1px 0 rgba(0,0,0,.25)",
      }}/>
      Архетип · {label}
    </span>
  );
}

/* —— HERO —— */
function Hero() {
  return (
    <div style={{
      position: "relative", margin: "0 16px 22px",
      borderRadius: 24, overflow: "hidden",
      height: 290,
      background: `
        radial-gradient(120% 80% at 90% 110%, #C9A6E8 0%, #6E5BC6 28%, ${COBALT} 56%, ${NAVY_DEEP} 95%),
        linear-gradient(160deg, #1B237D, ${NAVY_DEEP})
      `,
      color: IVORY,
      boxShadow: "0 18px 40px -16px rgba(11,20,56,.55), inset 0 0 0 1px rgba(217,168,78,.18)",
    }}>
      <GrainOverlay opacity={0.07}/>
      <GroovesBg opacity={0.07} originX={350} originY={520}/>

      {/* Subtle gold corners */}
      <svg style={{ position: "absolute", top: 10, left: 10, opacity: .35 }} width="38" height="38" viewBox="0 0 38 38" fill="none">
        <path d="M2 12V6a4 4 0 0 1 4-4h6" stroke={GOLD} strokeWidth="1.2" fill="none"/>
        <path d="M5 12V8a3 3 0 0 1 3-3h4" stroke={GOLD} strokeWidth="1.2" fill="none" strokeOpacity=".6"/>
      </svg>
      <svg style={{ position: "absolute", top: 10, right: 10, opacity: .35, transform: "scaleX(-1)" }} width="38" height="38" viewBox="0 0 38 38" fill="none">
        <path d="M2 12V6a4 4 0 0 1 4-4h6" stroke={GOLD} strokeWidth="1.2" fill="none"/>
        <path d="M5 12V8a3 3 0 0 1 3-3h4" stroke={GOLD} strokeWidth="1.2" fill="none" strokeOpacity=".6"/>
      </svg>

      <div style={{ position: "absolute", inset: 0, padding: 20, display: "flex", flexDirection: "column" }}>
        {/* Top row: archetype */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-start" }}>
          <ArchetypeChip label="Новичок"/>
        </div>

        {/* Main body: trophy + counter */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
          {/* Trophy pin in gnezdo */}
          <div style={{
            position: "relative",
            width: 148, height: 148,
            flex: "0 0 auto",
          }}>
            {/* Velvet nest */}
            <div style={{
              position: "absolute", inset: 0,
              borderRadius: "50%",
              background: "radial-gradient(closest-side, rgba(232,90,42,.4), rgba(232,90,42,0) 70%)",
              filter: "blur(8px)",
            }}/>
            <div style={{
              position: "absolute", inset: 6,
              borderRadius: "50%",
              background: "radial-gradient(closest-side, #1B237D, #0B1438 75%)",
              boxShadow: `inset 0 0 0 2px ${GOLD}, inset 0 0 0 3px ${NAVY_DEEP}, inset 0 0 0 4px ${GOLD}aa, 0 8px 16px -6px rgba(0,0,0,.5)`,
            }}/>
            <img src="pins/A1_first_record.svg" alt="" style={{
              position: "absolute", inset: 18, width: "calc(100% - 36px)", height: "calc(100% - 36px)",
              overflow: "visible",
              filter: "drop-shadow(0 4px 8px rgba(0,0,0,.4))",
            }}/>
            {/* Sparkle */}
            <svg style={{ position: "absolute", top: 4, right: 8 }} width="14" height="14" viewBox="0 0 14 14">
              <path d="M7 0L8 6L14 7L8 8L7 14L6 8L0 7L6 6Z" fill={GOLD_HI}/>
            </svg>
          </div>

          {/* Counter */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Rubik Mono One', sans-serif",
              fontSize: 56, lineHeight: .9, letterSpacing: -1,
              color: IVORY,
              textShadow: "0 2px 0 rgba(0,0,0,.25)",
              fontVariantNumeric: "tabular-nums",
            }}>
              4<span style={{ color: GOLD, opacity: .85, fontSize: 38, margin: "0 4px" }}>/</span>
              <span style={{ color: "rgba(244,238,230,.55)", fontSize: 38 }}>71</span>
            </div>
            <div style={{
              marginTop: 4,
              fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase",
              color: "rgba(244,238,230,.65)", fontWeight: 600,
            }}>ачивок открыто</div>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <GoldCapsule tone="ember" size="sm">🥚 Пасхалки · 1</GoldCapsule>
          <GoldCapsule tone="navy" size="sm">Свежее · 2&nbsp;дня&nbsp;назад</GoldCapsule>
        </div>
      </div>
    </div>
  );
}

/* —— META TROPHY SHELF —— */
function MetaShelf() {
  const items = [
    { code: "META_F", label: "На борту", series: "Первые шаги", state: "near", tier: "notable", progress: .8 },
    { code: "PH_TROPHY", label: "Фонотека", series: "Размер коллекции", state: "locked", tier: "legend" },
    { code: "PH_TROPHY", label: "Грааль", series: "Охота за редкостями", state: "locked", tier: "epic" },
    { code: "PH_TROPHY", label: "Щедрость", series: "Дарящая рука", state: "locked", tier: "epic" },
  ];
  return (
    <div style={{ margin: "0 16px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "0 4px" }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -.4, color: NAVY }}>Главные трофеи</div>
          <div style={{ fontSize: 12, color: "#4B5476", marginTop: 2 }}>финал каждой серии</div>
        </div>
        <GoldCapsule tone="gold" size="md">0 / 8</GoldCapsule>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {items.map((m, i) => (
          <div key={i} style={{
            position: "relative", aspectRatio: "0.82 / 1",
            borderRadius: 18, overflow: "hidden",
            background: "linear-gradient(180deg, #15205A 0%, #0B1438 60%, #070C24 100%)",
            boxShadow: m.state === "near"
              ? `inset 0 0 0 2px ${GOLD}, 0 8px 18px -10px rgba(11,20,56,.55), 0 0 26px -4px rgba(232,90,42,.4)`
              : `inset 0 0 0 1.5px ${GOLD}55, 0 8px 18px -10px rgba(11,20,56,.55)`,
            padding: "16px 12px 14px",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
          }}>
            <GroovesBg opacity={0.04} originX={0} originY={400}/>
            {/* Top kicker */}
            <div style={{
              fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase",
              color: GOLD, fontWeight: 700, opacity: m.state === "near" ? 1 : .55,
            }}>{m.series}</div>

            {/* Pin */}
            <div style={{ position: "relative", margin: "4px 0" }}>
              {m.state === "near"
                ? <Pin code="META_F" size={118} tier={m.tier} state="unlocked" animated/>
                : <Pin code={m.code} size={118} tier={m.tier} state="locked"/>
              }
            </div>

            {/* Label */}
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: 14, fontWeight: 700, letterSpacing: -.2,
                color: IVORY, opacity: m.state === "near" ? 1 : .55,
              }}>{m.label}</div>
              {m.state === "near" ? (
                <div style={{ marginTop: 4, fontSize: 10, color: GOLD, fontWeight: 700, letterSpacing: .5 }}>
                  ОСТАЛАСЬ 1 АЧИВКА
                </div>
              ) : (
                <div style={{ marginTop: 4, fontSize: 10, color: "rgba(244,238,230,.4)", fontWeight: 600, letterSpacing: .5 }}>
                  ЗАПЕРТО
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Helper for LockBadge inside this file */
function LockBadge({ size }) {
  const s = Math.max(18, size * 0.18);
  return (
    <div style={{
      position: "absolute",
      right: `8%`, bottom: `8%`,
      width: s, height: s,
      borderRadius: "50%",
      background: `linear-gradient(180deg, ${GOLD_HI}, ${GOLD}, ${GOLD_LO})`,
      boxShadow: "0 1px 0 rgba(0,0,0,.4), inset 0 -1px 0 rgba(0,0,0,.3)",
      display: "grid", placeItems: "center",
      zIndex: 4,
    }}>
      <svg viewBox="0 0 24 24" width={s * 0.6} height={s * 0.6} fill="none">
        <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="#0B1438" strokeWidth="2.4" strokeLinecap="round"/>
        <rect x="6" y="11" width="12" height="9" rx="1.6" fill="#0B1438"/>
        <circle cx="12" cy="15" r="1.4" fill={GOLD_HI}/>
      </svg>
    </div>
  );
}

/* —— SERIES CARD —— */
function SeriesCard({ emoji, title, description, count, total, pins, accent = "default" }) {
  return (
    <div style={{
      position: "relative", margin: "0 16px 16px",
      borderRadius: 22, overflow: "hidden",
      background: "linear-gradient(180deg, #15205A 0%, #0B1438 70%, #070C24 100%)",
      color: IVORY,
      boxShadow: "0 16px 30px -18px rgba(11,20,56,.55), inset 0 0 0 1px rgba(217,168,78,.12)",
      padding: 18,
    }}>
      <GroovesBg opacity={0.05} originX={0} originY={-20}/>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24, lineHeight: 1 }}>{emoji}</span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -.3 }}>{title}</div>
            <div style={{ fontSize: 12, color: "rgba(244,238,230,.55)", marginTop: 1 }}>{description}</div>
          </div>
        </div>
        <GoldCapsule tone="gold" size="md">{count} / {total}</GoldCapsule>
      </div>

      {/* Progress thread under header */}
      <div style={{
        height: 1, background: "rgba(217,168,78,.18)",
        margin: "14px 0 16px", position: "relative",
      }}>
        <div style={{
          position: "absolute", left: 0, top: -.5, height: 2,
          width: `${(count / total) * 100}%`,
          background: `linear-gradient(90deg, ${GOLD_HI}, ${GOLD})`,
          borderRadius: 2,
          boxShadow: `0 0 8px ${GOLD}`,
        }}/>
        <div style={{
          position: "absolute",
          left: `${(count / total) * 100}%`, top: -3.5, transform: "translateX(-50%)",
          width: 8, height: 8, borderRadius: 999,
          background: GOLD_HI,
          boxShadow: `0 0 6px ${GOLD}, 0 0 0 2px ${NAVY}`,
        }}/>
      </div>

      {/* Pin grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px 8px",
        position: "relative",
      }}>
        {pins.map((p, i) => (
          <PinSlot key={i} {...p}/>
        ))}
      </div>
    </div>
  );
}

function PinSlot({ code, label, tier, state, progress, isMeta, sub }) {
  const size = isMeta ? 92 : 76;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <Pin code={code} size={size} tier={tier} state={state} progress={progress}
        variant={isMeta ? "meta" : "default"} animated={state === "near"}/>
      <div style={{ textAlign: "center", maxWidth: 100 }}>
        <div style={{
          fontSize: 11.5, fontWeight: isMeta ? 800 : 600,
          color: state === "locked" ? "rgba(244,238,230,.45)" : IVORY,
          lineHeight: 1.15, letterSpacing: -.1,
        }}>{label}</div>
        {sub && (
          <div style={{
            fontSize: 9.5, fontWeight: 700,
            color: state === "near" ? GOLD : "rgba(244,238,230,.45)",
            letterSpacing: .3, marginTop: 2, fontVariantNumeric: "tabular-nums",
          }}>{sub}</div>
        )}
      </div>
    </div>
  );
}

/* —— EASTER EGGS BLOCK —— */
function EasterEggs() {
  return (
    <div style={{
      position: "relative", margin: "0 16px 16px",
      borderRadius: 22, overflow: "hidden",
      background: "linear-gradient(180deg, #1A0F2A 0%, #0B1438 50%, #2A0F08 130%)",
      color: IVORY,
      boxShadow: `0 16px 30px -18px rgba(11,20,56,.55), inset 0 0 0 1.5px ${EMBER}55, 0 0 30px -10px ${EMBER}66`,
      padding: 18,
    }}>
      <GroovesBg opacity={0.05} originX={350} originY={400}/>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22, filter: "drop-shadow(0 0 8px rgba(232,90,42,.6))" }}>🥚</span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -.3 }}>Пасхалки</div>
            <div style={{ fontSize: 12, color: "rgba(244,238,230,.6)", marginTop: 1, fontStyle: "italic" }}>
              Их находят сами. Не подсматривай.
            </div>
          </div>
        </div>
        <GoldCapsule tone="ember" size="md">1 открыто</GoldCapsule>
      </div>

      <div style={{ height: 1, background: `${EMBER}44`, margin: "14px 0 16px" }}/>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {/* Unlocked */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <Pin code="R_SELF" size={72} tier="rare" state="unlocked" variant="egg" animated/>
          <div style={{ fontSize: 10, fontWeight: 700, color: IVORY }}>Тёзка</div>
        </div>
        {/* Placeholder cracked eggs for locked */}
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <Pin code="PH_EGG" size={72} state="locked"/>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(244,238,230,.4)", letterSpacing: .3 }}>???</div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 14, padding: "10px 12px",
        background: "rgba(11,20,56,.5)", borderRadius: 12,
        border: `1px dashed ${EMBER}66`,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{ fontSize: 18 }}>✦</div>
        <div style={{ fontSize: 11, color: "rgba(244,238,230,.7)", lineHeight: 1.35 }}>
          В каталоге ещё <b style={{ color: EMBER }}>~11</b> сюрпризов. Без подсказок, без счётчика.
        </div>
      </div>
    </div>
  );
}

function CrackedEgg({ index }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: 64, height: 64, display: "grid", placeItems: "center" }}>
        <svg width="64" height="64" viewBox="0 0 64 64">
          {/* Egg silhouette */}
          <defs>
            <radialGradient id={`egg-${index}`} cx=".5" cy=".35" r=".7">
              <stop offset="0" stopColor="#1B237D" stopOpacity=".7"/>
              <stop offset="1" stopColor="#070C24"/>
            </radialGradient>
          </defs>
          <path d="M32 6c-9 0-18 14-18 28c0 12 8 22 18 22s18-10 18-22c0-14-9-28-18-28z"
                fill={`url(#egg-${index})`}
                stroke={GOLD} strokeWidth="1.2" strokeOpacity=".6"/>
          {/* Crack */}
          <path d="M26 28 L31 32 L28 35 L34 38 L31 42" fill="none"
                stroke={GOLD_HI} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity=".75"/>
          {/* Sparkle through crack */}
          <circle cx="31" cy="36" r="1.2" fill={EMBER}/>
        </svg>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(244,238,230,.4)", letterSpacing: .3 }}>???</div>
    </div>
  );
}

/* —— RECENT FEED —— */
function RecentlyOpened() {
  const rows = [
    { date: "10 мая", code: "R_self_titled", title: "Тёзка", tier: "🌸 Редкая", color: "#E89AC0" },
    { date: "08 мая", code: "B1_starter", title: "Десятка", tier: "💧 Простая", color: "#A5C8E1" },
    { date: "06 мая", code: "A3_avatar_set", title: "Аватар", tier: "💧 Простая", color: "#A5C8E1" },
    { date: "06 мая", code: "A1_first_record", title: "Поехали", tier: "💧 Простая", color: "#A5C8E1" },
  ];
  return (
    <div style={{ margin: "0 16px 28px" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 10, padding: "0 4px",
      }}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: -.2, color: NAVY }}>Лента находок</div>
        <span style={{ fontSize: 11, color: "#7B85A2", fontWeight: 600 }}>все →</span>
      </div>
      <div style={{
        background: "#fff", borderRadius: 18,
        boxShadow: "0 4px 12px -6px rgba(11,20,56,.18), 0 0 0 1px rgba(11,20,56,.05)",
        padding: "6px 14px", overflow: "hidden",
      }}>
        {rows.map((r, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 0",
            borderBottom: i < rows.length - 1 ? "1px solid #EDEFF6" : "none",
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: r.color, flex: "0 0 auto" }}/>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#7B85A2", fontWeight: 600, width: 48 }}>{r.date}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: NAVY }}>{r.title}</span>
            <span style={{ fontSize: 10.5, color: "#7B85A2", fontWeight: 600 }}>{r.tier}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* —— MAIN COMPOSITION —— */
function MainScreen() {
  return (
    <PhoneShell height={2360} title="Ачивки" screenLabel="01 Main">
      <div style={{ height: "100%", overflowY: "auto", paddingTop: 8, paddingBottom: 40 }}>

        <Hero/>
        <MetaShelf/>

        {/* SERIES — Первые шаги (in-progress) */}
        <SeriesCard
          emoji="🌱" title="Первые шаги" description="онбординг и базовые жесты"
          count={3} total={6}
          pins={[
            { code: "A1", label: "Поехали",    tier: "simple",  state: "unlocked" },
            { code: "A2", label: "Хотелка",    tier: "simple",  state: "unlocked" },
            { code: "A3", label: "Аватар",     tier: "simple",  state: "unlocked" },
            { code: "A4", label: "Распахнул",  tier: "simple",  state: "near", progress: .9, sub: "почти" },
            { code: "A1", label: "Полка-двойник", tier: "simple", state: "locked" },
            { code: "META_F", label: "На борту", tier: "notable", state: "locked", isMeta: true, sub: "META" },
          ]}
        />

        {/* SERIES — Размер коллекции */}
        <SeriesCard
          emoji="📚" title="Размер коллекции" description="главная вертикаль"
          count={1} total={7}
          pins={[
            { code: "B1", label: "Десятка",    tier: "simple",  state: "unlocked" },
            { code: "B2", label: "Полтинник",  tier: "simple",  state: "near", progress: .7, sub: "34 / 50" },
            { code: "B2", label: "Архивариус", tier: "notable", state: "locked", sub: "100" },
            { code: "B2", label: "Куратор",    tier: "rare",    state: "locked", sub: "250" },
            { code: "B2", label: "Хранитель",  tier: "epic",    state: "locked", sub: "500" },
            { code: "B2", label: "Фонотека",   tier: "legend",  state: "locked", isMeta: true, sub: "META" },
          ]}
        />

        <EasterEggs/>

        {/* SERIES — Дарящая рука */}
        <SeriesCard
          emoji="🎁" title="Дарящая рука" description="подарки разным людям"
          count={1} total={7}
          pins={[
            { code: "J1",        label: "Подарил",  tier: "simple",  state: "unlocked" },
            { code: "PH_GIFT",   label: "Долетело", tier: "simple",  state: "locked" },
            { code: "PH_GIFT",   label: "С теплом", tier: "simple",  state: "locked" },
            { code: "PH_GIFT",   label: "Праздник", tier: "rare",    state: "locked", sub: "×10" },
            { code: "PH_GIFT",   label: "В точку",  tier: "rare",    state: "locked" },
            { code: "PH_TROPHY", label: "Щедрость", tier: "epic",    state: "locked", isMeta: true, sub: "META" },
          ]}
        />

        <RecentlyOpened/>

      </div>
    </PhoneShell>
  );
}

window.MainScreen = MainScreen;
window.Hero = Hero;
window.MetaShelf = MetaShelf;
window.SeriesCard = SeriesCard;
window.EasterEggs = EasterEggs;
window.RecentlyOpened = RecentlyOpened;
window.GoldCapsule = GoldCapsule;
window.GroovesBg = GroovesBg;
window.GrainOverlay = GrainOverlay;
window.NAVY = NAVY;
window.NAVY_DEEP = NAVY_DEEP;
window.COBALT = COBALT;
window.COBALT_SOFT = COBALT_SOFT;
window.IVORY = IVORY;
window.EMBER = EMBER;
