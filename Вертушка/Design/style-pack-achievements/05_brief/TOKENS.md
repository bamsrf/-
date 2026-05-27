# Вертушка — Design Tokens (B1 «Stamper Hi-Fi» v2)

Source of truth: `Mobile/constants/theme.ts` → `T`.

## Palette (light mode)

### Brand
| Token | Hex | Role |
|---|---|---|
| `brand.navy` | `#0B1438` | Глубокий navy, основа тёмных карточек, deep bg |
| `brand.cobalt` | `#2A4BD7` | Primary action, главный акцент |
| `brand.cobaltDeep` | `#0E1A52` | Тёмный cobalt, переходы |
| `brand.cobaltSoft` | `#5C7AE8` | Светлый cobalt, hover/secondary |

### Accent
| Token | Hex | Role |
|---|---|---|
| `accent.ember` | `#E85A2A` | RARE rim/glow, центр пластинки маскота, редкие highlights |
| `accent.emberSoft` | `#FFD9C8` | Soft warm tint |
| `accent.ivory` | `#F4EEE6` | Тёплый текст на navy, бумажный warmth |
| `accent.ivorySoft` | `#FBF5EA` | Soft ivory |

### Surface
| Token | Hex | Role |
|---|---|---|
| `bg` | `#FAFBFF` | Фон экрана (almost white, cool tint) |
| `bg.elevated` | `#F0F2FA` | Карточки чуть темнее фона |
| `bg.deep` | `#0B1438` | Navy подложки для премиум-блоков |
| `bg.sunken` | `#E8EBFA` | Углублённые элементы |

### Text
| Token | Hex |
|---|---|
| `text` | `#0E121C` |
| `text.secondary` | `#4D5263` |
| `text.muted` | `#6B7080` |
| `text.onBrand` | `#FFFFFF` |
| `text.onIvory` | `#0B1438` |

### State
| Token | Hex |
|---|---|
| `state.warning` (gold) | `#A86614` |
| `state.success` | `#2A7A4E` |
| `state.error` | `#C8362E` |

## Gradients
- `brand`: `#0E1A52 → #2A4BD7 → #5C7AE8`
- `ember`: `#B8431B → #E85A2A → #FFB347`
- `hotStock`: `#0E1A52 → #2A4BD7 → #E85A2A` (cold → warm, premium signature)
- `bluePink`: `#3B4BF5 → #8B9CF7 → #F0C4D8` (legacy onboarding)

## Type
- `heroTitle` — **Rubik Mono One** 40pt / lineHeight 44 / letterSpacing -0.5
- `display` — Inter ExtraBold 32pt
- `h1` — Inter Bold 26pt
- `h2` — Inter Bold 20pt
- `h3` — Inter SemiBold 17pt
- `subhead` — Inter SemiBold 15pt
- `body` — Inter Regular 16pt
- `caption` — Inter Regular 12pt
- `overline` — Inter Bold 11pt / letterSpacing 1.2

## Spacing
xs 4 · sm 8 · md 12 · lg 16 · xl 24 · 2xl 32 · 3xl 48

## Radius
xs 6 · sm 10 · md 14 · lg 20 · xl 28 · 2xl 36 · full 9999

## Shadow
- `xs/sm/md/lg` — стандартные тени на royalBlue `#3B4BF5`
- `glow` — `#3B4BF5` blur 20, opacity 0.4
- `glowEmber` — `#E85A2A` blur 24, opacity 0.45 (для редких highlights)

## Motion
- `vinylSpin` — 1800ms loop (вращение пластинки/пина)
- `hotPulse` — 2000ms (привлечение внимания)
- `collectibleSpin` — 8000ms (медленная коллекционная подача)
- `easing.expressive` — `[0.34, 1.56, 0.64, 1]` (bouncy spring для unlock)

## Grooves (фирменный паттерн)
- Концентрические круги (как канавки винила)
- stroke 1pt, opacity 0.18 на тёмном фоне
- spacing 4pt между линиями
- centerDot 12pt ember с emberGlow
