---
name: Towers Ing — v3
description: Sistema de diseño "Papel & Voltaje" — editorial técnico sobre papel crema con tinta casi-negra, una señal azul eléctrica y una chispa amarilla. Fuente de verdad extraída de towers-ing-v3.html.
source: towers-ing-v3.html
version: 3.0
colors:
  paper: "#F1ECDF"
  paper-2: "#E8E2D1"
  ink: "#0A0E1A"
  ink-soft: "#3A3D48"
  electric: "#1F3DFF"
  electric-glow: "#4D66FF"
  spark: "#FFE94A"
  rule: "#1A1D28"          # usado con alfa 0x99 (~60%) → rgba(26,29,40,.6)
  pos-text: "#1A7F4E"      # cambio positivo (indicadores)
  pos-bg: "#6BFFB8"        # verde, fondo/tinte al ~13%
  neg-text: "#B83247"      # cambio negativo (indicadores)
  neg-bg: "#FF8FA3"        # rojo-rosa, fondo/tinte al ~13%
  tick-flat: "#BFC2CC"     # ticker neutro
typography:
  fonts:
    serif: "'Fraunces', serif"           # display, títulos, valores
    sans: "'Geist', system-ui, sans-serif" # cuerpo, UI
    mono: "'JetBrains Mono', monospace"    # etiquetas, metadatos, datos
  scale:
    hero-h1:    { font: serif, weight: 300, size: "clamp(48px,7vw,110px)", lineHeight: 0.95, letterSpacing: "-0.04em" }
    footer-big: { font: serif, weight: 300, size: "56px",  lineHeight: 0.95, letterSpacing: "-0.03em" }
    h2:         { font: serif, weight: 400, size: "38px",  letterSpacing: "-0.02em" }
    stat-num:   { font: serif, weight: 400, size: "36px",  lineHeight: 1 }
    ed-title:   { font: serif, weight: 400, size: "28px",  letterSpacing: "-0.01em" }
    auth-h4:    { font: serif, weight: 400, size: "24px",  letterSpacing: "-0.02em" }
    act-title:  { font: serif, weight: 400, size: "22px",  lineHeight: 1.2, letterSpacing: "-0.01em" }
    panel-h4:   { font: serif, weight: 400, size: "18px",  letterSpacing: "-0.01em" }
    ind-val:    { font: serif, weight: 400, size: "17px",  lineHeight: 1 }
    body:       { font: sans,  weight: 400, size: "16px",  lineHeight: 1.5 }
    input:      { font: sans,  weight: 400, size: "14px" }
    desc:       { font: sans,  weight: 400, size: "13px" }
    ind-name:   { font: sans,  weight: 500, size: "12px" }
    mono-base:  { font: mono,  weight: 400, size: "11px",  letterSpacing: "0.04em", transform: "uppercase" }
    submit:     { font: mono,  weight: 400, size: "11px",  letterSpacing: "0.1em",  transform: "uppercase" }
    footer-h5:  { font: mono,  weight: 400, size: "11px",  letterSpacing: "0.12em", transform: "uppercase" }
    field-label:{ font: mono,  weight: 400, size: "9px",   letterSpacing: "0.08em", transform: "uppercase" }
    micro:      { font: mono,  weight: 400, size: "9px" }
rounded:
  none: "0"        # default — bordes rectos (grid editorial)
  pill: "100px"    # badges, chips de cambio, tabs, botones tipo cápsula
  dot: "50%"       # puntos de estado (live-dot)
borders:
  hard: "1px solid #0A0E1A"            # rejilla estructural (--ink)
  soft: "1px solid rgba(26,29,40,.6)"  # separadores internos (--rule)
shadows:
  none: "none"     # diseño plano — la profundidad viene de bordes, no de sombras
  pulse: "0 0 0 0 → 0 0 0 10px rgba(31,61,255,0.55→0)"  # anillo animado (puntos en vivo)
spacing:
  section-pad: "40px"   # padding horizontal de secciones principales
  side-pad: "24px"      # padding horizontal del panel lateral
  layout-side: "360px"  # ancho de la columna lateral
  dot-grid: "28px"      # paso del fondo punteado
components:
  submit-btn: { bg: "{colors.ink}", text: "{colors.paper}", hover-bg: "{colors.electric}", accent: "{colors.spark}", padding: "14px 22px", rounded: none }
  source-badge: { border: "{borders.hard}", text: "{colors.electric}", rounded: pill, padding: "3px 10px" }
  chg-pill: { rounded: pill, padding: "2px 7px", border: "1px solid" }
  auth-tab: { border: "{borders.hard}", rounded: pill, padding: "6px 14px", active-bg: "{colors.ink}", active-text: "{colors.paper}" }
  field-input: { border-bottom: "{borders.hard}", focus-border: "{colors.electric}", padding: "8px 0" }
---

# Sistema de Diseño — Towers Ing v3

> **Fuente de verdad:** `towers-ing-v3.html`. Esta versión reemplaza cualquier propuesta anterior (incluido el sistema navy/azure "El Tablero de Ingeniería"). Todo nuevo trabajo se alinea a lo aquí documentado.

## 1. Concepto — "Papel & Voltaje"

Un editorial técnico impreso sobre **papel crema**, con **tinta casi-negra**, organizado por una **rejilla rígida de 1px** como una página de periódico o un cuaderno de ingeniería. Sobre esa base sobria, dos colores eléctricos hacen el trabajo expresivo: un **azul voltaje** que señala acción/foco/enlace, y una **chispa amarilla** que aparece como destello puntual (el ⚡). Texturas sutiles —cuadrícula de puntos y ruido fractal— dan grano de papel real, no de pantalla.

El resultado se siente **analógico y de alta tensión a la vez**: tipografía serif elegante (Fraunces) para la voz editorial, monoespaciada (JetBrains Mono) para los datos e instrumentos, y una sans neutra (Geist) para el cuerpo. Plano por diseño: no hay sombras de tarjeta; la jerarquía y la profundidad se construyen con bordes, color y movimiento.

**Características clave**
- Lienzo de **papel** (`#F1ECDF`) + **tinta** (`#0A0E1A`); contraste casi tipográfico.
- **Rejilla de 1px** omnipresente como sistema estructural (no decoración).
- **Azul eléctrico** = única señal de acción/foco/enlace. **Amarillo** = chispa puntual, nunca relleno.
- **Plano**: cero sombras de elevación; profundidad por borde + textura.
- Mezcla deliberada de tres familias por rol: **serif (voz)**, **mono (dato)**, **sans (cuerpo)**.

## 2. Color

Definidos como variables CSS en `:root`.

### Base — Papel & Tinta
| Token | Hex | Uso |
|---|---|---|
| `--paper` | `#F1ECDF` | Fondo de página y de la columna lateral. Lienzo crema. |
| `--paper-2` | `#E8E2D1` | Superficie secundaria: cabeceras de panel, pie de panel, fondo del bloque de acceso, **hover** de filas e ítems. |
| `--ink` | `#0A0E1A` | Texto principal, **todos los bordes de la rejilla**, fondo de secciones oscuras (ticker, footer, botón). |
| `--ink-soft` | `#3A3D48` | Texto secundario: descripciones, fechas, unidades, labels de apoyo. |

### Señal — Voltaje
| Token | Hex | Uso |
|---|---|---|
| `--electric` | `#1F3DFF` | **La señal.** Acción, enlaces, números de índice, foco de input, barra de hover, énfasis `<em>` en títulos, punto en vivo. |
| `--electric-glow` | `#4D66FF` | Variante más clara del azul para sobre fondo oscuro: títulos `h5` del footer, marca y `<em>` del footer. |
| `--spark` | `#FFE94A` | **La chispa.** Destello puntual: el ⚡ del hero, la flecha ⚡ del botón Entrar. Nunca como relleno de área. |

### Estructura sutil
| Token | Valor | Uso |
|---|---|---|
| `--rule` | `#1A1D2899` (≈ `rgba(26,29,40,.6)`) | Separadores **internos** suaves dentro de paneles (filas de indicadores, group-labels, pie). Más tenue que `--ink`. |

### Semánticos — solo estado de dato
Aparecen en indicadores y en el ticker para comunicar dirección de cambio; **nunca decoran**.

| Contexto | Texto | Borde | Fondo/Tinte |
|---|---|---|---|
| Positivo (chip `.chg.up`) | `#1A7F4E` | `#1A7F4E33` | `#6BFFB822` |
| Negativo (chip `.chg.down`) | `#B83247` | `#B8324733` | `#FF8FA322` |
| Neutro (chip `.chg.flat`) | `--ink-soft` | `--rule` | transparente |
| Ticker sube | `#6BFFB8` | — | — |
| Ticker baja | `#FF8FA3` | — | — |
| Ticker plano | `#BFC2CC` (op .7) | — | — |

> **Nota sobre verde/rojo:** los hex "vivos" (`#6BFFB8`, `#FF8FA3`) se usan a tono pleno solo sobre el fondo oscuro del ticker; en los chips claros del panel van como tinte al ~13% (sufijo `22`) con texto en versiones más oscuras y legibles (`#1A7F4E`, `#B83247`).

### Reglas de color
- **Señal única:** el azul eléctrico marca acción y foco. Si está en todo, deja de señalar.
- **Chispa, no pintura:** el amarillo `--spark` es un acento de 1–2 apariciones por vista; jamás fondo ni texto extenso.
- **Bordes = tinta:** la rejilla estructural siempre es `--ink` a 1px; los separadores internos, `--rule`.

## 3. Tipografía

Tres familias cargadas desde Google Fonts, cada una con un rol fijo:

```
Fraunces (serif, opsz 9..144) — pesos 300, 400, 500, 600 + itálica 400
Geist (sans)                  — pesos 300, 400, 500, 600
JetBrains Mono                — pesos 400, 500
```

- **Fraunces — la voz editorial.** Display y todos los títulos, además de los **valores numéricos** (stats, valores de indicador). Se usa en pesos ligeros (300 en hero/footer, 400 en el resto) con tracking negativo para un aire elegante. La itálica (`<em>` / `.ital`) marca énfasis, casi siempre coloreada en azul eléctrico.
- **Geist — el cuerpo.** Texto corrido, párrafos, inputs, nombres de indicador. Neutra y legible. `body` por defecto: 400 / 16px / lh 1.5.
- **JetBrains Mono — el instrumento.** Etiquetas, metadatos, unidades, badges, botones, navegación, datos del ticker. Siempre en MAYÚSCULAS con letter-spacing positivo. Clase base `.mono`: 11px / ls .04em / uppercase.

### Escala de tamaños
| Rol | Familia | Peso | Tamaño | Line-height | Letter-spacing |
|---|---|---|---|---|---|
| Hero H1 | Fraunces | 300 | `clamp(48px, 7vw, 110px)` | 0.95 | -0.04em |
| Footer "big" | Fraunces | 300 | 56px | 0.95 | -0.03em |
| Sección H2 | Fraunces | 400 | 38px | — | -0.02em |
| Stat número | Fraunces | 400 | 36px | 1 | — |
| Editorial título | Fraunces | 400 | 28px | — | -0.01em |
| Auth H4 | Fraunces | 400 | 24px | — | -0.02em |
| Actividad título | Fraunces | 400 | 22px | 1.2 | -0.01em |
| Panel H4 | Fraunces | 400 | 18px | — | -0.01em |
| Indicador valor | Fraunces | 400 | 17px | 1 | — |
| Cuerpo / hero-p | Geist | 400 | 16px | 1.5 | — |
| Input | Geist | 400 | 14px | — | — |
| Descripción | Geist | 400 | 13px | — | — |
| Indicador nombre | Geist | 500 | 12px | — | — |
| Mono base / nav / ticker | JetBrains Mono | 400 | 11px | — | .04em (uppercase) |
| Botón submit | JetBrains Mono | 400 | 11px | — | .1em (uppercase) |
| Footer H5 | JetBrains Mono | 400 | 11px | — | .12em (uppercase) |
| Indicador cambio | JetBrains Mono | 400 | 10px | — | — |
| Unidad indicador | JetBrains Mono | 400 | 9px | — | .06em (uppercase) |
| Label de campo | JetBrains Mono | 400 | 9px | — | .08em (uppercase) |
| Micro (live-stamp, group-label, foot) | JetBrains Mono | 400 | 9px | — | — |

### Reglas tipográficas
- **Tres roles, no mezcla libre:** serif = voz/título/valor, mono = etiqueta/dato, sans = cuerpo. No intercambiar roles.
- **Énfasis en itálica azul:** `<em>` dentro de títulos serif va en itálica + color de señal (`--electric`, o `--electric-glow` sobre oscuro).
- **Mono siempre en mayúsculas** con tracking; nunca frases largas en mono.

## 4. Radios

El sistema es deliberadamente **rectangular** — la rejilla editorial vive de esquinas a 90°.

| Token | Valor | Uso |
|---|---|---|
| (default) | `0` | Secciones, paneles, inputs, tarjetas, botón submit — sin redondeo. |
| pill | `100px` | Badge de fuente, chips de cambio, tabs de acceso, botones tipo cápsula. |
| dot | `50%` | Puntos de estado en vivo (`live-dot`, `live-stamp::before`). |

## 5. Sombras y elevación

**Diseño plano.** No hay `box-shadow` de elevación en tarjetas, paneles ni superficies: la profundidad y la separación se logran con la rejilla de 1px (`--ink`), los separadores `--rule` y los cambios de superficie (`--paper` ↔ `--paper-2`).

La única sombra del sistema es **funcional, no estética**: el anillo pulsante de los indicadores "en vivo".

```css
/* anillo de pulso — live-dot / live-stamp::before */
@keyframes pulse {
  0%   { box-shadow: 0 0 0 0  rgba(31,61,255,0.55); }
  70%  { box-shadow: 0 0 0 10px rgba(31,61,255,0); }
  100% { box-shadow: 0 0 0 0  rgba(31,61,255,0); }
}
```

> **Regla:** si algo necesita "despegarse", se resuelve con borde o cambio de superficie, no con sombra difusa.

## 6. Texturas de fondo

Dos capas dan el grano de "papel" sobre el lienzo crema:

1. **Cuadrícula de puntos** (en `body`): `radial-gradient(circle at 1px 1px, rgba(10,14,26,0.08) 1px, transparent 0)` con `background-size: 28px 28px`. Retícula técnica tenue.
2. **Ruido fractal** (en `body::before`, `position: fixed; inset:0`): SVG `feTurbulence` (`baseFrequency 0.9`, 2 octavas) al `opacity: .55` con `mix-blend-mode: multiply` y `pointer-events: none`. Da grano analógico. Vive en `z-index: 1`; el contenido va por encima.

## 7. Layout

- **Rejilla principal** (`.layout`): dos columnas `1fr 360px`, con borde inferior y divisorias de 1px (`--ink`). La columna principal lleva `border-right`.
- **Columna lateral** (`.side-col`): `position: sticky; top: 0`, fondo `--paper`.
- **Z-index:** ruido `1` → footer `3` → layout `4` → topbar/ticker/panel `5`.
- **Padding de sección:** 40px horizontal en bloques principales; 24px en el panel lateral.
- **Breakpoints:**
  - `≤1100px`: el layout colapsa a 1 columna; la lateral deja de ser sticky.
  - `≤720px`: paddings a 20px; el hero, el footer-grid, los ítems de actividad/editorial y el formulario se reflujan; H1/H2 reducen tamaño.

## 8. Componentes

### Topbar
Barra superior con `border-bottom` de tinta. Izquierda: estado del sistema con punto pulsante (`live-dot`) + coordenadas, todo en `.mono`. Derecha: navegación `.mono` con **subrayado animado** (`::after` que crece de 0 a 100% de ancho en azul, `transition .35s cubic-bezier(.7,0,.2,1)`).

### Ticker / Marquee
Banda de ancho completo en fondo `--ink`, texto `--paper`. Pista (`.marquee-track`) con `animation: scroll 50s linear infinite` (translateX 0 → -50%, contenido duplicado para bucle continuo). Valores en `<strong>` 500; dirección coloreada con clases `.up` / `.down` / `.flat`.

### Hero
`padding 72px 40px 56px`. Etiqueta superior `.mono` con número en azul. **H1** Fraunces 300 gigante con `.ital` (itálica) y `.accent` (azul) que lleva un ⚡ amarillo pseudo-elemento rotado 12° con contorno de tinta. Abajo: rejilla 1fr/1fr con párrafo (16px, ink-soft) y **stats** (3 columnas: número Fraunces 36px + label mono).

### Section-head
Cabecera reutilizable: H2 Fraunces 38px (con `<em>` azul itálico) a la izquierda + etiqueta `.mono` a la derecha, `border-bottom` de tinta. En móvil pasa a columna.

### Activity feed (`.act-item`)
Enlaces en rejilla `90px 130px 1fr auto` (fecha · fuente · título · flecha), separados por borde inferior. **Hover:** fondo `--paper-2`, `padding-left` aumenta (22→56px) y una **barra azul de 3px** entra deslizándose por la izquierda (`::before`, translateX -100%→0, `.35s cubic-bezier(.7,0,.2,1)`); la flecha → se desplaza 6px. `.source` es un badge pill con borde de tinta y texto azul. Título en Fraunces 22px; placeholders en itálica ink-soft.

### Editorial list (`.ed-item`)
Mismo patrón de hover (barra azul + padding + fondo) en rejilla `60px 1fr auto`: índice azul `.mono`, título Fraunces 28px + descripción 13px, flecha →. En hover la flecha hace `translateX(6px) rotate(-45deg)` y se vuelve azul (gesto de "abrir/salir").

### Panel de indicadores (`.panel`)
- **panel-head:** fondo `--paper-2`, H4 Fraunces 18px (con `<em>` azul) + `live-stamp` con punto pulsante.
- **ind-group-label:** franja `.mono` 9px en azul, separa grupos (§ Mercado & macro, § Energía & clima).
- **ind-row:** rejilla `1fr auto auto`: etiqueta (nombre 12px/500 + unidad mono 9px) · valor Fraunces 17px alineado a la derecha · **chip de cambio** pill. Separadores `--rule`; hover sube a `--paper-2`.
- **chg:** pill mono 10px con borde, `min-width 60px`; variantes `.up` / `.down` / `.flat` (ver §2 semánticos).
- **panel-foot:** mono 9px, fuentes de datos, fondo `--paper-2`.

### Acceso / Auth (`.auth-side`)
Bloque sobre `--paper-2`. Etiqueta `// Acceso` en azul, H4 Fraunces 24px. **Tabs** tipo cápsula (borde de tinta; `.active` invierte a fondo tinta/texto papel). **Campos** con label mono 9px uppercase e input de **solo borde inferior** que pasa a azul en `:focus`. **Botón submit:** fondo tinta, texto papel, mono 11px ls .1em uppercase, flecha ⚡ amarilla; **hover** cambia el fondo a azul eléctrico.

### Footer
Sección sobre `--ink`, texto `--paper`. Rejilla `1.5fr 1fr 1fr 1fr`: marca (etiqueta mono + "big" Fraunces 300/56px con `<em>` en electric-glow) y tres columnas de enlaces con H5 mono en electric-glow. Enlaces a `opacity .85` → hover `1` + color `--spark`. Línea inferior mono con copyright y versión.

## 9. Animaciones y movimiento

| Animación | Dónde | Definición |
|---|---|---|
| `pulse` 1.6s infinite | `live-dot`, `live-stamp::before` | anillo `box-shadow` que se expande y desvanece (azul) |
| `scroll` 50s linear infinite | `marquee-track` | `translateX(0 → -50%)` para cinta continua |
| Subrayado nav | `nav.top-nav a::after` | ancho 0→100%, `transition .35s cubic-bezier(.7,0,.2,1)` |
| Barra de hover | `act-item::before`, `ed-item::before` | `translateX(-100% → 0)`, `.35s cubic-bezier(.7,0,.2,1)` |
| Desplazamiento de ítem | `act-item`, `ed-item` | `padding-left` + `background`, `.25–.3s ease` |
| Flecha | `.act-item .arrow`, `.ed-item .arrow` | `translateX(6px)` (+ `rotate(-45deg)` en editorial), `.3s ease` |
| Foco de input | `.field input` | `border-bottom-color` → azul, `.25s ease` |
| Hover de botón | `.submit-btn`, tabs | `background` → azul / inversión, `.25s ease` |

**Curva de marca:** `cubic-bezier(.7,0,.2,1)` para las entradas deslizantes (barra de hover, subrayado) — arranque rápido, salida suave. El resto usa `ease` corto (.2–.35s).

> El archivo v3 no define un bloque `prefers-reduced-motion`. Al implementar en producción, añadir uno que detenga el marquee y el pulso, y reduzca los desplazamientos, para accesibilidad.

## 10. Notas de implementación

- Variables CSS centralizadas en `:root`; reutilizar siempre los tokens en vez de hex sueltos.
- La identidad nace del **contraste papel/tinta + rejilla de 1px**; mantener ese andamiaje antes de añadir color.
- Azul = acción/foco; amarillo = chispa puntual; verde/rojo = solo dirección de dato. No ampliar el rol de ningún color.
- Plano por defecto: resolver separación con borde/superficie, no con sombra.
- Conservar la jerarquía de tres fuentes por rol (serif/mono/sans) en cualquier página nueva para que se reconozca la marca.
