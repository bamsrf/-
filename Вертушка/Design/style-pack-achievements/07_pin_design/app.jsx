/* Mount design canvas with all artboards */

const { DesignCanvas, DCSection, DCArtboard } = window;

function App() {
  return (
    <DesignCanvas title="Вертушка · Ачивки" subtitle="Бархатная витрина · enamel-pin система · Phase 0">
      <DCSection id="main" title="Главный экран">
        <DCArtboard id="main-screen" label="Ачивки · Главный (390 × 2360)" width={430} height={2480} background="#EEF0F6">
          <div style={{
            width: "100%", height: "100%", display: "grid", placeItems: "center",
            padding: 10,
          }}>
            <MainScreen/>
          </div>
        </DCArtboard>
      </DCSection>

      <DCSection id="anatomy" title="Анатомия и состояния">
        <DCArtboard id="pin-states" label="Состояния пина" width={820} height={620} background="#EEF0F6">
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", padding: 20 }}>
            <PinStatesCallout/>
          </div>
        </DCArtboard>

        <DCArtboard id="series-anatomy" label="Карточка серии — разбор" width={780} height={620} background="#EEF0F6">
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", padding: 20 }}>
            <SeriesAnatomy/>
          </div>
        </DCArtboard>
      </DCSection>

      <DCSection id="hero" title="Hero · направления">
        <DCArtboard id="hero-variants" label="3 hero-варианта" width={980} height={460} background="#EEF0F6">
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", padding: 20 }}>
            <HeroVariants/>
          </div>
        </DCArtboard>
      </DCSection>

      <DCSection id="eggs" title="Пасхалки · spotlight">
        <DCArtboard id="eggs-detail" label="Сейф находок" width={430} height={860} background="#EEF0F6">
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", padding: 10 }}>
            <EasterEggsDetail/>
          </div>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

/* halo pulse keyframes */
const styleEl = document.createElement("style");
styleEl.textContent = `
@keyframes halo-pulse {
  0%, 100% { opacity: .55; transform: scale(1); }
  50% { opacity: .9; transform: scale(1.08); }
}
`;
document.head.appendChild(styleEl);

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
