// Desktop profile — real, functional layout (no phone mock)

function DesktopRecordCard({ r, onClick }) {
  const fmt = r.format || 'Винил';
  return (
    <div onClick={onClick} style={{ cursor:'pointer', transition:'transform 280ms cubic-bezier(.22,.7,.18,1)' }}
      onMouseEnter={e=>e.currentTarget.style.transform='translateY(-3px)'}
      onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
      <div style={{ width:'100%', aspectRatio:'1 / 1', borderRadius:14, overflow:'hidden',
        boxShadow:'0 1px 0 rgba(255,255,255,0.8) inset, 0 14px 30px -16px rgba(27,29,38,0.32), 0 2px 6px -2px rgba(27,29,38,0.1)' }}>
        <Cover r={r} size="100%" radius={0} label={false}/>
      </div>
      <div className="mono" style={{ fontSize:10, fontWeight:500, letterSpacing:'0.08em', color:'#3A4BE0', textTransform:'uppercase', marginTop:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.artist}</div>
      <div style={{ fontSize:14.5, fontWeight:600, letterSpacing:'-0.01em', color:'#1B1D26', marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:6 }}>
        <span className="tnum" style={{ fontSize:11.5, color:'#9096A6' }}>{r.year} · {fmt}</span>
        {r.reserved ? <ReservedBadge/> : <span className="tnum" style={{ fontSize:11.5, color:'#3A4BE0', fontWeight:500 }}>{formatRub(r.price)}</span>}
      </div>
    </div>
  );
}

function DesktopView() {
  const [tab, setTab] = React.useState('collection');
  const [format, setFormat] = React.useState('all');
  const items = tab==='collection' ? RECORDS : WISHLIST;
  const totalValue = useCountUp(284600, 1800);

  return (
    <div style={{ width:1280, minHeight:900, position:'relative', overflow:'hidden',
      background:
        'radial-gradient(900px 600px at 90% -8%, rgba(154,168,255,0.40), transparent 60%),' +
        'radial-gradient(700px 500px at 6% 0%, rgba(189,212,255,0.28), transparent 62%),' +
        'linear-gradient(180deg, #F4EEE6 0%, #F0EBE2 60%, #ECE6DC 100%)',
      fontFamily:'Inter Tight, sans-serif'
    }}>
      {/* Address bar */}
      <div style={{ position:'absolute', top:22, left:24, right:24, height:42, borderRadius:14,
        background:'rgba(255,255,255,0.65)', border:'1px solid rgba(255,255,255,0.8)',
        backdropFilter:'blur(14px)', display:'flex', alignItems:'center', padding:'0 14px', gap:10,
        boxShadow:'0 1px 0 rgba(255,255,255,0.8) inset, 0 4px 14px -8px rgba(27,29,38,0.1)'
      }}>
        <div style={{ display:'flex', gap:6 }}>
          <span style={{ width:10, height:10, borderRadius:'50%', background:'#F6C7D0' }}/>
          <span style={{ width:10, height:10, borderRadius:'50%', background:'#F7D4B8' }}/>
          <span style={{ width:10, height:10, borderRadius:'50%', background:'#BDD4FF' }}/>
        </div>
        <div style={{ flex:1, textAlign:'center' }} className="mono">
          <span style={{ fontSize:11.5, color:'#6B7080', letterSpacing:'0.06em' }}>vinyl-vertushka.ru / @bamsrf</span>
        </div>
        <div style={{ width:60 }}/>
      </div>

      {/* Page */}
      <div style={{ padding:'104px 80px 60px' }}>
        {/* Header row */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:48, marginBottom:48 }}>
          <div style={{ flex:1, maxWidth:680 }}>
            <div className="mono" style={{ fontSize:11, color:'#3A4BE0', letterSpacing:'0.16em', marginBottom:18 }}>ВЕРТУШКА · ПУБЛИЧНЫЙ ПРОФИЛЬ</div>
            <div style={{ display:'flex', alignItems:'center', gap:18, marginBottom:18 }}>
              <div style={{ width:64, height:64, borderRadius:'50%',
                background:'conic-gradient(from 140deg, #F6C7D0, #C9B8FF, #9AA8FF, #BDD4FF, #F7D4B8, #F6C7D0)',
                padding:3, boxShadow:'0 8px 20px -10px rgba(58,75,224,0.4)' }}>
                <div style={{ width:'100%', height:'100%', borderRadius:'50%',
                  background:'linear-gradient(135deg, #F7F4EE, #EFECE6)',
                  display:'grid', placeItems:'center',
                  fontFamily:'Inter Tight', fontWeight:600, fontSize:22, color:'#3A4BE0', letterSpacing:'-0.01em' }}>ба</div>
              </div>
              <div style={{ fontSize:48, fontWeight:600, letterSpacing:'-0.03em', color:'#1B1D26', lineHeight:1 }}>@bamsrf</div>
            </div>
            <div style={{ fontSize:15, color:'#6B7080', lineHeight:1.5, maxWidth:480, textWrap:'pretty' }}>
              Личная витрина коллекции. Друзья видят релизы и могут забронировать пластинку из вишлиста как подарок.
            </div>
          </div>

          {/* Vinyl + value */}
          <div style={{ display:'flex', alignItems:'center', gap:24 }}>
            <div>
              <div style={{ fontSize:10.5, color:'#6B7080', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:500, textAlign:'right' }}>Стоимость коллекции</div>
              <div className="tnum" style={{ fontSize:42, fontWeight:600, letterSpacing:'-0.025em', color:'#1B1D26', marginTop:8, lineHeight:1, textAlign:'right' }}>
                {totalValue.toLocaleString('ru-RU').replace(/,/g,' ')} <span style={{ fontSize:22, color:'#6B7080', fontWeight:500 }}>₽</span>
              </div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:10,
                padding:'6px 12px', borderRadius:999,
                background:'rgba(255,255,255,0.6)', border:'1px solid rgba(58,75,224,0.14)', float:'right' }}>
                <svg width="11" height="11" viewBox="0 0 10 10"><path d="M2 6l3-3 3 3" stroke="#3A4BE0" fill="none" strokeWidth="1.6" strokeLinecap="round"/></svg>
                <span className="tnum" style={{ fontSize:12, color:'#3A4BE0', fontWeight:500 }}>+4 200 ₽ за месяц</span>
              </div>
            </div>
            <Vinyl size={170}/>
          </div>
        </div>

        {/* Toolbar row */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:18, marginBottom:24,
          paddingBottom:18, borderBottom:'1px solid rgba(27,29,38,0.08)' }}>
          {/* Tabs */}
          <div style={{ display:'flex', gap:0 }}>
            {[
              ['collection','Коллекция',8],
              ['wishlist','Вишлист',3],
            ].map(([id,label,count])=>{
              const active = tab===id;
              return (
                <button key={id} onClick={()=>setTab(id)} style={{
                  background:'transparent', border:'none', cursor:'pointer',
                  padding:'10px 0', marginRight:32,
                  fontFamily:'inherit', fontSize:18, fontWeight:active?600:500,
                  color: active ? '#1B1D26' : '#9096A6',
                  letterSpacing:'-0.01em',
                  borderBottom: active ? '2px solid #3A4BE0' : '2px solid transparent',
                  transition:'all 240ms'
                }}>
                  {label} <span className="tnum" style={{ color: active ? '#3A4BE0' : '#9096A6', fontWeight:500, marginLeft:4 }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Format chips */}
          <div style={{ display:'flex', gap:6 }}>
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
                  padding:'0 14px', height:34, borderRadius:999,
                  background: active ? 'linear-gradient(180deg, #fff, #F2F0FF)' : 'rgba(255,255,255,0.55)',
                  border: active ? '1px solid rgba(58,75,224,0.2)' : '1px solid rgba(27,29,38,0.06)',
                  fontFamily:'inherit', fontSize:12.5, fontWeight:active?600:500,
                  color: active ? '#3A4BE0' : '#3A3E4D', cursor:'pointer',
                  boxShadow: active ? '0 4px 12px -6px rgba(58,75,224,0.3)' : 'none',
                  transition:'all 220ms'
                }}>{label}</button>
              );
            })}
          </div>
        </div>

        {/* Grid of records — 4 cols */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:32, rowGap:44 }}>
          {items.map(r => <DesktopRecordCard key={r.id} r={r}/> )}
        </div>

        {/* Footer line */}
        <div style={{ marginTop:60, paddingTop:24, borderTop:'1px solid rgba(27,29,38,0.08)',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div className="mono" style={{ fontSize:10.5, color:'#9096A6', letterSpacing:'0.1em' }}>VINYL-VERTUSHKA.RU · @BAMSRF</div>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <button style={{
              height:44, padding:'0 18px', borderRadius:22,
              background:'rgba(255,255,255,0.7)', border:'1px solid rgba(27,29,38,0.08)',
              fontFamily:'inherit', fontSize:13, fontWeight:500, color:'#1B1D26', cursor:'pointer',
              display:'inline-flex', alignItems:'center', gap:8
            }}>
              <ToolIcon name="share" size={13}/> Поделиться
            </button>
            <div style={{ width:240 }}><PrimaryBtn sheen>Попробовать приложение</PrimaryBtn></div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DesktopView });
