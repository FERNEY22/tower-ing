/* =========================================================================
   simbolos.tsx — Simbologia normalizada del esquematico.

   Todo se dibuja en coordenadas locales, con el origen en el centro del
   componente y los terminales a ±30, tal como los declara geometria.ts. La
   rotacion la aplica el contenedor: aqui nadie la conoce.

   Se usa la simbologia de Boylestad, que es la del texto del curso: la
   resistencia va en zigzag, no en rectangulo.
   ========================================================================= */

import type { ColorLed, Componente, TipoComponente } from "@/motor/circuito";

const TRAZO = "currentColor";

/** Patillas de un componente de dos terminales horizontales. */
function Patillas({ hasta = 20 }: { hasta?: number }) {
  return (
    <>
      <line x1={-30} y1={0} x2={-hasta} y2={0} />
      <line x1={hasta} y1={0} x2={30} y2={0} />
    </>
  );
}

function Resistencia() {
  return (
    <>
      <Patillas />
      <polyline
        points="-20,0 -18,-8 -12,8 -6,-8 0,8 6,-8 12,8 18,-8 20,0"
        fill="none"
      />
    </>
  );
}

function Potenciometro() {
  return (
    <>
      <Resistencia />
      {/* Cursor: flecha que baja desde el terminal de arriba. */}
      <line x1={0} y1={-30} x2={0} y2={-13} />
      <polygon points="0,-9 -4,-17 4,-17" fill={TRAZO} stroke="none" />
    </>
  );
}

/**
 * Contrarrota un texto para que se lea derecho aunque el componente esté
 * girado. Sin esto, los signos + y − de una fuente vertical salen de lado.
 */
function Marca({
  x,
  y,
  rotacion,
  children,
}: {
  x: number;
  y: number;
  rotacion: number;
  children: React.ReactNode;
}) {
  return (
    <text x={x} y={y} className="marca" transform={`rotate(${-rotacion} ${x} ${y})`}>
      {children}
    </text>
  );
}

function FuenteDC({ rotacion }: { rotacion: number }) {
  return (
    <>
      <line x1={-30} y1={0} x2={-7} y2={0} />
      <line x1={7} y1={0} x2={30} y2={0} />
      {/* Barra larga: borne positivo. Barra corta: negativo. */}
      <line x1={-7} y1={-16} x2={-7} y2={16} />
      <line x1={7} y1={-8} x2={7} y2={8} />
      <Marca x={-16} y={-14} rotacion={rotacion}>
        +
      </Marca>
      <Marca x={12} y={-14} rotacion={rotacion}>
        −
      </Marca>
    </>
  );
}

function Interruptor({ cerrado }: { cerrado: boolean }) {
  return (
    <>
      <line x1={-30} y1={0} x2={-14} y2={0} />
      <line x1={14} y1={0} x2={30} y2={0} />
      <circle cx={-14} cy={0} r={2.5} fill={TRAZO} />
      <circle cx={14} cy={0} r={2.5} fill={TRAZO} />
      {/* La palanca sube cuando esta abierto: se ve de un vistazo. */}
      <line x1={-14} y1={0} x2={cerrado ? 14 : 11} y2={cerrado ? 0 : -14} />
    </>
  );
}

/** Triangulo y barra de catodo, base de los tres diodos. */
function CuerpoDiodo() {
  return (
    <>
      <Patillas hasta={10} />
      <polygon points="-10,-11 -10,11 10,0" fill="none" />
      <line x1={10} y1={-11} x2={10} y2={11} />
    </>
  );
}

function Diodo() {
  return <CuerpoDiodo />;
}

function Led({ color, brillo }: { color: ColorLed; brillo: number }) {
  return (
    <>
      <CuerpoDiodo />
      {/* Dos flechas de emision: es lo que distingue al LED del diodo. */}
      <g className="emision">
        <line x1={-2} y1={-14} x2={6} y2={-22} />
        <polygon points="6,-22 1,-20 4,-17" fill={TRAZO} stroke="none" />
        <line x1={6} y1={-14} x2={14} y2={-22} />
        <polygon points="14,-22 9,-20 12,-17" fill={TRAZO} stroke="none" />
      </g>
      {brillo > 0 && (
        <circle
          cx={0}
          cy={0}
          r={16}
          className={`halo halo-${color}`}
          style={{ opacity: 0.15 + brillo * 0.55 }}
        />
      )}
    </>
  );
}

function Zener() {
  return (
    <>
      <Patillas hasta={10} />
      <polygon points="-10,-11 -10,11 10,0" fill="none" />
      {/* La barra en Z es lo que lo separa de un diodo comun. */}
      <polyline points="4,-15 10,-11 10,11 16,15" fill="none" />
    </>
  );
}

function Tierra() {
  return (
    <>
      <line x1={0} y1={-20} x2={0} y2={-6} />
      <line x1={-13} y1={-6} x2={13} y2={-6} />
      <line x1={-8} y1={0} x2={8} y2={0} />
      <line x1={-3} y1={6} x2={3} y2={6} />
    </>
  );
}

export interface PropsSimbolo {
  componente: Componente;
  /** 0..1, solo para el LED. */
  brillo?: number;
  /** Rotación del componente, para contrarrotar los textos. */
  rotacion?: number;
}

export function Simbolo({ componente, brillo = 0, rotacion = 0 }: PropsSimbolo) {
  const tipo: TipoComponente = componente.tipo;

  switch (tipo) {
    case "resistencia":
      return <Resistencia />;
    case "potenciometro":
      return <Potenciometro />;
    case "fuenteDC":
      return <FuenteDC rotacion={rotacion} />;
    case "interruptor":
      return (
        <Interruptor
          cerrado={(componente.params as { cerrado: boolean }).cerrado}
        />
      );
    case "diodo":
      return <Diodo />;
    case "led":
      return (
        <Led
          color={(componente.params as { color: ColorLed }).color}
          brillo={brillo}
        />
      );
    case "zener":
      return <Zener />;
    case "tierra":
      return <Tierra />;
    default:
      return null;
  }
}

/** Miniatura para la paleta, ya encuadrada. */
export function MiniaturaSimbolo({ componente }: { componente: Componente }) {
  return (
    <svg viewBox="-34 -26 68 52" className="miniatura" aria-hidden="true">
      <g className="simbolo">
        <Simbolo componente={componente} />
      </g>
    </svg>
  );
}
