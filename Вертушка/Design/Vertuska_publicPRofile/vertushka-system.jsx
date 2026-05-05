// Mini design system reference card

function DSLabel({ children }) {
  return <div className="mono" style={{ fontSize:9.5, color:'#9096A6', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:10 }}>{children}</div>;
}

function Swatch({ c, name, hex }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ width:40, height:40, borderRadius:10, background:c, boxShadow:'0 1px 0 rgba(255,255,255,0.8) inset, 0 4px 10px -6px rgba(27,29,38,0.2)', border:'1px solid rgba(27,29,38,0.04)' }}/>
      <div>
        <div style={{ fontSize:12, fontWeight:500, color:'#1B1D26' }}>{name}</div>
        <div className="mono" style={{ fontSize:10, color:'#9096A6', marginTop:2 }}>{hex}</div>
      </div>
    </div>
  );
}

function DesignSystem() {
  return (
    <div style={{ width:1200, minHeight:1400, padding:'56px 64px',
      background:
        'radial-gradient(600px 400px at 15% 0%, rgba(246,199,208,0.30), transparent 60%),' +
        'radial-gradient(700px 500px at 95% 10%, rgba(154,168,255,0.35), transparent 60%),' +
        'linear-gradient(180deg, #F6F1E9, #EFECE6)',
      fontFamily:'Inter Tight, sans-serif'
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:40 }}>
        <div>
          <div className="mono" style={{ fontSize:11, color:'#3A4BE0', letterSpacing:'0.16em', marginBottom:10 }}>МИНИ-СИСТЕМА · ПУБЛИЧНЫЙ ПРОФИЛЬ</div>
          <div style={{ fontSize:44, fontWeight:600, letterSpacing:'-0.03em', color:'#1B1D26', lineHeight:1 }}>Вертушка · визуальная грамматика</div>
          <div style={{ fontSize:14, color:'#6B7080', marginTop:14, maxWidth:640 }}>Светлая, воздушная, musicalli-premium. Один холодный акцентный цвет, soft-matte карточки, спокойные градиенты, уверенная типографика без техно-футуризма.</div>
        </div>
      </div>

      {/* Colors */}
      <section style={{ marginBottom:50 }}>
        <DSLabel>01 · Цвет</DSLabel>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:18, padding:24, background:'rgba(255,255,255,0.5)', borderRadius:20, border:'1px solid rgba(255,255,255,0.8)' }}>
          <Swatch c="#F4EEE6" name="Ivory base" hex="#F4EEE6"/>
          <Swatch c="#F7F4EE" name="Pearl surface" hex="#F7F4EE"/>
          <Swatch c="#3A4BE0" name="Cobalt action" hex="#3A4BE0"/>
          <Swatch c="#9AA8FF" name="Periwinkle" hex="#9AA8FF"/>
          <Swatch c="#C9B8FF" name="Lavender" hex="#C9B8FF"/>
          <Swatch c="#F6C7D0" name="Blush" hex="#F6C7D0"/>
          <Swatch c="#F7D4B8" name="Pale peach" hex="#F7D4B8"/>
          <Swatch c="#BDD4FF" name="Sky" hex="#BDD4FF"/>
          <Swatch c="#1B1D26" name="Graphite ink" hex="#1B1D26"/>
          <Swatch c="#6B7080" name="Smoky slate" hex="#6B7080"/>
          <Swatch c="#9096A6" name="Muted mute" hex="#9096A6"/>
          <Swatch c="rgba(27,29,38,0.08)" name="Hairline" hex="ink @ 8%"/>
        </div>
        <div style={{ fontSize:12.5, color:'#6B7080', marginTop:14, lineHeight:1.55, maxWidth:900 }}>
          Правило: cobalt — единственный action color. Lavender/blush/peach — только для glow, фона, бейджей и подложек; никогда не как CTA. Персик не попадает на интерактив.
        </div>
      </section>

      {/* Type */}
      <section style={{ marginBottom:50 }}>
        <DSLabel>02 · Типографика</DSLabel>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
          <div style={{ padding:28, background:'rgba(255,255,255,0.62)', borderRadius:20, border:'1px solid rgba(255,255,255,0.8)' }}>
            <div style={{ fontSize:44, fontWeight:600, letterSpacing:'-0.03em', color:'#1B1D26', lineHeight:1 }}>Синий час</div>
            <div style={{ fontSize:14, color:'#6B7080', marginTop:8 }}>Release title · Inter Tight 600 · -3% tracking</div>
            <div style={{ height:1, background:'rgba(27,29,38,0.08)', margin:'18px 0' }}/>
            <div style={{ fontSize:22, fontWeight:600 }}>@bamsrf</div>
            <div style={{ fontSize:11, color:'#6B7080', marginTop:6 }}>Username · 600</div>
            <div style={{ height:1, background:'rgba(27,29,38,0.08)', margin:'18px 0' }}/>
            <div className="tnum" style={{ fontSize:30, fontWeight:600, letterSpacing:'-0.025em' }}>284 600 ₽</div>
            <div style={{ fontSize:11, color:'#6B7080', marginTop:6 }}>Metric · 600 · tabular-nums</div>
          </div>
          <div style={{ padding:28, background:'rgba(255,255,255,0.62)', borderRadius:20, border:'1px solid rgba(255,255,255,0.8)' }}>
            <div style={{ fontSize:14, fontWeight:500, color:'#1B1D26' }}>Жанр · По дате · Все релизы</div>
            <div style={{ fontSize:11, color:'#6B7080', marginTop:6 }}>Body / UI · 500</div>
            <div style={{ height:1, background:'rgba(27,29,38,0.08)', margin:'18px 0' }}/>
            <div className="mono" style={{ fontSize:11, letterSpacing:'0.14em', color:'#3A4BE0' }}>ВЕРТУШКА · ПРОФИЛЬ</div>
            <div style={{ fontSize:11, color:'#6B7080', marginTop:6 }}>Label · JetBrains Mono · 14% tracking</div>
            <div style={{ height:1, background:'rgba(27,29,38,0.08)', margin:'18px 0' }}/>
            <div style={{ fontSize:12, color:'#6B7080' }}>Neo-grotesk Inter Tight + JetBrains Mono для каталожных номеров и микро-лейблов. Никаких serif.</div>
          </div>
        </div>
      </section>

      {/* Components */}
      <section style={{ marginBottom:50 }}>
        <DSLabel>03 · Компоненты</DSLabel>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:18 }}>
          {/* CTA */}
          <div style={{ padding:22, background:'rgba(255,255,255,0.62)', borderRadius:20, border:'1px solid rgba(255,255,255,0.8)' }}>
            <div className="mono" style={{ fontSize:10, letterSpacing:'0.1em', color:'#9096A6', marginBottom:12 }}>PRIMARY · COBALT</div>
            <div style={{ marginBottom:10 }}><PrimaryBtn sheen>Забронировать</PrimaryBtn></div>
            <div style={{ marginBottom:10 }}><GhostBtn>В коллекции с 2022</GhostBtn></div>
            <div style={{ fontSize:11.5, color:'#6B7080', lineHeight:1.55, marginTop:8 }}>Один акцентный синий на CTA. Reflective sweep раз в ~4с, субтильный. Ghost для secondary.</div>
          </div>
          {/* Segmented */}
          <div style={{ padding:22, background:'rgba(255,255,255,0.62)', borderRadius:20, border:'1px solid rgba(255,255,255,0.8)' }}>
            <div className="mono" style={{ fontSize:10, letterSpacing:'0.1em', color:'#9096A6', marginBottom:12 }}>SEGMENTED</div>
            <Segmented value="collection" onChange={()=>{}} items={[{id:'collection', label:'Коллекция', count:8},{id:'wishlist', label:'Вишлист', count:3}]}/>
            <div style={{ height:10 }}/>
            <Segmented value="wishlist" onChange={()=>{}} items={[{id:'collection', label:'Коллекция', count:8},{id:'wishlist', label:'Вишлист', count:3}]}/>
            <div style={{ fontSize:11.5, color:'#6B7080', lineHeight:1.55, marginTop:10 }}>Активная pill перетекает за 420ms. Счётчик внутри — cobalt у активного, mute у неактивного.</div>
          </div>
          {/* Badges */}
          <div style={{ padding:22, background:'rgba(255,255,255,0.62)', borderRadius:20, border:'1px solid rgba(255,255,255,0.8)' }}>
            <div className="mono" style={{ fontSize:10, letterSpacing:'0.1em', color:'#9096A6', marginBottom:12 }}>BADGES & TOOLS</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
              <ReservedBadge/>
              <ReservedBadge by="@anya"/>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <IconBtn active><ToolIcon name="grid"/></IconBtn>
              <IconBtn><ToolIcon name="list"/></IconBtn>
              <IconBtn><ToolIcon name="filter"/></IconBtn>
            </div>
            <div style={{ fontSize:11.5, color:'#6B7080', lineHeight:1.55, marginTop:10 }}>Резерв — lilac capsule с мягким пульсом. Никакого warning-orange.</div>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section style={{ marginBottom:50 }}>
        <DSLabel>04 · Карточки</DSLabel>
        <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:20, alignItems:'flex-start' }}>
          <div>
            <div className="mono" style={{ fontSize:10, color:'#9096A6', marginBottom:10 }}>GRID</div>
            <RecordCardGrid r={RECORDS[0]} onClick={()=>{}}/>
          </div>
          <div>
            <div className="mono" style={{ fontSize:10, color:'#9096A6', marginBottom:10 }}>LIST</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <RecordCardList r={RECORDS[1]} onClick={()=>{}}/>
              <RecordCardList r={WISHLIST[1]} onClick={()=>{}}/>
              <RecordCardList r={WISHLIST[0]} onClick={()=>{}} action="Подарить"/>
            </div>
          </div>
        </div>
      </section>

      {/* Motion */}
      <section>
        <DSLabel>05 · Motion intent</DSLabel>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:14 }}>
          {[
            ['Vinyl', '14s · linear · infinite spin. Никакого bounce, никакой акселерации.'],
            ['Value counter', '1.6s · cubic ease-out. Запускается один раз при загрузке.'],
            ['Segmented', '420ms · cubic-bezier(.22,.7,.18,1). Фон hero мягко меняет оттенок на 5–10%.'],
            ['CTA sweep', '~3.8s · горизонтальный reflective glint. Soft, не циркач.'],
          ].map(([t,d])=>(
            <div key={t} style={{ padding:18, background:'rgba(255,255,255,0.62)', borderRadius:16, border:'1px solid rgba(255,255,255,0.8)' }}>
              <div style={{ fontSize:13, fontWeight:600 }}>{t}</div>
              <div style={{ fontSize:11.5, color:'#6B7080', lineHeight:1.55, marginTop:6 }}>{d}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

Object.assign(window, { DesignSystem });
