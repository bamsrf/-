// Shared UI parts: Vinyl, Segmented, Toolbar, Badges, Buttons, Metric

function Vinyl({ size=170, label='вертушка', spin=true }) {
  const cx = size/2;
  return (
    <div style={{ position:'relative', width:size, height:size }}>
      {/* glow */}
      <div style={{ position:'absolute', inset:-30, borderRadius:'50%',
        background:'radial-gradient(circle at 35% 35%, rgba(154,168,255,0.55), rgba(246,199,208,0.35) 40%, transparent 68%)',
        filter:'blur(8px)' }} />
      <svg className={spin ? 'vinyl' : ''} viewBox="0 0 200 200" width={size} height={size} style={{ position:'relative', display:'block', filter:'drop-shadow(0 14px 22px rgba(27,29,38,0.28))' }}>
        <defs>
          <radialGradient id="vinyl-body" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2a2d38" />
            <stop offset="55%" stopColor="#15171f" />
            <stop offset="100%" stopColor="#0c0e14" />
          </radialGradient>
          <radialGradient id="vinyl-center" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F6C7D0" />
            <stop offset="55%" stopColor="#9AA8FF" />
            <stop offset="100%" stopColor="#3A4BE0" />
          </radialGradient>
          <linearGradient id="vinyl-shine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.12)" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="98" fill="url(#vinyl-body)" />
        {/* grooves */}
        {[92,84,76,68,60,52,44].map((r,i)=>(
          <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="0.8" />
        ))}
        <circle cx="100" cy="100" r="42" fill="url(#vinyl-center)" />
        {/* label text arc */}
        <g fontFamily="Inter Tight" fontSize="6" fill="rgba(27,29,38,0.6)" letterSpacing="1.2">
          <defs>
            <path id="arc" d="M 70 100 A 30 30 0 1 1 130 100" />
          </defs>
          <text><textPath href="#arc" startOffset="6">{label.toUpperCase()} · LP · 33 RPM ·</textPath></text>
        </g>
        <circle cx="100" cy="100" r="4" fill="#0c0e14" />
        <circle cx="100" cy="100" r="1.2" fill="rgba(255,255,255,0.35)" />
        {/* sheen */}
        <circle cx="100" cy="100" r="98" fill="url(#vinyl-shine)" opacity="0.5" />
      </svg>
    </div>
  );
}

function Segmented({ value, onChange, items }) {
  return (
    <div style={{
      position:'relative', display:'grid', gridTemplateColumns:`repeat(${items.length}, 1fr)`,
      background:'rgba(255,255,255,0.6)',
      border:'1px solid rgba(255,255,255,0.9)',
      boxShadow:'0 1px 0 rgba(255,255,255,0.8) inset, 0 6px 18px -10px rgba(58,75,224,0.25)',
      borderRadius:999, padding:4, height:44, backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)'
    }}>
      {/* active pill */}
      <div style={{
        position:'absolute', top:4, bottom:4,
        left: `calc(4px + ${items.findIndex(i=>i.id===value)} * (100% - 8px) / ${items.length})`,
        width: `calc((100% - 8px) / ${items.length})`,
        borderRadius:999,
        background:'linear-gradient(180deg, #ffffff 0%, #F2F0FF 100%)',
        boxShadow:'0 1px 0 rgba(255,255,255,0.9) inset, 0 6px 14px -8px rgba(58,75,224,0.35), 0 0 0 1px rgba(58,75,224,0.06)',
        transition:'left 420ms cubic-bezier(.22,.7,.18,1)'
      }} />
      {items.map(it => (
        <button key={it.id} onClick={()=>onChange(it.id)}
          style={{
            position:'relative', background:'transparent', border:'none', outline:'none',
            fontFamily:'inherit', fontWeight:600, fontSize:13, letterSpacing:'-0.005em',
            color: value===it.id ? '#1B1D26' : '#6B7080',
            cursor:'pointer', padding:'0 10px', transition:'color 220ms'
          }}>
          {it.label} <span className="tnum" style={{ color: value===it.id ? '#3A4BE0' : '#9096A6', marginLeft:4, fontWeight:500 }}>{it.count}</span>
        </button>
      ))}
    </div>
  );
}

function ToolIcon({ name, size=16 }) {
  const s = { width:size, height:size, stroke:'#3A3E4D', strokeWidth:1.5, fill:'none', strokeLinecap:'round', strokeLinejoin:'round' };
  if (name==='filter') return <svg viewBox="0 0 24 24" {...s}><path d="M4 6h16M7 12h10M10 18h4"/></svg>;
  if (name==='sort') return <svg viewBox="0 0 24 24" {...s}><path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/></svg>;
  if (name==='grid') return <svg viewBox="0 0 24 24" {...s}><rect x="4" y="4" width="7" height="7" rx="1.2"/><rect x="13" y="4" width="7" height="7" rx="1.2"/><rect x="4" y="13" width="7" height="7" rx="1.2"/><rect x="13" y="13" width="7" height="7" rx="1.2"/></svg>;
  if (name==='list') return <svg viewBox="0 0 24 24" {...s}><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>;
  if (name==='heart') return <svg viewBox="0 0 24 24" {...s}><path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z" fill="#3A4BE0" stroke="#3A4BE0"/></svg>;
  if (name==='share') return <svg viewBox="0 0 24 24" {...s}><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v13M7 8l5-5 5 5"/></svg>;
  if (name==='close') return <svg viewBox="0 0 24 24" {...s}><path d="M6 6l12 12M18 6L6 18"/></svg>;
  if (name==='gift') return <svg viewBox="0 0 24 24" {...s}><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M3 12h18M12 8v12M8 8a2.5 2.5 0 1 1 4-2 2.5 2.5 0 1 1 4 2"/></svg>;
  return null;
}

function IconBtn({ children, active, onClick, title }) {
  return (
    <button onClick={onClick} title={title} style={{
      width:40, height:40, borderRadius:14,
      background: active ? 'linear-gradient(180deg, #fff, #F2F0FF)' : 'rgba(255,255,255,0.6)',
      border:'1px solid rgba(255,255,255,0.85)',
      boxShadow: active
        ? '0 1px 0 rgba(255,255,255,0.9) inset, 0 4px 12px -6px rgba(58,75,224,0.35), 0 0 0 1px rgba(58,75,224,0.06)'
        : '0 1px 0 rgba(255,255,255,0.7) inset, 0 2px 6px -3px rgba(27,29,38,0.08)',
      display:'grid', placeItems:'center', cursor:'pointer', transition:'all 220ms'
    }}>{children}</button>
  );
}

function ReservedBadge({ by }) {
  return (
    <div className="pulse" style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding:'4px 9px', borderRadius:999, fontSize:10.5, fontWeight:500,
      background:'linear-gradient(180deg, rgba(201,184,255,0.6), rgba(189,212,255,0.5))',
      color:'#3A4BE0', letterSpacing:'-0.005em',
      border:'1px solid rgba(154,168,255,0.55)'
    }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:'#3A4BE0' }} />
      Забронировано{by ? ` · ${by}` : ''}
    </div>
  );
}

function PrimaryBtn({ children, width='100%', height=52, onClick, sheen=false }) {
  return (
    <button onClick={onClick} style={{
      position:'relative', overflow:'hidden', width, height,
      borderRadius: height/2, border:'none', cursor:'pointer',
      background:'linear-gradient(180deg, #4E5BFF 0%, #3A4BE0 60%, #2F3DC8 100%)',
      color:'#fff', fontFamily:'inherit', fontWeight:600, fontSize:15, letterSpacing:'-0.01em',
      boxShadow:'0 1px 0 rgba(255,255,255,0.3) inset, 0 -1px 0 rgba(0,0,0,0.15) inset, 0 14px 28px -12px rgba(58,75,224,0.55), 0 4px 10px -4px rgba(27,29,38,0.2)',
      transition:'transform 220ms cubic-bezier(.22,.7,.18,1)'
    }}
    className={sheen ? 'sheen' : ''}
    onMouseDown={e=>e.currentTarget.style.transform='scale(0.985)'}
    onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
    onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
    >{children}</button>
  );
}

function GhostBtn({ children, onClick, width='100%' }) {
  return (
    <button onClick={onClick} style={{
      width, height:44, borderRadius:14, cursor:'pointer',
      background:'rgba(255,255,255,0.7)', color:'#1B1D26',
      border:'1px solid rgba(27,29,38,0.08)',
      boxShadow:'0 1px 0 rgba(255,255,255,0.8) inset',
      fontFamily:'inherit', fontWeight:500, fontSize:13.5
    }}>{children}</button>
  );
}

function Metric({ value, label, mono=false, color='#1B1D26', size=22 }) {
  return (
    <div>
      <div className={mono ? 'mono tnum' : 'tnum'} style={{ fontSize:size, fontWeight:600, color, letterSpacing:'-0.02em', lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:10.5, color:'#6B7080', marginTop:6, letterSpacing:'0.04em', textTransform:'uppercase', fontWeight:500 }}>{label}</div>
    </div>
  );
}

// Animated counter
function useCountUp(target, duration=1600) {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    let raf, start;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

function formatRub(n) {
  return n.toLocaleString('ru-RU').replace(/,/g,' ') + ' ₽';
}

Object.assign(window, { Vinyl, Segmented, ToolIcon, IconBtn, ReservedBadge, PrimaryBtn, GhostBtn, Metric, useCountUp, formatRub });
