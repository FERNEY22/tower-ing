# Laboratorio de circuitos — Electrónica IFA00112

Simulador de circuitos DC con cinco lecciones evaluadas y práctica libre.
Ingeniería Mecatrónica · Universidad EAN · 2026-2.

Proyecto **independiente**: no comparte código, datos ni panel docente con
ninguna otra experiencia del repositorio.

## Arrancar

```bash
npm install
npm run dev        # http://localhost:5173
```

Sin configuración de Firebase, la aplicación arranca sola con un almacén en
memoria: se puede desarrollar y probar todo sin credenciales. Los datos se
pierden al recargar, que es justo lo que se quiere en desarrollo.

Para conectar la nube: copia `.env.example` a `.env` y completa las variables
`VITE_FB_*`. En cuanto haya `VITE_FB_DATABASE_URL`, el backend pasa a Firebase.
Se puede forzar en cualquier dirección con `VITE_ALMACEN=memoria|firebase`.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm test` | Pruebas (Vitest) |
| `npm run test:watch` | Pruebas en modo continuo |
| `npm run typecheck` | Solo comprobación de tipos |
| `npm run build` | `dist/` listo para publicar |

## Despliegue

Netlify, con `netlify.toml` ya configurado: build `npm run build`, publicación
`dist/`. La reescritura a `index.html` es obligatoria — sin ella, entrar directo
a `/panel` o `/leccion/l1` da 404.

**No funciona abriendo `index.html` con doble clic.** Necesita servidor: el hash
de la cédula usa Web Crypto, que solo existe en contexto seguro (localhost o
https).

## Cómo está organizado

```
src/
  config.ts          ⚙ TODOS los parámetros de política: intentos, pesos de la
                       rúbrica, umbrales, tiempos, tolerancias del motor,
                       nivel de registro. Ningún otro archivo define numeros.

  plataforma/        Ingreso, panel del estudiante, panel docente, registro de
                     eventos y persistencia. Nada de esto sabe de circuitos.
    ingreso/         Validación, hash y enmascarado de la cédula
    panel/           Tarjetas de lecciones y reglas de desbloqueo
    registro/        Catálogo de eventos, cola de envío, tiempo activo
    almacen/         api.ts es la interfaz; memoria.ts y firebase.ts la cumplen
    docente/         auth.ts, PanelDocente.tsx, exportarCSV.ts

  estado/            Stores. sesionStore (identidad) y circuitoStore (el
                     circuito vivo: fuente de verdad de las dos vistas)

  vistas/
    compartido/      geometria.ts — dónde está cada terminal
                     LienzoSVG.tsx — el lienzo interactivo. Rejilla, cables,
                     terminales, etiquetas y ratón: todo lo que NO depende
                     de cómo se dibuje un componente
    esquematica/     simbolos.tsx, enrutado.ts, RenderEsquematica.tsx
    fisica/          bandasColor.ts, sprites.tsx, RenderFisica.tsx
    Lienzo.tsx       Paleta + lienzo + inspector + diagnósticos

  motor/             Simulación pura. Cero imports de UI.
    circuito.ts      Modelo + derivación de la red de nodos (union-find)
    topologia.ts     Las cinco validaciones previas al solver
    diagnostico.ts   Catálogo de mensajes en lenguaje de estudiante
    valores.ts       Serie E12 y formato de magnitudes
    matriz.ts        Gauss con pivoteo parcial. No sabe de circuitos
    mna.ts           Estampado del sistema [G B; C D]
    solverLineal.ts  Resuelve y traduce a tensiones y corrientes
    parametros.ts    Is y n calibrados a lo que enseña el curso
    newton.ts        Iteración, limitación de paso, escalonamiento de gmin
    modelos/         union.ts (matemática PN) + diodo, led, zener
    quemado.ts       Límites, quemado en cascada y re-solución
    index.ts         resolver(): la única puerta del motor

  instrumentos/      multimetro.ts (lógica) + PanelMultimetro.tsx (interfaz)

  lecciones/         tipos.ts, calificacion.ts, MotorLeccion.tsx, CurvaIV.tsx
    datos/           una lección por archivo: circuito, avería, distractores
                     y criterio de verificación

  exportacion/       hashCircuito.ts (huella canónica) + pngMarcaAgua.ts
  practica/          PracticaLibre.tsx + CircuitosGuardados.tsx
  estado/            Stores. sesionStore ahora; circuitoStore en la fase 4
  vistas/            Lienzo, vista física y esquemática (fases 4-5)
  instrumentos/      Multímetro (fase 6)
  lecciones/         Motor de lección, calificación y datos de l1..l5 (fases 7-8)
  practica/          Práctica libre (fase 9)
  exportacion/       PNG con marca de agua (fase 9)

tests/               Las pruebas de validación del motor son la puerta de cada
                     fase. No se avanza con una en rojo.
docs/
  spec.md            Especificación vigente
  guia-de-solucion.md Cómo resolver las cinco lecciones, paso a paso.
                     USO DOCENTE: contiene todas las respuestas
  prompt-original.md Prompt de partida, tal como se recibió
```

## Cómo cambiar las reglas del juego

Todo en `src/config.ts`:

- **Intentos por lección** → `INTENTOS.porLeccion` (hoy 3)
- **Pesos de la rúbrica** → `EVALUACION.pesos` (40/30/15/15)
- **Cuánto vale acertar el diagnóstico tarde** → `EVALUACION.puntajeDiagnosticoPorIntento`
- **Umbral de aprobación** → `EVALUACION.umbralAprobacion` (60 sobre 100)
- **Cuánto se registra** → `REGISTRO.nivel` (0 nada · 1 hitos · 2 todo)
- **Desbloqueo entre lecciones** → `PROGRESION`
- **Tolerancias del solver** → `MOTOR`

Las pruebas están escritas contra el *comportamiento*, no contra los números:
subir `INTENTOS.porLeccion` de 3 a 5 no rompe ninguna.

## Privacidad

La cédula no se almacena completa en ningún sitio, ni siquiera como clave. Se
guarda un SHA-256 salado y truncado, más la máscara `••••678`. El docente nunca
ve el número. Las variables `VITE_*` terminan dentro del bundle público: la
protección real de los datos son las reglas de la Realtime Database.

## Estado

**El motor está terminado y validado.** Fases 0 a 3 cerradas, 237 pruebas.
Pasan los cuatro casos de la especificación (§11), las cuatro calibraciones de
caída y la prueba de estrés de convergencia:

| Caso | Esperado | Estado |
|---|---|---|
| A · divisor 9 V, 1 kΩ + 2 kΩ | 6,000 V y 3,000 mA al 0,1 % | ✅ |
| B · LED rojo, 5 V, 330 Ω | 1,85–1,95 V y 9,2–9,6 mA | ✅ |
| C · diodo en inversa, 5 V, 1 kΩ | < 1 µA, casi toda la tensión en el diodo | ✅ |
| D · zener 5,1 V, Rs 220 Ω, carga 1 kΩ | 5,0–5,2 V y KCL al 0,1 % | ✅ |
| Calibración | 0,70 / 1,90 / 2,10 / 3,10 V a 20 mA | ✅ |
| Estrés | 10 diodos a 15 V, sin escalonar gmin | ✅ |

**El proyecto está completo.** Las diez fases cerradas, **603 pruebas** en
verde. Motor validado contra los cuatro casos de la especificación, las dos
vistas sincronizadas, multímetro con resistencias internas reales, modelo de
quemado, las cinco lecciones evaluadas, práctica libre con guardado y
exportación PNG, y panel docente con CSV.

Lo que queda fuera es lo que la especificación dejó explícitamente para una
fase 2: protoboard, análisis transitorio, condensadores y el rectificador.

### Las cinco lecciones

| # | Avería sembrada | Lo que hay que hacer |
|---|---|---|
| 1 | R de 100 kΩ donde tocaban 680 Ω | Leer las bandas y dimensionar |
| 2 | LED sin limitadora, con el interruptor **abierto** | Diagnosticar antes de cerrarlo |
| 3 | Diodo montado al revés | Distinguir invertido de quemado |
| 4 | R fija de 22 kΩ que aplasta el punto Q | Que el barrido recorra la curva |
| 5 | Zener en directa | Corregir polaridad y aguantar carga dura |

### Convenciones del motor que conviene conocer

**La conectividad la definen solo los cables.** El `nodoId` de cada terminal no
se guarda: se deriva con union-find en `construirRed()` cada vez que hace falta.
Es lo que evita que la lista de cables y la asignación de nodos se desincronicen.

**Para la topología, todo componente conduce**, sin mirar su estado. Un
interruptor abierto y un componente quemado siguen contando como camino. Si no
fuera así, cualquier circuito con un interruptor abierto dispararía media docena
de avisos de nodo flotante. El corte real lo resuelve el solver con `gmin`.

**La corriente de una fuente se reporta invertida respecto a MNA.** En la
formulación estándar, `j` es la corriente que *entra* a la fuente, así que una
fuente que alimenta un circuito da `j` negativo. El motor invierte el signo una
sola vez, al construir el resultado, para que el estudiante vea la corriente
entregada en positivo. Dentro del motor rige la convención MNA sin excepciones.

**`gmin` deja un suelo de ruido de ~1e-9.** La conductancia de fuga de 1e-12 S
por nodo hace que dos resistencias en serie no lleven corrientes idénticas al
último bit: difieren en unos pocos picoamperios. Por eso las pruebas contrastan
corrientes al nanoamperio y tensiones a los 100 nV, no más allá. Por debajo de
eso no hay física, hay `gmin`.

**Los parámetros de los diodos no son los del fabricante.** `Is` y `n` se eligen
para que la caída directa a 20 mA coincida con lo que se enseña en clase: 0,70 V
en el diodo de silicio, 1,90 / 2,10 / 3,10 V en los LED. Con los parámetros de
catálogo de un 1N4148 el simulador diría 0,58 V, el estudiante concluiría que su
cálculo a mano está mal, y la lección se volvería en su contra. Está en
`parametros.ts` y hay cuatro pruebas de circuito completo que lo verifican.

**«5,1 V» en un zener es la tensión a la corriente de prueba**, no el parámetro
interno del modelo. Entre una y otra hay el codo de la exponencial, unos 0,43 V.
Sin esa corrección un zener de 5,1 V regularía a 5,53 V y el caso D fallaría.

**Por encima del exponente máximo la curva sigue por su tangente**, no se aplana.
Saturar la exponencial es obligatorio —se desborda a la primera—, pero dejar la
corriente constante mientras la conductancia sigue siendo enorme haría que el
criterio de convergencia por corriente no se cumpliera jamás.

**El circuito se resuelve en cada cambio, no hay botón de simular.** Los
circuitos del curso tienen menos de una docena de nodos, así que recalcular es
barato — y es lo que hace que la corriente cambie mientras el estudiante mueve
el cursor del potenciómetro.

**Las dos vistas comparten `LienzoSVG`, no solo el modelo.** Rejilla, cables,
terminales, etiquetas y todo el manejo del ratón viven en un único archivo; lo
que cambia entre vistas es exclusivamente el símbolo dibujado dentro de cada
componente. Si cada vista tuviera su propia interacción, tarde o temprano se
separarían — que es justo lo que la especificación prohíbe.

**Las bandas de color salen del valor real.** `bandasDe(1000, 5)` da marrón,
negro, rojo, oro, y `valorDeBandas` vuelve a 1000. Hay una prueba que recorre
toda la serie E12 en cinco décadas comprobando la ida y vuelta. La lección 1
consiste en leer esas bandas: si fueran decorativas, no habría lección.

**El multímetro no lee el circuito: se monta en él.** Cada medida construye una
copia del circuito con el instrumento dentro y la resuelve. Por eso el
voltímetro de 10 MΩ carga la rama que mide y el amperímetro introduce sus 0,1 Ω.
Un instrumento ideal sería más fácil de programar y le enseñaría al estudiante
algo que no es verdad.

**El amperímetro en paralelo no se impide: se hace y se explica.** Es el error
que hay que aprender a no cometer, así que el simulador lo ejecuta, muestra la
corriente disparada y lo marca como cortocircuito.

**La regla central del curso está en el flujo, no solo en la rúbrica.** Al
lienzo editable no se llega hasta haber declarado el diagnóstico correcto: no es
que reparar antes puntúe cero, es que no se puede. La rúbrica lo codifica
también (los 30 puntos de reparación están condicionados al diagnóstico), pero
la barrera está antes.

**Reemplazar un componente en un circuito todavía roto lo vuelve a quemar al
instante.** Es lo que pasa en el laboratorio y está probado. En la lección 1 eso
significa que hay que arreglar la resistencia *antes* de cambiar el LED.

**Una avería sembrada no puede quemar nada al cargar.** Si el circuito inicial
destruye un componente, el estudiante no llega a una avería: llega a un
cadáver. Pasó en la lección 5, cuya resistencia serie disipaba 0,58 W con una
nominal de 0,5. Hay dos pruebas que lo vigilan en las cinco lecciones, y una
exige además un 20 % de margen sobre la potencia nominal.

**Rotar un componente no cambia su polaridad.** Mueve el dibujo, no las
conexiones — y las lecciones 3 y 5 se apoyan en eso: para invertir un diodo hay
que recablearlo. Los mensajes de verificación lo dicen explícitamente, porque
es el primer intento de todo el mundo.

**La huella del circuito ignora el dibujo.** Se calcula sobre una forma
canónica sin posiciones, sin rotaciones y sin los identificadores que haya
puesto cada quien: dos equipos que monten lo mismo obtienen la misma huella, y
mover una resistencia por el lienzo no cambia el trabajo entregado. No resuelve
isomorfismo de grafos —dos circuitos distintos con idéntica composición por nodo
podrían colisionar—, pero para un curso sobra.

**La práctica libre guarda el circuito, no una captura.** Recuperarlo devuelve
algo editable y resoluble, con sus valores intactos.

**Sin Firebase configurado, la autenticación del docente es simulada — y la
pantalla lo dice en grande.** Una puerta falsa silenciosa es peor que no tener
puerta. En producción es Firebase Auth con el correo autorizado del docente, y
la protección real de los datos son las reglas de la Realtime Database.

## Antes de usarlo con estudiantes

1. Crear el proyecto en Firebase y completar `.env` con las variables `VITE_FB_*`.
2. **Escribir las reglas de la Realtime Database.** Sin ellas el nodo
   `electronica1` queda abierto: cualquiera podría leer o borrar el progreso del
   curso. Como mínimo: lectura de `participantes` y `progreso` solo para el
   correo del docente, y escritura del propio nodo para cada estudiante.
3. Dar de alta el correo del docente en Firebase Auth.
4. Abrirlo en un navegador y recorrer una lección entera. **Nada de esto se ha
   visto nunca en pantalla**: está verificado con 603 pruebas contra un DOM,
   pero no con ojos.

## Dos trampas del entorno

**Nunca dos archivos que solo difieran en mayúsculas.** `multimetro.ts` y
`Multimetro.tsx` en la misma carpeta se resuelven al mismo módulo en Windows: el
store acabó importando el componente en vez de la lógica y reventaron 36
pruebas. Por eso la interfaz se llama `PanelMultimetro.tsx`.

## Una trampa al probar la interfaz

Las pruebas de `tests/vistas/render.test.tsx` montan los componentes contra un
DOM real (`jsdom` + `createRoot`), **no** con `renderToStaticMarkup`. Zustand
devuelve el estado *inicial* en render de servidor: una prueba a cadena dibuja
siempre el lienzo vacío y pasa sin comprobar nada. Costó nueve falsos negativos
descubrirlo.
