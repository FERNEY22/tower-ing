---
name: Towers Ing — v3.1
description: Sistema de diseño "Papel & Voltaje" suavizado — papel crema, tinta suave, hairlines en lugar de rejilla de tinta, elevación suave y un conmutador de tipografía. Fuente de verdad extraída de styles/towers.css.
source: styles/towers.css
version: 3.1
active-type: grotesk      # <html data-type="grotesk"> en index.html
colors:
  paper: "#F3EEE2"         # fondo base
  paper-2: "#ECE6D8"       # hover / banda secundaria
  surface: "#FBF8F1"       # superficie elevada (paneles, cards)
  surface-2: "#FFFFFFEE"   # superficie más clara (dashboard, inputs)
  ink: "#15171F"           # texto principal
  ink-2: "#474A55"         # texto secundario (AA en cuerpo)
  ink-3: "#5A5D69"         # terciario: etiquetas / meta
  line: "rgba(21, 23, 31, 0.09)"
  line-2: "rgba(21, 23, 31, 0.16)"
  line-strong: "rgba(21, 23, 31, 0.28)"
  electric: "#1F3DFF"
  electric-2: "#4D66FF"
  electric-ink: "#1A33D6"  # azul para texto sobre claro (AA)
  electric-soft: "rgba(31, 61, 255, 0.10)"
  electric-softer: "rgba(31, 61, 255, 0.05)"
  spark: "#FFD21A"
  pos: "#15803D"
  pos-soft: "rgba(34, 160, 90, 0.12)"
  neg: "#BE2D44"
  neg-soft: "rgba(214, 64, 90, 0.12)"
  warn: "#B45309"
  warn-soft: "rgba(217, 119, 6, 0.13)"
typography:
  fonts:
    display: "var(--font-display)"   # lo define data-type
    body: "'Geist', system-ui, sans-serif"
    mono: "'JetBrains Mono', ui-monospace, monospace"
  type-switcher:
    clean:   { display: "'Geist', system-ui, sans-serif", spacing: "-0.025em", weight: 600 }
    grotesk: { display: "'Bricolage Grotesque', 'Geist', system-ui, sans-serif", spacing: "-0.02em", weight: 600 }   # activo
    serif:   { display: "'Spectral', Georgia, serif", spacing: "-0.015em", weight: 500 }
  scale:
    t-xs: "0.75rem"
    t-sm: "0.8125rem"
    t-base: "0.9375rem"
    t-md: "1.0625rem"
    t-lg: "1.25rem"
    t-xl: "1.5rem"
    hero-h1: { size: "clamp(40px, 6.5vw, 88px)", lineHeight: 1.0, letterSpacing: "var(--display-spacing)" }
    page-h1: { size: "clamp(34px, 5vw, 60px)", lineHeight: 1.02, letterSpacing: "var(--display-spacing)" }
    section-h2: { size: "clamp(26px, 3.2vw, 38px)", letterSpacing: "var(--display-spacing)" }
    stat-num: { size: "clamp(34px, 4vw, 48px)", lineHeight: 1, letterSpacing: "-0.02em" }
    body: { size: "1rem", lineHeight: 1.55, weight: 400 }
rounded:
  xs: "6px"
  sm: "9px"
  md: "12px"
  lg: "18px"
  pill: "100px"
shadows:
  sm: "0 1px 2px rgba(21,23,31,.05), 0 1px 1px rgba(21,23,31,.03)"
  md: "0 6px 20px -8px rgba(21,23,31,.12), 0 2px 6px -3px rgba(21,23,31,.06)"
  lg: "0 20px 48px -16px rgba(21,23,31,.20), 0 6px 16px -8px rgba(21,23,31,.10)"
  focus: "0 0 0 3px var(--electric-soft)"
motion:
  ease: "cubic-bezier(.22, 1, .36, 1)"      # ease-out-quint
  ease-soft: "cubic-bezier(.4, 0, .2, 1)"
z-index:
  sticky: 100
  switcher: 400
  modal: 600
  toast: 800
layout:
  shell-max: "1240px"
  shell-pad: "clamp(20px, 5vw, 56px)"
  breakpoints: ["940px", "720px"]
---

# Sistema de Diseño — Towers Ing v3.1

> **Fuente de verdad:** `styles/towers.css` («Papel & Voltaje» · v3.1, versión suavizada). Todo valor de este documento existe en ese archivo; si cambia el CSS, se actualiza este documento.

## 1. Concepto — "Papel & Voltaje", suavizado

Sigue siendo un editorial técnico sobre **papel crema** con **tinta oscura** y una **señal azul eléctrica**, pero con menos rigidez: la rejilla de tinta de 1px se reemplaza por **hairlines** translúcidas y **aire**, y las superficies de producto ganan **elevación suave** (estilo Stripe/Grafana) y **esquinas redondeadas** de 6 a 18 px.

**Características clave**
- Lienzo `--paper` (`#F3EEE2`) + tinta `--ink` (`#15171F`), suave y no negro puro.
- Separación por **hairlines** (`--line`, `--line-2`, `--line-strong`) y cambio de superficie, no por bordes de tinta.
- **Azul = acción.** **Amarillo = chispa.** **Verde/rojo/ámbar = solo estado.**
- **Elevación suave** con tres sombras (`--shadow-sm/md/lg`).
- **Conmutador de tipografía** `data-type` para el display; el cuerpo es siempre Geist.

## 2. Color

Variables CSS en `:root`.

### Lienzo y tinta
| Token | Valor | Uso |
|---|---|---|
| `--paper` | `#F3EEE2` | Fondo base de página. |
| `--paper-2` | `#ECE6D8` | Hover, banda secundaria, tags, fondo de tabs y segmentados, `userbar`. |
| `--surface` | `#FBF8F1` | Superficie elevada: tiles, cards, `auth`, ticker, tarjetas destacadas. |
| `--surface-2` | `#FFFFFFEE` | Superficie más clara: KPI, paneles de dashboard, inputs, tab activa. |
| `--ink` | `#15171F` | Texto principal. |
| `--ink-2` | `#474A55` | Texto secundario (AA en cuerpo): descripciones, lead, nav. |
| `--ink-3` | `#5A5D69` | Terciario: etiquetas, meta, fechas, flechas en reposo, placeholders. |

### Hairlines
| Token | Valor | Uso |
|---|---|---|
| `--line` | `rgba(21, 23, 31, 0.09)` | Separador por defecto: topbar, filas, cards, footer. |
| `--line-2` | `rgba(21, 23, 31, 0.16)` | Borde de hover, inputs, `btn-ghost`, tarjetas destacadas, cabecera de tabla. |
| `--line-strong` | `rgba(21, 23, 31, 0.28)` | Borde de `btn-ghost` en hover. |

### Señal
| Token | Valor | Uso |
|---|---|---|
| `--electric` | `#1F3DFF` | Relleno de acción: `btn-primary`, `live-dot`, foco de input, `bar-mini`, punto de timeline, `::selection`. |
| `--electric-2` | `#4D66FF` | Hover de `btn-primary`. |
| `--electric-ink` | `#1A33D6` | Azul para **texto** sobre claro (AA): enlaces, `<em>` en títulos, índices, nav activa. |
| `--electric-soft` | `rgba(31, 61, 255, 0.10)` | Fondos tintados: nav activa, badge `.source`, `estado-desarrollo`, anillo de foco. |
| `--electric-softer` | `rgba(31, 61, 255, 0.05)` | Halo del fondo del `body`, textura del geovisor. |
| `--spark` | `#FFD21A` | La chispa ⚡ (con `-webkit-text-stroke: .5px var(--ink)` sobre claro). |

### Estado
| Token | Texto | Fondo | Uso |
|---|---|---|---|
| `--pos` / `--pos-soft` | `#15803D` | `rgba(34, 160, 90, 0.12)` | `delta.up`, ticker `.up`, `estado-finalizado`. |
| `--neg` / `--neg-soft` | `#BE2D44` | `rgba(214, 64, 90, 0.12)` | `delta.down`, ticker `.down`, mensajes de error. |
| `--warn` / `--warn-soft` | `#B45309` | `rgba(217, 119, 6, 0.13)` | `estado-prototipo`, filete de `.feat-obs`. |
| neutro | `--ink-3` | `--paper-2` | `delta.flat`, ticker `.flat`. |

### Reglas de uso de color
- **Azul = acción.** `--electric` / `--electric-ink` marcan lo que se puede pulsar, el foco y el énfasis. Si está en todo, deja de señalar.
- **Amarillo = chispa.** `--spark` solo como el ⚡ puntual (marca, hero, stats, `btn-primary`); nunca relleno ni texto extenso.
- **Verde / rojo / ámbar = solo estado.** `--pos`, `--neg`, `--warn` comunican dirección o estado de un dato; nunca decoran.
- **Texto azul sobre claro** siempre con `--electric-ink`, no con `--electric`.

### Excepción única — tarjetas destacadas de proyecto
Las tarjetas `.feat-*` de la página de Proyectos son la **única** excepción a las reglas anteriores: cada una lleva una identidad propia con colores fijos (no tokens). Fuera de estas clases no se usan.

| Clase | Proyecto | Colores |
|---|---|---|
| `.feat-biomo` | BIOMO | panel lateral `linear-gradient(160deg, #1f7a4d, #14532d)`, texto `#eafff3` |
| `.feat-geo` | Geovisor | sin colores propios: `--electric-softer`, `--line`, `--electric` |
| `.feat-obs` | Observatorio | sin colores propios: filete `--warn` |
| `.feat-yuncar` | Yuncar | fondo `linear-gradient(150deg, #1A3A5C, #102338)`; naranja `#E8500A` (botón, punto), hover `#ff6a2a`; en vivo `#F5A623`; texto `#eaf1f8`, `#b9c7d6`, `#cdd9e6`, `#8aa0b6` |
| `.feat-apreciacion` | Apreciación | fondo `linear-gradient(145deg, #2FA36B 0%, #17724A 42%, #0B3826 100%)`; botón `#34D399` / texto `#06301F`, hover `#56e6b0`; kicker `#6EE7A8`; texto `#e9fbf1`, `#c3e6d3`, `#9fd4b7`, `#eafff3`, `#d5f2e2`, `#bfe8d1` |
| `.feat-electro` | Electrónica | cian `#0E7490` (filete, kicker, botón), hover `#1291b3`; bandas de resistencia `#D8C9A3`, `#7B4A21`, `#14181C`, `#C62F2F`, `#C9A227` |
| `.feat-control` | Diagnóstico y Control | violeta `#6D28D9` (filete, kicker, botón), hover `#8b4df0`; texto del lazo `#5B21B6` |
| `.feat-semaforo` | Semáforo IA | verde `#15803D` (filete, botón), hover `#1A9A4A`; luces `#15803D`, `#C2700A`, `#BE2D44`; texto de regla ámbar `#A35E08` |
| `.feat-bots` | Batalla de Bots | terracota `#C15F3C` (filete, botón), hover `#A84F30`; luces `#23262E`, `#C15F3C`, `#6A4BD8`, `#1C7D88`; texto de regla `#A84F30`, `#5A3DC4`, `#176A74` |
| `.feat-invernadero` | Invernadero | verde `#1E8449` (filete, kicker, botón), hover `#25a05a`; rangos `#3498DB`, `#1E8449`, `#E67E22` |
| `.feat-gemelos` | Gemelos digitales | ámbar `#B7860B` (filete, botón), hover y texto `#9A6F00` |

> Estas tarjetas comparten la estructura del sistema (`--r-lg`, `--shadow-sm`/`--shadow-md`, `--surface`, `--line-2`, `--font-display`); solo cambia el color de identidad.

## 3. Tipografía

### Familias y conmutador `data-type`
El display se elige con un atributo en `<html>`; el cuerpo y el mono no cambian.

| `data-type` | `--font-display` | `--display-spacing` | `--display-weight` |
|---|---|---|---|
| `clean` | `'Geist', system-ui, sans-serif` | `-0.025em` | 600 |
| **`grotesk`** (activo) | `'Bricolage Grotesque', 'Geist', system-ui, sans-serif` | `-0.02em` | 600 |
| `serif` | `'Spectral', Georgia, serif` | `-0.015em` | 500 |

- **Activo:** `index.html` declara `<html lang="es" data-type="grotesk">`.
- **Cuerpo:** `--font-body: 'Geist', system-ui, sans-serif` en los tres temas.
- **Mono:** `--font-mono: 'JetBrains Mono', ui-monospace, monospace`.
- Sin atributo, `:root` usa Geist con `-0.02em` / 600.
- En `serif`, los `<em>` de títulos pasan a itálica; en `clean` y `grotesk` van en `font-style: normal` y color `--electric-ink`.

Fuentes de Google Fonts según la cabecera de `towers.css`: Geist 300–700; Bricolage Grotesque opsz 12..96, 400–800; Spectral 300–600 + itálica 400; JetBrains Mono 400, 500.

> **Nota:** `index.html` carga Geist, Bricolage Grotesque y JetBrains Mono, pero **no Spectral**; con `data-type="serif"` el display caería en Georgia.

### Escala de producto
| Token | Valor |
|---|---|
| `--t-xs` | `0.75rem` |
| `--t-sm` | `0.8125rem` |
| `--t-base` | `0.9375rem` |
| `--t-md` | `1.0625rem` |
| `--t-lg` | `1.25rem` |
| `--t-xl` | `1.5rem` |

### Títulos y valores
| Rol | Tamaño | Line-height | Tracking |
|---|---|---|---|
| Hero H1 | `clamp(40px, 6.5vw, 88px)` | 1.0 | `--display-spacing` |
| Page-head H1 | `clamp(34px, 5vw, 60px)` | 1.02 | `--display-spacing` |
| Featured H2 | `clamp(26px, 3.4vw, 40px)` | 1.05 | `--display-spacing` |
| Section H2 | `clamp(26px, 3.2vw, 38px)` | — | `--display-spacing` |
| Footer `.big` | `clamp(28px, 3.4vw, 40px)` | 1.05 | `--display-spacing` |
| Stat número | `clamp(34px, 4vw, 48px)` | 1 | -0.02em, `tabular-nums` |
| KPI valor | `2rem` / 600 | 1 | -0.02em, `tabular-nums` |
| Auth H3 | `--t-xl` | — | -0.01em |
| Tile / card / timeline H3 | `--t-lg` | — | -0.01em |
| Hero lead | `clamp(16px, 1.6vw, 19px)` | 1.6 | — |
| Cuerpo | `1rem` / 400 | 1.55 | — |

### Mono
- `.mono`: `--t-xs`, letter-spacing `.02em`, **sin mayúsculas**.
- `.kicker`: `--t-xs`, letter-spacing `.08em`, **mayúsculas**, color `--ink-3`.
- Fechas, índices, meta de cards y footer-bottom en mono `--t-xs`.

### Reglas tipográficas
- Display (`--font-display` + `--display-weight`) para `h1–h4`, stats y títulos de lista; cuerpo en Geist.
- **Dashboard: solo sans.** En la interfaz de datos (`.panel-head h3` y demás) se usa `--font-body`, nunca el display. En gráficos SVG, los ticks van en mono y los valores (`text.val`) en sans.
- `text-wrap: balance` en `h1–h3`; `text-wrap: pretty` en `p`.

## 4. Radios
| Token | Valor | Uso |
|---|---|---|
| `--r-xs` | `6px` | Botones internos de segmentados y tabs. |
| `--r-sm` | `9px` | Inputs, `dash-select`, contenedor de segmentados y tabs. |
| `--r-md` | `12px` | KPI, paneles, ítems de actividad, franjas de stats, reglas. |
| `--r-lg` | `18px` | Tiles, cards, `auth`, tarjetas destacadas. |
| `--r-pill` | `100px` | Botones, nav, tags, estados, deltas, badges, conmutador. |
| — | `50%` | Puntos de estado (`live-dot`, `.estado::before`, timeline). |

## 5. Sombras y elevación
| Token | Valor | Uso |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(21,23,31,.05), 0 1px 1px rgba(21,23,31,.03)` | Reposo de KPI, paneles, `auth`, destacadas; tab activa; hover de `act-item`. |
| `--shadow-md` | `0 6px 20px -8px rgba(21,23,31,.12), 0 2px 6px -3px rgba(21,23,31,.06)` | Hover de tiles y cards; `.feat-yuncar`, `.feat-apreciacion`. |
| `--shadow-lg` | `0 20px 48px -16px rgba(21,23,31,.20), 0 6px 16px -8px rgba(21,23,31,.10)` | Conmutador flotante `.fontswitch`. |
| Foco | `0 0 0 3px var(--electric-soft)` | `.field input:focus`, `.dash-select:focus` (con borde `--electric`). |
| Botón primario | `0 1px 2px rgba(31,61,255,.3)` → hover `0 4px 14px -2px rgba(31,61,255,.4)` | `.btn-primary`. |

## 6. Fondo
Sin rejilla de puntos ni ruido. El `body` lleva un halo azul fijo:
`radial-gradient(1200px 600px at 80% -10%, var(--electric-softer), transparent 60%)` con `background-attachment: fixed`.

## 7. Layout
- **`.shell`:** `max-width: 1240px`, padding `0 clamp(20px, 5vw, 56px)`.
- **Secciones:** `.section` con padding vertical `clamp(40px, 6vw, 72px)`; `.hero` `clamp(56px, 9vw, 120px) 0 clamp(40px, 6vw, 72px)`.
- **Home:** `.explorar-grid` `minmax(0,1.7fr) minmax(0,1fr)` (tiles + auth); `.hero-bottom` `1.1fr 1fr`.
- **Rejillas:** `.tiles` `auto-fit minmax(280px, 1fr)`; `.card-grid` `auto-fill minmax(300px, 1fr)`; `.kpi-grid` `auto-fit minmax(210px, 1fr)`; `.panel-grid.cols-2` `1fr 1fr`, `.split` `1.6fr 1fr`.
- **Z-index:** `--z-sticky 100` (topbar), `--z-switcher 400`, `--z-modal 600`, `--z-toast 800`.
- **Breakpoints:**
  - `≤940px`: `hero-bottom`, `explorar-grid` y `panel-grid` pasan a 1 columna.
  - `≤720px`: la topbar se apila y oculta `.live`; tiles a 1 columna; `act-item` se reorganiza y oculta la flecha; footer a 2 columnas; las destacadas ocultan su panel lateral y su decoración.

## 8. Componentes
- **Topbar:** sticky, `color-mix(in srgb, var(--paper) 82%, transparent)` + `backdrop-filter: blur(12px)`, borde inferior `--line`. Marca en display 700 con ⚡ `--electric`. Nav en pill: hover `--paper-2`, activo `--electric-soft` + `--electric-ink`.
- **Ticker:** fondo `--surface`, borde `--line`, `scroll 60s linear infinite`, se pausa al pasar el cursor. `.up`/`.down`/`.flat` en mono con `--pos`/`--neg`/`--ink-3`.
- **Hero:** kicker con `//` en `--electric-ink`; H1 con `.accent` en `--electric` y ⚡ `--spark`; lead `--ink-2`; CTA `btn-primary` + `btn-ghost`; tres stats.
- **Section-head:** H2 display + `.meta` `--ink-3`, sin borde inferior.
- **Activity (`.act-item`):** rejilla `96px 110px 1fr auto`, separador `--line`, `--r-md`. Hover: fondo `--surface`, `translateX(4px)`, `--shadow-sm`; la flecha avanza 5px y pasa a `--electric-ink`. `.source` en pill `--electric-soft`.
- **Tiles / cards:** `--surface`, borde `--line`, `--r-lg`. Hover: `translateY(-3px)`, `--shadow-md`, borde `--line-2`; la flecha del tile se mueve en diagonal.
- **Botones:** `.btn` en pill, Geist 600 `--t-base`, `:active` baja 1px. `.btn-primary` azul con ⚡ `--spark`; `.btn-ghost` transparente con `--line-2`.
- **Tags y estados:** `.tag` pill `--paper-2`; `.estado` pill con punto `currentColor`: `-finalizado` (pos), `-desarrollo` (electric), `-prototipo` (warn).
- **Dashboard:** segmentado `.seg` (`--paper-2`, `--r-sm`; activo `--surface-2` + `--shadow-sm`), `.dash-select`, `.kpi` con `.delta`, `.panel` + `.panel-head` sans, `.legend`, `table.dt` (cabecera `--line-2`, filas `--line`, hover `--paper-2`, números `tabular-nums`), `.pill`, `.bar-mini`.
- **Auth:** `--surface`, `--r-lg`, `--shadow-sm`; tabs segmentadas; `.field input` en `--surface-2` con borde `--line-2` y foco azul + anillo; botón a ancho completo.
- **Footer:** hairline `--line` (no bloque oscuro); rejilla `2fr 1fr 1fr 1fr`; `.big` display con `<em>` `--electric-ink`; h5 mono mayúsculas `--ink-3`; enlaces con hover `--electric-ink`.
- **Timeline (CV):** línea `--line-2`, puntos `--electric` con anillo `--paper`, fechas mono `--electric-ink`.
- **Userbar:** banda `--paper-2` bajo la topbar, visible solo con sesión.
- **Conmutador `.fontswitch`** (solo demo): fijo abajo a la derecha, pill `--surface-2` + `--shadow-lg`; botón activo `--ink` / `--paper`.

## 9. Movimiento
| Animación | Dónde | Definición |
|---|---|---|
| `pulse` 2s infinite | `live-dot`, `.feat-geo .fg-pin` | anillo `box-shadow` 0 → 8px, `rgba(31, 61, 255, 0.45)` → 0 |
| `pulse-orange` 2s infinite | `.feat-yuncar .fy-live .dot` | igual con `rgba(232, 80, 10, .5)` |
| `scroll` 60s linear infinite | `.marquee-track` | `translateX(0 → -50%)`; se pausa con el cursor encima |
| Elevación | tiles, cards | `transform .28s var(--ease)`, `box-shadow .28s var(--ease)` |
| Desplazamiento | `act-item` | `background .22s var(--ease-soft)`, `transform .22s var(--ease)` |
| Botones | `.btn` | `background .2s var(--ease-soft)`, `transform .15s var(--ease)` |
| Flechas | `.arrow` | `transform .2–.28s var(--ease)` |
| Foco | inputs | `border-color .18s`, `box-shadow .18s` |

- **Curvas:** `--ease: cubic-bezier(.22, 1, .36, 1)` (ease-out-quint) para movimiento; `--ease-soft: cubic-bezier(.4, 0, .2, 1)` para color y fondo.
- **`prefers-reduced-motion: reduce`:** detiene marquee y `live-dot`, y reduce toda transición o animación a `.01ms`.

## 10. Notas de implementación
- Usar siempre los tokens de `:root`; los hex sueltos solo se permiten dentro de las tarjetas `.feat-*` (§2).
- Separar con hairline o cambio de superficie; elevar con `--shadow-*`, no con bordes de tinta.
- Texto azul con `--electric-ink`; rellenos azules con `--electric`.
- Cambiar de tipografía solo con `data-type` en `<html>`; nunca fijar `font-family` de display a mano.
- Al activar `serif` en una página, cargar Spectral en su `<head>`.

## Historial

**v3 — «Papel & Voltaje»** (fuente: `towers-ing-v3.html`)
- Papel `#F1ECDF` / `#E8E2D1`, tinta `#0A0E1A` / `#3A3D48`, separador `--rule` `#1A1D2899`; spark `#FFE94A`.
- Rejilla estructural de 1px en tinta; esquinas rectas (solo pill `100px` y dot `50%`).
- Diseño plano: sin sombras de elevación, solo el anillo `pulse` (1.6s, 10px).
- Tipografía fija por rol: Fraunces (títulos y valores), Geist (cuerpo), JetBrains Mono en mayúsculas (datos).
- Fondo con cuadrícula de puntos de 28px + ruido fractal `feTurbulence`.
- Curva `cubic-bezier(.7,0,.2,1)`, barra azul de 3px en hover, ticker y footer sobre bloque de tinta.
- Sin bloque `prefers-reduced-motion`.
- **Pendiente:** el comentario de `index.html` (línea 9) aún dice «sistema v3 · Grotesk»; debe decir v3.1.
