// Record data + SVG cover placeholders. No copyrighted artwork — each cover is
// an original abstract tile evoking a mood, with monospace catalog number.

const RECORDS = [
  { id:'r1', title:'Синий час', artist:'Мельница Стекла', year:2022, format:'Винил', price:4200, palette:['#3A4BE0','#9AA8FF','#F6C7D0'], mood:'wave', cat:'ВТ-041' },
  { id:'r2', title:'Северное поле', artist:'Алиса Грин', year:2019, format:'Винил', price:3600, palette:['#1B1D26','#5A6BFF','#BDD4FF'], mood:'orbit', cat:'ВТ-042' },
  { id:'r3', title:'Hotel Étoile', artist:'Jules Mare', year:2021, format:'Бокс-сет', price:5100, palette:['#F7D4B8','#F6C7D0','#C9B8FF'], mood:'dune', cat:'ВТ-043' },
  { id:'r4', title:'Комната 7', artist:'Олег Платонов', year:2017, format:'CD', price:2800, palette:['#C9B8FF','#9AA8FF','#F7F4EE'], mood:'grid', cat:'ВТ-044' },
  { id:'r5', title:'Feldspar', artist:'Nima Ito', year:2023, format:'Винил', price:6200, palette:['#3A4BE0','#1B1D26','#BDD4FF'], mood:'arc', cat:'ВТ-045' },
  { id:'r6', title:'Тихая вода', artist:'Черновик', year:2015, format:'Кассета', price:3900, palette:['#BDD4FF','#F6C7D0','#F7F4EE'], mood:'ripple', cat:'ВТ-046' },
];

// New releases storefront — curated, not owned by the user
const NEW_RELEASES = [
  { id:'n1', title:'Glass Meridian', artist:'Odera', year:2025, format:'Винил', price:5200, palette:['#3A4BE0','#BDD4FF','#F7F4EE'], mood:'arc', cat:'НВ-001' },
  { id:'n2', title:'Вечерняя форма', artist:'Прибой', year:2025, format:'Винил', price:4800, palette:['#F6C7D0','#C9B8FF','#BDD4FF'], mood:'ripple', cat:'НВ-002' },
  { id:'n3', title:'Silt', artist:'Mara Fenn', year:2025, format:'Бокс-сет', price:8900, palette:['#F7D4B8','#9AA8FF','#F6C7D0'], mood:'dune', cat:'НВ-003' },
  { id:'n4', title:'Северный дрейф', artist:'Кейп', year:2025, format:'Кассета', price:2600, palette:['#BDD4FF','#3A4BE0','#C9B8FF'], mood:'wave', cat:'НВ-004' },
  { id:'n5', title:'Palimpsest', artist:'Jun Ohara', year:2025, format:'Винил', price:6400, palette:['#C9B8FF','#F7D4B8','#9AA8FF'], mood:'bloom', cat:'НВ-005' },
  { id:'n6', title:'Белый шум', artist:'Шторм', year:2025, format:'CD', price:3200, palette:['#9AA8FF','#BDD4FF','#F7F4EE'], mood:'grid', cat:'НВ-006' },
];

const WISHLIST = [
  { id:'w1', title:'Lunaria', artist:'Hana Torres', year:2024, format:'Винил', price:5800, palette:['#F6C7D0','#C9B8FF','#F7D4B8'], mood:'bloom', cat:'ВТ-112', reserved:false },
  { id:'w2', title:'Перекрёсток', artist:'Дом 12', year:2020, format:'Винил', price:4400, palette:['#9AA8FF','#3A4BE0','#F7F4EE'], mood:'cross', cat:'ВТ-113', reserved:true, reservedBy:'@anya' },
  { id:'w3', title:'Soft Alphabet', artist:'Piers Hood', year:2023, format:'Бокс-сет', price:5300, palette:['#F7D4B8','#F6C7D0','#9AA8FF'], mood:'glyph', cat:'ВТ-114', reserved:false },
  { id:'w4', title:'Обратный ход', artist:'Март', year:2018, format:'CD', price:3100, palette:['#C9B8FF','#BDD4FF','#F7F4EE'], mood:'arrow', cat:'ВТ-115', reserved:false },
];

// SVG album cover — abstract, inspired by the palette-ribbon reference.
function Cover({ r, size=140, radius=10, label=true }) {
  const [a,b,c] = r.palette;
  const gid = `g-${r.id}`;
  const gid2 = `g2-${r.id}`;
  const mood = r.mood;
  return (
    <div style={{ position:'relative', width:size, height:size, borderRadius:radius, overflow:'hidden', boxShadow:'0 1px 0 rgba(255,255,255,0.8) inset, 0 10px 26px -14px rgba(27,29,38,0.35), 0 2px 6px -2px rgba(27,29,38,0.12)' }}>
      <svg viewBox="0 0 140 140" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ display:'block' }}>
        <defs>
          <radialGradient id={gid} cx="30%" cy="30%" r="80%">
            <stop offset="0%" stopColor={c} />
            <stop offset="55%" stopColor={b} />
            <stop offset="100%" stopColor={a} />
          </radialGradient>
          <linearGradient id={gid2} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={a} stopOpacity="0.9"/>
            <stop offset="100%" stopColor={c} stopOpacity="0.9"/>
          </linearGradient>
        </defs>
        <rect width="140" height="140" fill={`url(#${gid})`} />
        {mood === 'wave' && (
          <g fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.1">
            {[0,1,2,3,4,5,6].map(i=>(
              <path key={i} d={`M -10 ${40+i*10} Q 35 ${20+i*10}, 70 ${40+i*10} T 150 ${40+i*10}`} />
            ))}
          </g>
        )}
        {mood === 'orbit' && (
          <g fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1">
            <ellipse cx="70" cy="75" rx="52" ry="20" />
            <ellipse cx="70" cy="75" rx="38" ry="38" />
            <ellipse cx="70" cy="75" rx="20" ry="50" />
            <circle cx="70" cy="75" r="4" fill="rgba(255,255,255,0.9)" />
          </g>
        )}
        {mood === 'dune' && (
          <g>
            <path d="M0 90 Q 40 70, 70 85 T 140 80 L 140 140 L 0 140 Z" fill="rgba(255,255,255,0.25)" />
            <path d="M0 110 Q 35 95, 70 108 T 140 105 L 140 140 L 0 140 Z" fill="rgba(27,29,38,0.18)" />
          </g>
        )}
        {mood === 'grid' && (
          <g stroke="rgba(27,29,38,0.22)" strokeWidth="0.7" fill="none">
            {[20,40,60,80,100,120].map(n=>(<line key={'h'+n} x1="0" y1={n} x2="140" y2={n} />))}
            {[20,40,60,80,100,120].map(n=>(<line key={'v'+n} x1={n} y1="0" x2={n} y2="140" />))}
            <rect x="40" y="40" width="40" height="40" fill="rgba(255,255,255,0.5)" />
          </g>
        )}
        {mood === 'arc' && (
          <g fill="none">
            <path d="M 10 120 Q 70 -10, 130 120" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" />
            <path d="M 22 120 Q 70 20, 118 120" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
            <path d="M 34 120 Q 70 50, 106 120" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
          </g>
        )}
        {mood === 'ripple' && (
          <g fill="none" stroke="rgba(27,29,38,0.25)" strokeWidth="0.8">
            {[8,18,30,44,60,78,98].map(r=>(<circle key={r} cx="70" cy="85" r={r} />))}
          </g>
        )}
        {mood === 'bloom' && (
          <g fill="rgba(255,255,255,0.55)">
            {[0,60,120,180,240,300].map(d=>(
              <ellipse key={d} cx="70" cy="70" rx="16" ry="38" transform={`rotate(${d} 70 70)`} />
            ))}
            <circle cx="70" cy="70" r="8" fill={a} />
          </g>
        )}
        {mood === 'cross' && (
          <g stroke="rgba(255,255,255,0.8)" strokeWidth="2" fill="none">
            <line x1="20" y1="70" x2="120" y2="70" />
            <line x1="70" y1="20" x2="70" y2="120" />
            <circle cx="70" cy="70" r="26" />
          </g>
        )}
        {mood === 'glyph' && (
          <g fill="rgba(27,29,38,0.7)" fontFamily="serif" fontSize="62" textAnchor="middle">
            <text x="70" y="92">Æ</text>
          </g>
        )}
        {mood === 'arrow' && (
          <g fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M 30 100 Q 70 30, 110 100" />
            <path d="M 100 95 L 110 100 L 105 90" />
          </g>
        )}
        {/* subtle grain */}
        <rect width="140" height="140" fill="url(#grain)" opacity="0.04" />
      </svg>
      {label && (
        <div className="mono" style={{ position:'absolute', left:8, bottom:6, fontSize:8, letterSpacing:'0.06em', color:'rgba(255,255,255,0.85)', textShadow:'0 1px 2px rgba(0,0,0,0.15)' }}>
          {r.cat}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { RECORDS, WISHLIST, NEW_RELEASES, Cover });
