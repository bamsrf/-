/* Detail artboards — pin state callouts + hero variants + series card detail */

function PinStatesCallout() {
  const States = ({ title, children }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{
        background: "linear-gradient(180deg, #15205A 0%, #0B1438 70%, #070C24 100%)",
        borderRadius: 18, padding: 24, width: 140, height: 140,
        display: "grid", placeItems: "center",
        boxShadow: "inset 0 0 0 1px rgba(217,168,78,.15)", position: "relative",
      }}>
        <GroovesBg opacity={0.05} originX={0} originY={0}/>
        {children}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, textAlign: "center" }}>{title}</div>
    </div>
  );

  return (
    <div style={{
      width: 760, padding: 36, background: "#FFFFFF",
      borderRadius: 20, boxShadow: "0 4px 12px -6px rgba(11,20,56,.18), 0 0 0 1px rgba(11,20,56,.06)",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", fontWeight: 700,
          color: "#7B85A2", marginBottom: 6,
        }}>callout · pin states</div>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -.5, color: NAVY }}>Состояния пина</div>
        <div style={{ fontSize: 13, color: "#4B5476", marginTop: 4, maxWidth: 540 }}>
          Запертый пин = пустое гнездо: navy подложка, золотой outline, замочек правый-нижний.
          Прогресс показывается золотой дугой по кругу. Мета — двойная золотая рамка + крупнее.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18, marginBottom: 30 }}>
        <States title="Locked">
          <Pin code="B2" size={80} tier="simple" state="locked"/>
        </States>
        <States title="Near unlock · 70%">
          <Pin code="B2" size={80} tier="simple" state="near" progress={0.7} animated/>
        </States>
        <States title="Unlocked">
          <Pin code="A1" size={80} tier="simple" state="unlocked" animated/>
        </States>
        <States title="Meta locked · placeholder">
          <Pin code="PH_TROPHY" size={92} state="locked"/>
        </States>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
        <States title="Meta near">
          <Pin code="META_F" size={92} tier="notable" state="unlocked" variant="meta" animated/>
        </States>
        <States title="Easter egg ✓">
          <Pin code="R_SELF" size={72} tier="rare" state="unlocked" variant="egg" animated/>
        </States>
        <States title="Halo · 🌸 rare">
          <Pin code="R_33" size={84} tier="rare" state="unlocked"/>
        </States>
        <States title="Halo · 🔵 notable">
          <Pin code="J1" size={84} tier="notable" state="unlocked"/>
        </States>
      </div>

      <div style={{
        marginTop: 28, display: "flex", gap: 16, flexWrap: "wrap",
        fontSize: 11, color: "#4B5476",
      }}>
        {[
          { c: "#A5C8E1", l: "💧 Простая · ≥30% юзеров" },
          { c: "#5B7DD8", l: "🔵 Заметная · 5–30%" },
          { c: "#E89AC0", l: "🌸 Редкая · 1–5%" },
          { c: "#1B237D", l: "🌌 Эпическая · 0.1–1%" },
          { c: "#1A1A2E", l: "⚫ Легенда · <0.1%" },
        ].map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              width: 14, height: 14, borderRadius: 999, background: t.c,
              boxShadow: `0 0 8px ${t.c}`,
            }}/>
            <span style={{ fontWeight: 600 }}>{t.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroVariants() {
  // Two more hero treatments — vinyl-platter and ticket-stub style
  return (
    <div style={{
      width: 920, padding: 36, background: "#FFFFFF",
      borderRadius: 20, boxShadow: "0 4px 12px -6px rgba(11,20,56,.18), 0 0 0 1px rgba(11,20,56,.06)",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", fontWeight: 700, color: "#7B85A2", marginBottom: 6 }}>
          callout · hero · 3 направления
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -.5, color: NAVY }}>Бархатная витрина</div>
        <div style={{ fontSize: 13, color: "#4B5476", marginTop: 4, maxWidth: 540 }}>
          Слева — основной (gradient + grain). Центр — медальон с пластинкой-аурой. Справа — раскрытая шкатулка (ticket-stub).
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {/* A — main */}
        <div style={{ width: "100%" }}>
          <HeroMini variant="velvet"/>
          <div style={{ marginTop: 10, fontSize: 11.5, color: "#7B85A2", fontWeight: 600 }}>A · бархат + ауры</div>
        </div>
        {/* B — vinyl platter */}
        <div style={{ width: "100%" }}>
          <HeroMini variant="platter"/>
          <div style={{ marginTop: 10, fontSize: 11.5, color: "#7B85A2", fontWeight: 600 }}>B · пластинка-аура</div>
        </div>
        {/* C — open box */}
        <div style={{ width: "100%" }}>
          <HeroMini variant="box"/>
          <div style={{ marginTop: 10, fontSize: 11.5, color: "#7B85A2", fontWeight: 600 }}>C · шкатулка</div>
        </div>
      </div>
    </div>
  );
}

function HeroMini({ variant }) {
  const base = {
    position: "relative", borderRadius: 20, overflow: "hidden",
    height: 240, color: IVORY,
    boxShadow: "0 18px 40px -16px rgba(11,20,56,.5)",
  };
  if (variant === "velvet") {
    return (
      <div style={{
        ...base,
        background: `
          radial-gradient(120% 80% at 90% 110%, #C9A6E8 0%, #6E5BC6 28%, ${COBALT} 56%, ${NAVY_DEEP} 95%)`,
      }}>
        <GrainOverlay opacity={.08}/>
        <div style={{ position: "absolute", inset: 14, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ alignSelf: "flex-end" }}>
            <span style={{
              padding: "5px 9px", borderRadius: 999, fontSize: 10, fontWeight: 700,
              background: IVORY, color: NAVY, border: `1px solid ${GOLD}`,
            }}>Новичок</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative", width: 90, height: 90 }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
                background: "radial-gradient(closest-side, #1B237D, #0B1438 80%)",
                boxShadow: `inset 0 0 0 2px ${GOLD}, inset 0 0 0 3px ${NAVY_DEEP}, inset 0 0 0 4px ${GOLD}88` }}/>
              <img src="pins/A1_first_record.svg" style={{ position: "absolute", inset: 12, width: 66, height: 66, overflow: "visible" }}/>
            </div>
            <div>
              <div style={{ fontFamily: "'Rubik Mono One', sans-serif", fontSize: 38, lineHeight: 1 }}>
                4<span style={{ color: GOLD, fontSize: 24 }}>/</span><span style={{ opacity: .55, fontSize: 24 }}>71</span>
              </div>
              <div style={{ fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase", opacity: .65, marginTop: 4 }}>ачивок</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (variant === "platter") {
    return (
      <div style={{
        ...base,
        background: `linear-gradient(160deg, #1B237D 0%, ${NAVY_DEEP} 100%)`,
      }}>
        {/* Big platter behind */}
        <div style={{
          position: "absolute", top: -90, right: -90, width: 280, height: 280,
          borderRadius: "50%",
          background: `repeating-radial-gradient(circle, #1A1A2E 0px, #14142A 1.5px, #1A1A2E 3px)`,
          boxShadow: `inset 0 0 0 2px ${GOLD}, inset 0 0 0 60px transparent`,
          opacity: .9,
        }}/>
        <div style={{
          position: "absolute", top: 10, right: 10, width: 80, height: 80, borderRadius: "50%",
          background: EMBER,
          boxShadow: `inset 0 0 0 2px ${GOLD}, 0 0 28px ${EMBER}`,
        }}/>
        <div style={{ position: "absolute", inset: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{
            fontSize: 9, letterSpacing: 1.6, textTransform: "uppercase", fontWeight: 700, opacity: .55,
          }}>SIDE A · ачивки</div>
          <div>
            <div style={{ fontFamily: "'Rubik Mono One', sans-serif", fontSize: 48, lineHeight: .9 }}>
              4<span style={{ color: GOLD, fontSize: 30 }}>/</span><span style={{ opacity: .55, fontSize: 30 }}>71</span>
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
              <span style={{ padding: "4px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: IVORY, color: NAVY, border: `1px solid ${GOLD}` }}>Новичок</span>
              <span style={{ padding: "4px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: `linear-gradient(180deg, #FF8C5A, ${EMBER})`, color: IVORY }}>🥚 ·&nbsp;1</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // box
  return (
    <div style={{
      ...base,
      background: `linear-gradient(170deg, #2A4BD7 0%, #1B237D 60%, ${NAVY_DEEP} 100%)`,
    }}>
      {/* Open box lid */}
      <div style={{
        position: "absolute", top: -10, left: 16, right: 16, height: 80,
        background: "linear-gradient(180deg, #15205A, #0B1438)",
        borderRadius: "14px 14px 4px 4px",
        boxShadow: `inset 0 0 0 1.5px ${GOLD}`,
        transform: "perspective(400px) rotateX(-30deg)",
        transformOrigin: "bottom center",
        opacity: .85,
      }}>
        <div style={{
          position: "absolute", inset: "8px 14px 14px",
          border: `1px solid ${GOLD}66`, borderRadius: 6,
          display: "grid", placeItems: "center",
          fontSize: 9, letterSpacing: 2, color: GOLD, fontWeight: 700,
        }}>VERTUSHKA · PINS</div>
      </div>
      <div style={{ position: "absolute", left: 18, right: 18, bottom: 18, display: "flex", alignItems: "flex-end", gap: 12 }}>
        <div style={{
          position: "relative", width: 100, height: 100,
        }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
            background: "radial-gradient(closest-side, #1B237D, #0B1438 80%)",
            boxShadow: `inset 0 0 0 2px ${GOLD}` }}/>
          <img src="pins/META_foundation.svg" style={{ position: "absolute", inset: 10, width: 80, height: 80, overflow: "visible" }}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Rubik Mono One', sans-serif", fontSize: 38, lineHeight: 1 }}>
            4<span style={{ color: GOLD, fontSize: 24 }}>/</span><span style={{ opacity: .55, fontSize: 24 }}>71</span>
          </div>
          <div style={{ fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", opacity: .7, marginTop: 4 }}>раскрыто</div>
        </div>
      </div>
    </div>
  );
}

function SeriesAnatomy() {
  return (
    <div style={{
      width: 720, padding: 36, background: "#FFFFFF",
      borderRadius: 20, boxShadow: "0 4px 12px -6px rgba(11,20,56,.18), 0 0 0 1px rgba(11,20,56,.06)",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", fontWeight: 700, color: "#7B85A2", marginBottom: 6 }}>
          callout · anatomy of a series card
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -.5, color: NAVY }}>Карточка серии</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 24, alignItems: "start" }}>
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

        <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 11.5, color: "#4B5476", paddingTop: 8 }}>
          <Anno n="1" t="Navy подложка" d="bg.deep · grooves opacity .05"/>
          <Anno n="2" t="Заголовок" d="emoji 24pt + h1 17pt 800 ivory + caption .55"/>
          <Anno n="3" t="Counter capsule" d="золотая капсула N/M"/>
          <Anno n="4" t="Golden thread" d="прогресс 3/6 — gradient thread + точка"/>
          <Anno n="5" t="Pin grid 3×N" d="76pt default · 92pt META"/>
          <Anno n="6" t="Locked silhouette" d="luminosity blend + lock badge"/>
          <Anno n="7" t="Near-unlock" d="золотая дуга по кругу"/>
        </div>
      </div>
    </div>
  );
}

function Anno({ n, t, d }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <span style={{
        flex: "0 0 22px", width: 22, height: 22, borderRadius: 999,
        background: NAVY, color: IVORY, fontSize: 11, fontWeight: 800,
        display: "grid", placeItems: "center",
      }}>{n}</span>
      <div>
        <div style={{ fontWeight: 700, color: NAVY, fontSize: 12.5 }}>{t}</div>
        <div style={{ fontSize: 11, color: "#7B85A2", marginTop: 1 }}>{d}</div>
      </div>
    </div>
  );
}

/* —— EASTER EGGS DETAIL —— */
function EasterEggsDetail() {
  return (
    <PhoneShell height={780} title="Пасхалки" screenLabel="03 Easter eggs">
      <div style={{ padding: "10px 0 30px", overflowY: "auto", height: "100%" }}>
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{
            fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase",
            color: EMBER, fontWeight: 700, marginBottom: 4,
          }}>скрытый раздел</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -.4, color: NAVY }}>Сейф находок</div>
          <div style={{ fontSize: 13, color: "#4B5476", marginTop: 4, fontStyle: "italic" }}>
            Условия не показываем. Засчитывается по факту совпадения.
          </div>
        </div>

        <EasterEggs/>

        {/* Mini gallery of recovered eggs with flavor */}
        <div style={{ margin: "0 16px", padding: "14px 16px", background: "#fff",
          borderRadius: 18, boxShadow: "0 4px 12px -6px rgba(11,20,56,.18), 0 0 0 1px rgba(11,20,56,.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, marginBottom: 12 }}>Твоя находка</div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Pin code="R_SELF" size={88} tier="rare" state="unlocked" variant="egg" animated/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: NAVY }}>Тёзка</div>
              <div style={{ fontSize: 11, color: "#7B85A2", marginTop: 1 }}>10 мая · 🌸 Редкая</div>
              <div style={{ fontSize: 12, color: "#4B5476", marginTop: 8, fontStyle: "italic", lineHeight: 1.4 }}>
                «Black Sabbath / Black Sabbath. Альбом и группа называются одинаково.»
              </div>
            </div>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

window.PinStatesCallout = PinStatesCallout;
window.HeroVariants = HeroVariants;
window.SeriesAnatomy = SeriesAnatomy;
window.EasterEggsDetail = EasterEggsDetail;
