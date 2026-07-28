/* =========================================================================
   sprites.tsx — Los componentes con su aspecto real.

   Mismo encuadre que la vista esquematica: origen en el centro y terminales
   a ±30, porque la geometria es compartida. Lo que cambia es el cuerpo.

   Lo importante aqui no es que "quede bonito": es que se vea LO QUE HAY QUE
   MIRAR en el laboratorio. Las bandas de la resistencia salen de su valor,
   el catodo del diodo lleva su franja, y el LED tiene cara plana y pata
   corta del lado del catodo. Identificar eso es objetivo de aprendizaje.
   ========================================================================= */

import type { ColorLed, Componente } from "@/motor/circuito";
import { bandasDe, leerBandas } from "./bandasColor";
import { formatearOhm } from "@/motor/valores";

const CUERPO_RESISTENCIA = "#d8c8a0";
const CUERPO_DIODO = "#232323";
const CUERPO_ZENER = "#b5701f";
const METAL = "#9aa1a8";

/** Patillas metalicas de un componente de dos terminales. */
function Patillas({ hasta = 20 }: { hasta?: number }) {
  return (
    <g className="patillas" stroke={METAL} strokeWidth={2.5} strokeLinecap="round">
      <line x1={-30} y1={0} x2={-hasta} y2={0} />
      <line x1={hasta} y1={0} x2={30} y2={0} />
    </g>
  );
}

function Resistencia({ componente }: { componente: Componente }) {
  const { valorOhm, toleranciaPct } = componente.params as {
    valorOhm: number;
    toleranciaPct: number;
  };
  const bandas = bandasDe(valorOhm, toleranciaPct);

  // Tres bandas juntas a la izquierda y la de tolerancia separada, como en
  // una resistencia de verdad: por eso se sabe por que extremo se lee.
  const posiciones = [-13, -7, -1, 12];

  return (
    <g>
      <Patillas hasta={19} />
      <rect
        x={-19}
        y={-11}
        width={38}
        height={22}
        rx={7}
        fill={CUERPO_RESISTENCIA}
        stroke="#a89a78"
        strokeWidth={1}
      />
      {bandas.map((banda, i) =>
        banda.hex === "transparent" ? null : (
          <rect
            key={i}
            x={posiciones[i]! - 2}
            y={-11}
            width={4}
            height={22}
            fill={banda.hex}
          />
        ),
      )}
      <title>
        {formatearOhm(valorOhm)} ±{toleranciaPct} % · {leerBandas(bandas)}
      </title>
    </g>
  );
}

function Potenciometro({ componente }: { componente: Componente }) {
  const { totalOhm, cursor } = componente.params as {
    totalOhm: number;
    cursor: number;
  };
  // El mando gira de −135° a +135°, como cualquier potenciometro real.
  const angulo = -135 + cursor * 270;

  return (
    <g>
      <Patillas hasta={19} />
      <line x1={0} y1={-30} x2={0} y2={-14} stroke={METAL} strokeWidth={2.5} />
      <rect
        x={-19}
        y={-13}
        width={38}
        height={26}
        rx={4}
        fill="#3a3f45"
        stroke="#23272e"
        strokeWidth={1}
      />
      <circle cx={0} cy={0} r={9} fill="#d7dbe0" stroke="#8b9199" strokeWidth={1} />
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={-8}
        stroke="#23272e"
        strokeWidth={2}
        strokeLinecap="round"
        transform={`rotate(${angulo})`}
      />
      <title>
        {formatearOhm(totalOhm)} · cursor al {Math.round(cursor * 100)} %
      </title>
    </g>
  );
}

/** Texto que se mantiene derecho aunque el componente esté girado. */
function Rotulo({
  x,
  y,
  rotacion,
  clase = "marca-fisica clara",
  children,
}: {
  x: number;
  y: number;
  rotacion: number;
  clase?: string;
  children: React.ReactNode;
}) {
  return (
    <text x={x} y={y} className={clase} transform={`rotate(${-rotacion} ${x} ${y})`}>
      {children}
    </text>
  );
}

function FuenteDC({
  componente,
  rotacion,
}: {
  componente: Componente;
  rotacion: number;
}) {
  const { tensionV } = componente.params as { tensionV: number };

  return (
    <g>
      <Patillas hasta={18} />
      <rect
        x={-18}
        y={-16}
        width={36}
        height={32}
        rx={4}
        fill="#2f3439"
        stroke="#1c1f22"
        strokeWidth={1}
      />
      {/* Bornes marcados: rojo el positivo, negro el negativo. */}
      <circle cx={-13} cy={0} r={4} fill="#c62828" />
      <circle cx={13} cy={0} r={4} fill="#111315" stroke="#5a626e" strokeWidth={1} />
      <Rotulo x={-13} y={-7} rotacion={rotacion}>
        +
      </Rotulo>
      <Rotulo x={13} y={-7} rotacion={rotacion}>
        −
      </Rotulo>
      <Rotulo x={0} y={12} rotacion={rotacion} clase="marca-fisica clara pequena">
        {tensionV.toString().replace(".", ",")} V
      </Rotulo>
      <title>Fuente DC de {tensionV} V · borne rojo positivo</title>
    </g>
  );
}

function Interruptor({ componente }: { componente: Componente }) {
  const { cerrado } = componente.params as { cerrado: boolean };

  return (
    <g>
      <Patillas hasta={17} />
      <rect
        x={-17}
        y={-11}
        width={34}
        height={22}
        rx={3}
        fill="#42484f"
        stroke="#23272e"
        strokeWidth={1}
      />
      {/* La palanca se ve fisicamente de un lado o del otro. */}
      <rect
        x={cerrado ? 1 : -13}
        y={-7}
        width={12}
        height={14}
        rx={2}
        fill="#e3e6ea"
      />
      <title>Interruptor {cerrado ? "cerrado" : "abierto"}</title>
    </g>
  );
}

function Diodo() {
  return (
    <g>
      <Patillas hasta={13} />
      <rect x={-13} y={-8} width={26} height={16} rx={3} fill={CUERPO_DIODO} />
      {/* La franja marca el catodo. Es lo que hay que mirar para montarlo. */}
      <rect x={6} y={-8} width={4} height={16} fill="#e8eaec" />
      <title>Diodo de señal · la franja clara es el cátodo</title>
    </g>
  );
}

function Zener() {
  return (
    <g>
      <Patillas hasta={13} />
      {/* Cuerpo de vidrio ambar: se distingue del diodo comun a simple vista. */}
      <rect x={-13} y={-8} width={26} height={16} rx={7} fill={CUERPO_ZENER} />
      <rect x={6} y={-8} width={4} height={16} fill="#1c1c1c" />
      <title>Zener · cuerpo de vidrio, franja oscura en el cátodo</title>
    </g>
  );
}

const COLOR_LED: Record<ColorLed, { apagado: string; encendido: string }> = {
  rojo: { apagado: "#8e3b34", encendido: "#ff4a3a" },
  verde: { apagado: "#3a6b46", encendido: "#3ddc6b" },
  azul: { apagado: "#33517a", encendido: "#4aa3ff" },
  blanco: { apagado: "#b9b7ad", encendido: "#fffdf2" },
};

function Led({ componente, brillo }: { componente: Componente; brillo: number }) {
  const { color } = componente.params as { color: ColorLed };
  const paleta = COLOR_LED[color];
  const relleno = brillo > 0 ? paleta.encendido : paleta.apagado;

  return (
    <g>
      {/* Patilla del anodo: larga. */}
      <line
        x1={-30}
        y1={0}
        x2={-11}
        y2={0}
        stroke={METAL}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      {/* Patilla del catodo: se dibuja mas corta, como en el componente real. */}
      <line
        x1={30}
        y1={0}
        x2={17}
        y2={0}
        stroke={METAL}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <line x1={17} y1={0} x2={12} y2={0} stroke={METAL} strokeWidth={4} />

      {brillo > 0 && (
        <circle
          cx={0}
          cy={0}
          r={13 + brillo * 9}
          fill={paleta.encendido}
          opacity={0.12 + brillo * 0.4}
        />
      )}

      {/* Cupula, con la cara plana del lado del catodo. */}
      <path
        d="M -12 -11 A 12 12 0 0 1 -12 11 L 12 11 L 12 -11 Z"
        fill={relleno}
        stroke="#00000033"
        strokeWidth={1}
        opacity={brillo > 0 ? 1 : 0.85}
      />
      <title>
        LED {color} · cara plana y pata corta en el cátodo
        {brillo > 0 ? ` · encendido al ${Math.round(brillo * 100)} %` : " · apagado"}
      </title>
    </g>
  );
}

function Tierra() {
  return (
    <g>
      <line x1={0} y1={-20} x2={0} y2={-8} stroke={METAL} strokeWidth={2.5} />
      <rect x={-13} y={-8} width={26} height={9} rx={2} fill="#5a626e" />
      <path
        d="M -9 1 L -6 8 M -3 1 L 0 8 M 3 1 L 6 8"
        stroke="#5a626e"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <title>Punto de referencia (0 V)</title>
    </g>
  );
}

export interface PropsSprite {
  componente: Componente;
  brillo?: number;
  /** Rotación del componente, para contrarrotar los rótulos. */
  rotacion?: number;
}

export function Sprite({ componente, brillo = 0, rotacion = 0 }: PropsSprite) {
  switch (componente.tipo) {
    case "resistencia":
      return <Resistencia componente={componente} />;
    case "potenciometro":
      return <Potenciometro componente={componente} />;
    case "fuenteDC":
      return <FuenteDC componente={componente} rotacion={rotacion} />;
    case "interruptor":
      return <Interruptor componente={componente} />;
    case "diodo":
      return <Diodo />;
    case "zener":
      return <Zener />;
    case "led":
      return <Led componente={componente} brillo={brillo} />;
    case "tierra":
      return <Tierra />;
    default:
      return null;
  }
}
