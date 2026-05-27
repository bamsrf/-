# Hero-картинки уровней — Архетипы V3 «Физика звука»

10 уровней лестницы. Каждый получает hero-иллюстрацию для шапки экрана
`/achievements`, которая меняется при повышении уровня.

Стиль — эмалевый пин-сценка, фирменный navy/cobalt/ember/ivory мир Вертушки.
См. палитру в `TOKENS.md`. Каждый образ — акустическая метафора (физика звука),
не буквальный винил.

## Универсальный template (вставлять вокруг Subject)

```
A hero illustration for the "Vertushka" vinyl-collector app — large enamel-pin
scene inside a navy badge frame, displayed at the top of the achievements screen
when the user reaches this level of the "Physics of Sound" XP ladder.

Frame:
- Vertical rounded-square badge, ~280×280pt
- Background: deep navy #0B1438 with faint concentric vinyl grooves
  (ivory #F4EEE6 at 6% opacity, radiating from upper-left)
- Double gold rim outline (#A86614 outer, #E85A2A inner highlight, 3pt total)
- Subtle ivory highlight along the top edge to suggest enamel light

Subject: {{SUBJECT}}

Style:
- Vintage enamel cloisonné collector pin, narrative acoustic scene (not just an icon)
- Flat illustration, hard clean lines, no internal gradients
- Color palette strictly limited to: navy #0B1438, cobalt #2A4BD7,
  cobaltSoft #5C7AE8, ember #E85A2A, ivory #F4EEE6, gold #A86614
- One ember accent per scene — used sparingly as the focal point
- Thin ivory highlights only on raised enamel edges
- Centered composition, no text, no letters, no watermark
- Square 1:1, transparent background outside the badge frame

Tone scaling — level intensity (apply per level):
- Levels 0–1 (Тишь, Шорох): muted, almost monochrome navy, ember barely present
- Levels 2–3 (Эхо, Волна): cobalt accents come in, single ember dot
- Levels 4–5 (Резонанс, Обертон): full palette but balanced, gold rim crisp
- Levels 6–7 (Амплитуда, Частота): ember more prominent, multiple highlights
- Levels 8–9 (Камертон, Первозвук): radiant, golden, ember halo, max contrast

Negative: photoreal, 3D render, gradient mesh, drop shadow, blur, neon,
plastic, busy background, text, signature
```

## Subject-строки по 10 уровням

```
0. Тишь (silence):
A single closed eye in profile against a deep navy void; a single dust particle
caught mid-fall in front of the eyelashes; no sound, no motion, only the moment
before anything starts. Monochrome navy, no ember.

1. Шорох (rustle):
A vinyl record extreme close-up showing only the lead-in groove; a single thin
ember scratch-line catching light at the outermost edge; tiny ivory dust mote
suspended above the needle path.

2. Эхо (echo):
A small ivory ripple radiating outward from a central point in three concentric
arcs; each arc fainter than the previous; a tiny ember dot at the very center
marking the source.

3. Волна (wave):
A single large sinusoidal sound wave drawn as a continuous ivory line crossing
the frame horizontally; the wave's peak holds a tiny silhouetted figure standing
on the crest, surfing it.

4. Резонанс (resonance):
Two parallel tuning forks facing each other, one struck and vibrating with
ember-light haze around its tines, the other absorbing the energy and starting
to glow in cobalt.

5. Обертон (overtone):
A vertical stack of three sound waves of different frequencies overlapping
into a complex composite line at the top; the harmonic interaction emits a
single ember spark where the waves align.

6. Амплитуда (amplitude):
A massive sound-wave silhouette towering over a tiny figure in the foreground;
the wave's crest reaches the upper edge of the frame and bends inward,
threatening to break over the figure; ember light from below.

7. Частота (frequency):
An ornate antique radio-tuner dial centered in the frame; the needle precisely
aligned with a single ember mark among hundreds of ivory tick-marks; the dial
glass reflects a faint cobalt grid.

8. Камертон (tuning_fork):
A large ornate gold tuning fork standing upright, polished and ceremonial;
small ivory silhouettes of figures bowing toward it from both sides; an ember
halo radiates from the fork's stem, marking it as the reference point.

9. Первозвук (primal_sound):
A primordial cosmic ember-orange star at the center of the frame, releasing
the first sound-wave ever made — a single circular ember ring expanding outward
into the navy void; tiny galaxies of vinyl records forming in its wake.
```

## Использование

1. Прогон через Midjourney v6 / DALL-E 3 / Sora — по одному уровню за раз.
2. Сохранить в `Mobile/assets/archetypes/{key}.png` (key из таблицы спеки).
3. Подключить в `AchievementsHero.tsx` по `archetype.key` (после готовности
   ассетов; пока работает только текстовый chip).
