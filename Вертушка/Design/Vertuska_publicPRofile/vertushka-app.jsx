// App: compose design canvas with artboards

function PhoneFrame({ children }) {
  return (
    <div style={{ width:380, height:780, borderRadius:48, background:'#0c0e14', padding:8,
      boxShadow:'0 30px 60px -20px rgba(58,75,224,0.35), 0 14px 30px -12px rgba(27,29,38,0.22), 0 1px 0 rgba(255,255,255,0.2) inset'
    }}>
      <div style={{ width:'100%', height:'100%', borderRadius:42, overflow:'hidden', position:'relative', background:'#F4EEE6' }}>
        <div style={{ position:'absolute', top:10, left:'50%', transform:'translateX(-50%)', width:104, height:30, background:'#0c0e14', borderRadius:18, zIndex:30 }}/>
        {/* status bar */}
        <div style={{ position:'absolute', top:14, left:26, right:26, display:'flex', justifyContent:'space-between', zIndex:20,
          fontSize:12, fontWeight:600, color:'#1B1D26' }}>
          <span>9:41</span>
          <span style={{ display:'inline-flex', gap:4, alignItems:'center' }}>
            <svg width="14" height="10" viewBox="0 0 14 10"><rect x="0" y="6" width="2" height="4" fill="currentColor"/><rect x="4" y="4" width="2" height="6" fill="currentColor"/><rect x="8" y="2" width="2" height="8" fill="currentColor"/><rect x="12" y="0" width="2" height="10" fill="currentColor"/></svg>
            <svg width="18" height="10" viewBox="0 0 18 10"><rect x="0" y="0" width="14" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="1"/><rect x="1.5" y="1.5" width="9" height="5" rx="1" fill="currentColor"/><rect x="15" y="3" width="2" height="4" rx="1" fill="currentColor"/></svg>
          </span>
        </div>
        <div style={{ position:'absolute', top:44, left:0, right:0, bottom:0 }}>
          {children}
        </div>
        {/* home indicator */}
        <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)', width:140, height:4, borderRadius:2, background:'rgba(27,29,38,0.35)', zIndex:40 }}/>
      </div>
    </div>
  );
}

function App() {
  const [detailOpen, setDetailOpen] = React.useState(false);
  return (
    <DesignCanvas>
      <DCSection id="mobile" title="Публичный профиль · мобильный" subtitle="Три основных состояния · @bamsrf">
        <DCArtboard id="collection" label="01 · Коллекция · grid" width={396} height={812}>
          <PhoneFrame><ProfileScreen initialTab="collection" initialView="grid"/></PhoneFrame>
        </DCArtboard>
        <DCArtboard id="wishlist" label="02 · Вишлист · grid" width={396} height={812}>
          <PhoneFrame><ProfileScreen initialTab="wishlist" initialView="grid"/></PhoneFrame>
        </DCArtboard>
        <DCArtboard id="list" label="03 · Список · editorial catalog" width={396} height={812}>
          <PhoneFrame><ProfileScreen initialTab="collection" initialView="list"/></PhoneFrame>
        </DCArtboard>
        <DCArtboard id="detail" label="04 · Detail overlay · Забронировать" width={396} height={812}>
          <PhoneFrame><ProfileScreenWithDetail/></PhoneFrame>
        </DCArtboard>
      </DCSection>

      <DCSection id="desktop" title="Шэр-страница · desktop" subtitle="Реальная страница профиля в браузере">
        <DCArtboard id="web" label="Desktop · vinyl-vertushka.ru/@bamsrf" width={1280} height={1100}>
          <DesktopView/>
        </DCArtboard>
      </DCSection>

      <DCSection id="system" title="Мини-система" subtitle="Цвет · типографика · компоненты · motion">
        <DCArtboard id="ds" label="Design system · one-pager" width={1200} height={1400}>
          <DesignSystem/>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

// A variant that auto-opens the detail overlay for the presentation artboard
function ProfileScreenWithDetail() {
  // Render ProfileScreen and open r1 detail via a local hook mimic
  const [open, setOpen] = React.useState(true);
  return (
    <div style={{ position:'relative', width:'100%', height:'100%' }}>
      <ProfileScreen initialTab="wishlist" initialView="grid"/>
      {open && (
        <div style={{ position:'absolute', inset:0 }}>
          <DetailOverlay r={WISHLIST[0]} tab="wishlist" onClose={()=>setOpen(false)}/>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
