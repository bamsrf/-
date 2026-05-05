// Main mobile profile screen — Collection / Wishlist / Detail overlay (v3)

function RecordCardGrid({ r, onClick }) {
  const fmt = r.format || 'Винил';
  return (
    <div onClick={onClick} style={{
      cursor:'pointer',
      transition:'transform 280ms cubic-bezier(.22,.7,.18,1)'
    }}
    onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
    onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}
    >
      <div style={{ width:'100%', aspectRatio:'1 / 1', borderRadius:14, overflow:'hidden', position:'relative',
        boxShadow:'0 1px 0 rgba(255,255,255,0.8) inset, 0 10px 26px -14px rgba(27,29,38,0.3), 0 2px 6px -2px rgba(27,29,38,0.1)' }}>
        <Cover r={r} size="100%" radius={0} label={false} />
      </div>
      <div style={{ padding:'10px 2px 2px' }}>
        <div className="mono" style={{ fontSize:9.5, fontWeight:500, letterSpacing:'0.08em', color:'#3A4BE0', textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.artist}</div>
        <div style={{ fontSize:13.5, fontWeight:600, letterSpacing:'-0.01em', color:'#1B1D26', marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:6 }}>
          <span className="tnum" style={{ fontSize:11, color:'#9096A6' }}>{r.year} · {fmt}</span>
          {r.reserved && <ReservedBadge />}
        </div>
      </div>
    </div>
  );
}

function RecordCardList({ r, onClick, action }) {
  const fmt = r.format || 'Винил';
  return (
    <div onClick={onClick} className="card-matte" style={{
      borderRadius:18, padding:10, display:'flex', gap:14, alignItems:'center', cursor:'pointer'
    }}>
      <div style={{ width:76, height:76, borderRadius:10, overflow:'hidden', flexShrink:0 }}>
        <Cover r={r} size={76} radius={0} label={false} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div className="mono" style={{ fontSize:9.5, fontWeight:500, letterSpacing:'0.08em', color:'#3A4BE0', textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.artist}</div>
        <div style={{ fontSize:13.5, fontWeight:600, letterSpacing:'-0.01em', color:'#1B1D26', marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</div>
        <div style={{ marginTop:6, display:'flex', gap:6, alignItems:'center' }}>
          <span className="tnum" style={{ fontSize:11, color:'#9096A6' }}>{r.year} · {fmt}</span>
          {r.reserved && <ReservedBadge by={r.reservedBy}/>}
        </div>
      </div>
      {!r.reserved && action && (
        <button onClick={(e)=>{e.stopPropagation();}} style={{
          padding:'8px 12px', borderRadius:12, border:'none', cursor:'pointer',
          background:'linear-gradient(180deg, #4E5BFF, #3A4BE0)', color:'#fff',
          fontFamily:'inherit', fontWeight:600, fontSize:11.5, whiteSpace:'nowrap',
          boxShadow:'0 6px 14px -8px rgba(58,75,224,0.55)'
        }}>{action}</button>
      )}
    </div>
  );
}

// Auto-scrolling rail of recently added records
function RecentlyAddedRail({ items, onPick }) {
  const ref = React.useRef(null);
  // duplicate to enable seamless loop
  const loop = [...items, ...items];

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf, last = performance.now();
    const speed = 0.018; // px per ms — slow ambient drift
    const tick = (now) => {
      const dt = now - last; last = now;
      el.scrollLeft += speed * dt;
      // reset seamlessly when we cross half the track
      const half = el.scrollWidth / 2;
      if (el.scrollLeft >= half) el.scrollLeft -= half;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [items.length]);

  return (
    <div style={{ marginTop:6, marginBottom:6 }}>
      <div style={{ padding:'0 20px', display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:12 }}>
        <div className="mono" style={{ fontSize:10, letterSpacing:'0.12em', color:'#3A4BE0', textTransform:'uppercase', fontWeight:500 }}>Недавно добавленные</div>
        <span style={{ fontSize:11, color:'#9096A6' }}>За последний месяц</span>
      </div>
      <div
        ref={ref}
        style={{
          display:'flex', gap:12, overflowX:'auto', overflowY:'hidden',
          paddingLeft:20, paddingRight:20, paddingBottom:6,
          scrollbarWidth:'none', WebkitOverflowScrolling:'touch',
          maskImage:'linear-gradient(90deg, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%)',
          WebkitMaskImage:'linear-gradient(90deg, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%)'
        }}
      >
        {loop.map((r, i) => (
          <button key={r.id+'-'+i} onClick={()=>onPick(r)} style={{
            flexShrink:0, width:104, padding:0, border:'none', background:'transparent', cursor:'pointer', textAlign:'left'
          }}>
            <div style={{ width:104, height:104, borderRadius:12, overflow:'hidden',
              boxShadow:'0 1px 0 rgba(255,255,255,0.7) inset, 0 8px 18px -12px rgba(27,29,38,0.28), 0 2px 4px -2px rgba(27,29,38,0.08)' }}>
              <Cover r={r} size={104} radius={0} label={false}/>
            </div>
            <div className="mono" style={{ fontSize:9, color:'#3A4BE0', letterSpacing:'0.06em', textTransform:'uppercase', marginTop:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.artist}</div>
            <div style={{ fontSize:11.5, fontWeight:600, color:'#1B1D26', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Новинки storefront rail for Wishlist state
function НовинкиRail() {
  const ref = React.useRef(null);
  const loop = [...NEW_RELEASES, ...NEW_RELEASES];

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf, last = performance.now();
    const speed = 0.016;
    const tick = (now) => {
      const dt = now - last; last = now;
      el.scrollLeft += speed * dt;
      const half = el.scrollWidth / 2;
      if (el.scrollLeft >= half) el.scrollLeft -= half;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{ marginTop:6, marginBottom:6 }}>
      <div style={{ padding:'0 20px', display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:12 }}>
        <div className="mono" style={{ fontSize:10, letterSpacing:'0.12em', color:'#6B7080', textTransform:'uppercase', fontWeight:500 }}>Новинки</div>
        <span style={{ fontSize:11, color:'#9096A6' }}>Свежие релизы</span>
      </div>
      <div
        ref={ref}
        style={{
          display:'flex', gap:12, overflowX:'auto', overflowY:'hidden',
          paddingLeft:20, paddingRight:20, paddingBottom:6,
          scrollbarWidth:'none', WebkitOverflowScrolling:'touch',
          maskImage:'linear-gradient(90deg, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%)',
          WebkitMaskImage:'linear-gradient(90deg, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%)'
        }}
      >
        {loop.map((r, i) => (
          <div key={r.id+'-'+i} style={{ flexShrink:0, width:104 }}>
            <div style={{ width:104, height:104, borderRadius:12, overflow:'hidden',
              boxShadow:'0 1px 0 rgba(255,255,255,0.7) inset, 0 8px 18px -12px rgba(27,29,38,0.26), 0 2px 4px -2px rgba(27,29,38,0.08)' }}>
              <Cover r={r} size={104} radius={0} label={false}/>
            </div>
            <div className="mono" style={{ fontSize:9, color:'#9096A6', letterSpacing:'0.06em', textTransform:'uppercase', marginTop:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.artist}</div>
            <div style={{ fontSize:11.5, fontWeight:600, color:'#1B1D26', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</div>
            <div className="tnum" style={{ fontSize:11, color:'#9AA8FF', fontWeight:400, marginTop:2 }}>{r.year} · {r.format}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// "How booking works" explainer block
function BookingExplainer() {
  const steps = [
    { icon:'🔒', text:'Анонимно для владельца — он видит только «Забронировано»' },
    { icon:'📩', text:'Подтверждение на email сразу после бронирования' },
    { icon:'⏰', text:'Напоминание за 7 дней до истечения срока' },
    { icon:'📅', text:'Бронь действует 60 дней' },
  ];
  return (
    <div style={{ margin:'20px 20px 4px',
      borderRadius:18,
      background:'rgba(255,255,255,0.55)',
      border:'1px solid rgba(255,255,255,0.85)',
      boxShadow:'0 1px 0 rgba(255,255,255,0.8) inset, 0 4px 14px -8px rgba(58,75,224,0.08)',
      padding:'16px 18px',
      backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)'
    }}>
      <div style={{ fontSize:12.5, fontWeight:600, letterSpacing:'-0.005em', color:'#1B1D26', marginBottom:12 }}>Как работает бронирование</div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {steps.map((s,i) => (
          <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
            <span style={{ fontSize:14, lineHeight:1.2, flexShrink:0, marginTop:1 }}>{s.icon}</span>
            <span style={{ fontSize:12, color:'#6B7080', lineHeight:1.5 }}>{s.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReservationForm({ r, onDone }) {
  const [step, setStep] = React.useState('form');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const valid = name.trim().length >= 2 && /.+@.+\..+/.test(email);

  if (step === 'success') {
    return (
      <div style={{ animation:'fadeUp 420ms cubic-bezier(.22,.7,.18,1) both', textAlign:'center', padding:'6px 4px 2px' }}>
        <div style={{ width:56, height:56, borderRadius:'50%', margin:'0 auto 14px',
          background:'linear-gradient(180deg, rgba(201,184,255,0.55), rgba(189,212,255,0.55))',
          border:'1px solid rgba(154,168,255,0.55)',
          display:'grid', placeItems:'center',
          boxShadow:'0 10px 24px -12px rgba(58,75,224,0.45)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#3A4BE0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div style={{ fontSize:19, fontWeight:600, letterSpacing:'-0.015em', color:'#1B1D26' }}>Готово, пластинка ваша</div>
        <div style={{ fontSize:13, color:'#6B7080', marginTop:8, lineHeight:1.55, maxWidth:260, margin:'8px auto 0' }}>
          Подтверждение отправлено на <span style={{ color:'#3A4BE0', fontWeight:500 }}>{email}</span>.<br/>
          Бронь действует <span style={{ color:'#1B1D26', fontWeight:500 }}>60 дней</span> — напомним за неделю.
        </div>
        <div style={{ marginTop:18 }}>
          <GhostBtn onClick={onDone}>Закрыть</GhostBtn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation:'fadeUp 380ms cubic-bezier(.22,.7,.18,1) both' }}>
      <div style={{ fontSize:15, fontWeight:600, letterSpacing:'-0.01em', color:'#1B1D26', marginBottom:4 }}>Забронировать как подарок</div>
      <div style={{ fontSize:12, color:'#6B7080', marginBottom:14, lineHeight:1.55 }}>
        Владелец профиля вас не увидит — только метку «Забронировано». Пришлём подтверждение и напомним за 7 дней до истечения брони.
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ваше имя" style={inputStyle}/>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email для подтверждения" type="email" style={inputStyle}/>
      </div>
      <PrimaryBtn sheen={valid} onClick={() => valid && setStep('success')}>
        <span style={{ opacity: valid ? 1 : 0.65 }}>Подтвердить · бронь на 60 дней</span>
      </PrimaryBtn>
    </div>
  );
}

const inputStyle = {
  width:'100%', height:46, padding:'0 14px',
  borderRadius:14,
  background:'rgba(255,255,255,0.75)',
  border:'1px solid rgba(27,29,38,0.08)',
  boxShadow:'0 1px 0 rgba(255,255,255,0.8) inset',
  fontFamily:'inherit', fontSize:14, color:'#1B1D26',
  outline:'none',
  transition:'border-color 200ms, box-shadow 200ms'
};

function DetailOverlay({ r, tab, onClose }) {
  const [reserved, setReserved] = React.useState(r.reserved);
  const [phase, setPhase] = React.useState('detail');
  const fmt = r.format || 'Винил · 180g';

  return (
    <div style={{ position:'absolute', inset:0, zIndex:20, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
      <div onClick={onClose} style={{
        position:'absolute', inset:0,
        background:'linear-gradient(180deg, rgba(239,236,230,0.2), rgba(239,236,230,0.55))',
        backdropFilter:'blur(16px) saturate(130%)', WebkitBackdropFilter:'blur(16px) saturate(130%)',
        animation:'fadeIn 260ms ease-out'
      }} />
      <div style={{
        position:'relative',
        background:'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(247,244,238,0.92))',
        borderTopLeftRadius:28, borderTopRightRadius:28,
        border:'1px solid rgba(255,255,255,0.9)',
        boxShadow:'0 -20px 60px -20px rgba(58,75,224,0.25), 0 1px 0 rgba(255,255,255,0.9) inset',
        padding:'14px 20px 22px',
        animation:'slideUp 380ms cubic-bezier(.22,.7,.18,1)'
      }}>
        <div style={{ width:40, height:4, borderRadius:2, background:'rgba(27,29,38,0.14)', margin:'0 auto 14px' }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <span className="mono" style={{ fontSize:10, color:'#9096A6', letterSpacing:'0.08em' }}>{r.cat} · РЕЛИЗ</span>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:'50%', border:'1px solid rgba(27,29,38,0.08)', background:'rgba(255,255,255,0.7)', cursor:'pointer', display:'grid', placeItems:'center' }}>
            <ToolIcon name="close" size={12}/>
          </button>
        </div>

        <div style={{ display:'flex', justifyContent:'center', marginBottom:phase==='form-revealed' ? 12 : 18, transition:'margin 400ms ease' }}>
          <div style={{ width: phase==='form-revealed' ? 108 : 200, height: phase==='form-revealed' ? 108 : 200, transition:'all 460ms cubic-bezier(.22,.7,.18,1)', borderRadius:14, overflow:'hidden', boxShadow:'0 18px 32px -18px rgba(27,29,38,0.35)' }}>
            <Cover r={r} size={phase==='form-revealed' ? 108 : 200} radius={0} label={false}/>
          </div>
        </div>
        <div style={{ textAlign:'center', marginBottom:16 }}>
          <div className="mono" style={{ fontSize:10, fontWeight:500, letterSpacing:'0.1em', color:'#3A4BE0', textTransform:'uppercase' }}>{r.artist}</div>
          <div style={{ fontSize:phase==='form-revealed' ? 18 : 22, fontWeight:600, letterSpacing:'-0.02em', color:'#1B1D26', marginTop:4, transition:'font-size 300ms' }}>{r.title}</div>
        </div>

        {phase !== 'form-revealed' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:18 }}>
            <div className="card-matte" style={{ borderRadius:14, padding:'10px 12px' }}>
              <div style={{ fontSize:10, color:'#9096A6', textTransform:'uppercase', letterSpacing:'0.05em' }}>Год</div>
              <div className="tnum" style={{ fontSize:15, fontWeight:600, marginTop:3 }}>{r.year}</div>
            </div>
            <div className="card-matte" style={{ borderRadius:14, padding:'10px 12px' }}>
              <div style={{ fontSize:10, color:'#9096A6', textTransform:'uppercase', letterSpacing:'0.05em' }}>Формат</div>
              <div style={{ fontSize:14, fontWeight:600, marginTop:3 }}>{fmt}</div>
            </div>
            <div className="card-matte" style={{ borderRadius:14, padding:'10px 12px' }}>
              <div style={{ fontSize:10, color:'#9096A6', textTransform:'uppercase', letterSpacing:'0.05em' }}>Цена</div>
              <div className="tnum" style={{ fontSize:14, fontWeight:600, marginTop:3, color:'#3A4BE0' }}>{formatRub(r.price)}</div>
            </div>
          </div>
        )}

        {tab==='wishlist' ? (
          reserved ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10,
              padding:'14px', borderRadius:16,
              background:'linear-gradient(180deg, rgba(201,184,255,0.35), rgba(189,212,255,0.25))',
              border:'1px solid rgba(154,168,255,0.4)' }}>
              <ReservedBadge by={r.reservedBy || '@you'} />
              <button onClick={()=>setReserved(false)} style={{ background:'transparent', border:'none', color:'#3A4BE0', fontFamily:'inherit', fontWeight:500, fontSize:12.5, cursor:'pointer' }}>Отменить</button>
            </div>
          ) : phase === 'detail' ? (
            <PrimaryBtn sheen onClick={()=>setPhase('form-revealed')}>Забронировать подарок</PrimaryBtn>
          ) : (
            <ReservationForm r={r} onDone={()=>{ setReserved(true); setPhase('detail'); }}/>
          )
        ) : (
          /* Collection: removed "since year" — show neutral closing line */
          <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 2px' }}>
            <span className="mono" style={{ fontSize:10.5, color:'#9096A6', letterSpacing:'0.1em' }}>В КОЛЛЕКЦИИ @BAMSRF</span>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { transform: translateY(60px); opacity:0 } to { transform: translateY(0); opacity:1 } }
        @keyframes fadeUp { from { opacity:0; transform: translateY(14px) } to { opacity:1; transform: translateY(0) } }
        input:focus { border-color: rgba(58,75,224,0.4) !important; box-shadow: 0 0 0 3px rgba(58,75,224,0.12), 0 1px 0 rgba(255,255,255,0.8) inset !important; }
      `}</style>
    </div>
  );
}

function ProfileScreen({ initialTab='collection', initialView='grid' }) {
  const [tab, setTab] = React.useState(initialTab);
  const [view, setView] = React.useState(initialView);
  const [format, setFormat] = React.useState('all');
  const [detail, setDetail] = React.useState(null);
  const totalValue = useCountUp(284600, 1800);
  const items = tab==='collection' ? RECORDS : WISHLIST;
  // Recently added — top 5 sorted by year desc
  const recent = [...RECORDS].sort((a,b)=>b.year-a.year).slice(0,5);

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', overflow:'hidden' }}>
      {/* Calm single-toned base */}
      <div style={{ position:'absolute', inset:0,
        background:'linear-gradient(180deg, #F4EEE6 0%, #F0EBE2 60%, #ECE6DC 100%)' }}/>
      {/* Two soft hue layers cross-fading slowly — true 2.6s gradient flow */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:'radial-gradient(900px 540px at 88% -6%, rgba(154,168,255,0.42), transparent 58%), radial-gradient(620px 440px at 6% 4%, rgba(189,212,255,0.26), transparent 64%)',
        opacity: tab==='collection' ? 1 : 0,
        transition:'opacity 2600ms cubic-bezier(.4,0,.2,1)'
      }}/>
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:'radial-gradient(900px 540px at 88% -6%, rgba(201,184,255,0.42), transparent 58%), radial-gradient(620px 440px at 6% 4%, rgba(246,199,208,0.30), transparent 64%)',
        opacity: tab==='wishlist' ? 1 : 0,
        transition:'opacity 2600ms cubic-bezier(.4,0,.2,1)'
      }}/>

      <div className="phone-scroll" style={{ position:'relative', height:'100%', overflowY:'auto', overflowX:'hidden', paddingBottom:110 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px 4px' }}>
          <span className="mono" style={{ fontSize:10, letterSpacing:'0.14em', color:'#6B7080' }}>ВЕРТУШКА · ПРОФИЛЬ</span>
          <button style={{ width:34, height:34, borderRadius:'50%', border:'1px solid rgba(27,29,38,0.08)', background:'rgba(255,255,255,0.6)', cursor:'pointer', display:'grid', placeItems:'center', backdropFilter:'blur(10px)' }}>
            <ToolIcon name="share" size={14}/>
          </button>
        </div>

        {/* HERO — vinyl + value (no metric tiles) */}
        <div style={{ padding:'8px 20px 16px', position:'relative' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
            <div style={{ flex:1, minWidth:0, paddingTop:2 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
                <div style={{ width:44, height:44, borderRadius:'50%',
                  background:'conic-gradient(from 140deg, #F6C7D0, #C9B8FF, #9AA8FF, #BDD4FF, #F7D4B8, #F6C7D0)',
                  padding:2, boxShadow:'0 6px 16px -8px rgba(58,75,224,0.35)' }}>
                  <div style={{ width:'100%', height:'100%', borderRadius:'50%',
                    background:'linear-gradient(135deg, #F7F4EE, #EFECE6)',
                    display:'grid', placeItems:'center',
                    fontFamily:'Inter Tight', fontWeight:600, fontSize:15, color:'#3A4BE0', letterSpacing:'-0.01em' }}>ба</div>
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:18, fontWeight:600, letterSpacing:'-0.015em', color:'#1B1D26' }}>@bamsrf</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize:10, color:'#6B7080', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:500 }}>Стоимость коллекции</div>
                <div className="tnum" style={{ fontSize:34, fontWeight:600, letterSpacing:'-0.025em', color:'#1B1D26', marginTop:6, lineHeight:1 }}>
                  {totalValue.toLocaleString('ru-RU').replace(/,/g,' ')} <span style={{ fontSize:19, color:'#6B7080', fontWeight:500 }}>₽</span>
                </div>
                <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:10,
                  padding:'5px 10px', borderRadius:999,
                  background:'rgba(255,255,255,0.55)',
                  border:'1px solid rgba(58,75,224,0.12)' }}>
                  <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 6l3-3 3 3" stroke="#3A4BE0" fill="none" strokeWidth="1.6" strokeLinecap="round"/></svg>
                  <span className="tnum" style={{ fontSize:11, color:'#3A4BE0', fontWeight:500 }}>+4 200 ₽ за месяц</span>
                </div>
              </div>
            </div>

            <div style={{ position:'relative', marginTop:6, marginRight:-16 }}>
              <Vinyl size={150} />
            </div>
          </div>
        </div>

        {/* RAILS AREA — always same height, crossfade between tabs */}
        <div style={{ position:'relative', height:172 }}>
          <div style={{ position:'absolute', inset:0, opacity: tab==='collection' ? 1 : 0, transition:'opacity 600ms ease', pointerEvents: tab==='collection' ? 'auto' : 'none' }}>
            <RecentlyAddedRail items={recent} onPick={r=>setDetail(r)}/>
          </div>
          <div style={{ position:'absolute', inset:0, opacity: tab==='wishlist' ? 1 : 0, transition:'opacity 600ms ease', pointerEvents: tab==='wishlist' ? 'auto' : 'none' }}>
            <НовинкиRail/>
          </div>
        </div>

        {/* SEGMENTED */}
        <div style={{ padding:'14px 20px 8px' }}>
          <Segmented value={tab} onChange={setTab} items={[
            { id:'collection', label:'Коллекция', count: 8 },
            { id:'wishlist', label:'Вишлист', count: 3 },
          ]}/>
        </div>

        {/* TOOLBAR */}
        <div style={{ padding:'8px 0 14px' }}>
          <div style={{ display:'flex', gap:6, overflowX:'auto', padding:'0 20px 2px', scrollbarWidth:'none' }}>
            {[
              ['all','Все форматы'],
              ['vinyl','Винил'],
              ['cd','CD'],
              ['tape','Кассета'],
              ['box','Бокс-сет'],
            ].map(([id,label])=>{
              const active = format===id;
              return (
                <button key={id} onClick={()=>setFormat(id)} style={{
                  flexShrink:0,
                  padding:'0 14px', height:34, borderRadius:999,
                  background: active ? 'linear-gradient(180deg, #fff, #F2F0FF)' : 'rgba(255,255,255,0.6)',
                  border: active ? '1px solid rgba(58,75,224,0.2)' : '1px solid rgba(27,29,38,0.06)',
                  fontFamily:'inherit', fontSize:12, fontWeight:active?600:500,
                  color: active ? '#3A4BE0' : '#3A3E4D', cursor:'pointer',
                  boxShadow: active ? '0 4px 12px -6px rgba(58,75,224,0.3)' : 'none',
                  transition:'all 220ms'
                }}>{label}</button>
              );
            })}
          </div>
          <div style={{ padding:'12px 20px 0', display:'flex', justifyContent:'flex-end', gap:6 }}>
            <IconBtn active={view==='grid'} onClick={()=>setView('grid')} title="Сетка"><ToolIcon name="grid"/></IconBtn>
            <IconBtn active={view==='list'} onClick={()=>setView('list')} title="Список"><ToolIcon name="list"/></IconBtn>
          </div>
        </div>

        {/* FEED */}
        <div style={{ padding:'4px 20px 20px' }}>
          {view==='grid' ? (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, rowGap:22 }}>
              {items.map(r => <RecordCardGrid key={r.id} r={r} onClick={()=>setDetail(r)} />)}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {items.map(r => <RecordCardList key={r.id} r={r} onClick={()=>setDetail(r)} action={tab==='wishlist' && !r.reserved ? 'Подарить' : null} />)}
            </div>
          )}
        </div>

        <div style={{ textAlign:'center', fontSize:10, color:'#9096A6', letterSpacing:'0.1em', marginBottom:20 }} className="mono">
          VINYL-VERTUSHKA.RU
        </div>
      </div>

      <div style={{ position:'absolute', left:0, right:0, bottom:0, padding:'14px 20px 22px',
        background:'linear-gradient(180deg, transparent, rgba(244,238,230,0.92) 45%, rgba(244,238,230,0.98))',
        pointerEvents:'none' }}>
        <div style={{ pointerEvents:'auto' }}>
          <PrimaryBtn sheen>
            <span style={{ display:'inline-flex', alignItems:'center', gap:10 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="white" strokeOpacity="0.45"/><circle cx="8" cy="8" r="2" fill="white"/></svg>
              Попробовать приложение Вертушка
            </span>
          </PrimaryBtn>
        </div>
      </div>

      {detail && <DetailOverlay r={detail} tab={tab} onClose={()=>setDetail(null)} />}
    </div>
  );
}

Object.assign(window, { ProfileScreen, RecordCardGrid, RecordCardList, DetailOverlay, RecentlyAddedRail, НовинкиRail, BookingExplainer });
