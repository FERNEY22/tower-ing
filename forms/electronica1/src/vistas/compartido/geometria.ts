/* =========================================================================
   geometria.ts — Donde esta cada cosa en el lienzo.

   Este archivo lo comparten las dos vistas. La vista fisica y la esquematica
   dibujan simbolos distintos, pero un componente esta en el mismo sitio y sus
   terminales caen en el mismo punto en las dos. Por eso alternar entre ellas
   no descoloca nada: la posicion no es de la vista, es del modelo.

   Coordenadas locales: origen en el centro del componente, x a la derecha,
   y hacia abajo (como el SVG). La rotacion es en grados, en sentido horario.
   ========================================================================= */

import type {
  Circuito,
  Componente,
  Polaridad,
  Punto,
  TipoComponente,
} from "@/motor/circuito";
import { claveTerminal } from "@/motor/circuito";

/** Paso de la rejilla, en unidades del lienzo. */
export const PASO_REJILLA = 10;

/** Radio de captura de un terminal al hacer clic. */
export const RADIO_TERMINAL = 9;

export interface Huella {
  /** Semiejes de la caja del cuerpo, para dibujar y para el hit test. */
  ancho: number;
  alto: number;
  /** Posicion local de cada terminal. */
  terminales: Record<string, Punto>;
}

/**
 * Todos los componentes de dos terminales miden lo mismo y tienen los
 * terminales a ±30. Asi cualquier pareja encaja en la rejilla sin pelearse.
 */
export const HUELLAS: Record<TipoComponente, Huella> = {
  resistencia: {
    ancho: 24,
    alto: 10,
    terminales: { a: { x: -30, y: 0 }, b: { x: 30, y: 0 } },
  },
  potenciometro: {
    ancho: 24,
    alto: 10,
    terminales: {
      a: { x: -30, y: 0 },
      b: { x: 30, y: 0 },
      cursor: { x: 0, y: -30 },
    },
  },
  fuenteDC: {
    ancho: 14,
    alto: 20,
    terminales: { positivo: { x: -30, y: 0 }, negativo: { x: 30, y: 0 } },
  },
  interruptor: {
    ancho: 20,
    alto: 14,
    terminales: { a: { x: -30, y: 0 }, b: { x: 30, y: 0 } },
  },
  diodo: {
    ancho: 12,
    alto: 12,
    terminales: { anodo: { x: -30, y: 0 }, catodo: { x: 30, y: 0 } },
  },
  led: {
    ancho: 12,
    alto: 12,
    terminales: { anodo: { x: -30, y: 0 }, catodo: { x: 30, y: 0 } },
  },
  zener: {
    ancho: 12,
    alto: 12,
    terminales: { anodo: { x: -30, y: 0 }, catodo: { x: 30, y: 0 } },
  },
  tierra: {
    ancho: 12,
    alto: 10,
    terminales: { ref: { x: 0, y: -20 } },
  },
};

/* ----------------------------------------------------------- rotaciones */

/** Rotacion horaria en pantalla (y hacia abajo). */
export function rotarPunto(p: Punto, grados: number): Punto {
  const rad = (grados * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sen = Math.sin(rad);
  // Se redondea el ruido de coma flotante: con 90° exactos no queremos
  // terminales en x = 6,1e-17, que romperian las comparaciones de igualdad.
  return {
    x: redondear(p.x * cos - p.y * sen),
    y: redondear(p.x * sen + p.y * cos),
  };
}

function redondear(v: number): number {
  return Math.abs(v) < 1e-9 ? 0 : Number(v.toFixed(6));
}

/** Normaliza a 0, 90, 180 o 270. */
export function normalizarRotacion(grados: number): number {
  const r = Math.round(grados / 90) * 90;
  return ((r % 360) + 360) % 360;
}

/* ------------------------------------------------------------- anclajes */

export interface Anclaje {
  componenteId: string;
  terminal: string;
  clave: string;
  polaridad: Polaridad;
  punto: Punto;
}

/** Posicion absoluta de cada terminal del componente. */
export function anclajesDe(comp: Componente): Anclaje[] {
  const huella = HUELLAS[comp.tipo];

  return comp.terminales.map((t) => {
    const local = huella.terminales[t.nombre] ?? { x: 0, y: 0 };
    const rotado = rotarPunto(local, comp.rotacion);
    return {
      componenteId: comp.id,
      terminal: t.nombre,
      clave: claveTerminal(comp.id, t.nombre),
      polaridad: t.polaridad,
      punto: { x: comp.posicion.x + rotado.x, y: comp.posicion.y + rotado.y },
    };
  });
}

/** Todos los anclajes del circuito. */
export function todosLosAnclajes(circuito: Circuito): Anclaje[] {
  return circuito.componentes.flatMap(anclajesDe);
}

/** Punto absoluto de un terminal concreto, o null si no existe. */
export function puntoDeTerminal(
  circuito: Circuito,
  componenteId: string,
  terminal: string,
): Punto | null {
  const comp = circuito.componentes.find((c) => c.id === componenteId);
  if (!comp) return null;
  const anclaje = anclajesDe(comp).find((a) => a.terminal === terminal);
  return anclaje ? anclaje.punto : null;
}

/** Igual que el anterior, a partir de la clave "r1:a". */
export function puntoDeClave(circuito: Circuito, clave: string): Punto | null {
  const corte = clave.indexOf(":");
  if (corte < 0) return null;
  return puntoDeTerminal(circuito, clave.slice(0, corte), clave.slice(corte + 1));
}

/* ------------------------------------------------------------ hit tests */

export function distancia(a: Punto, b: Punto): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Terminal mas cercano al punto, dentro del radio de captura. */
export function terminalCercano(
  circuito: Circuito,
  punto: Punto,
  radio = RADIO_TERMINAL,
): Anclaje | null {
  let mejor: Anclaje | null = null;
  let mejorDistancia = radio;

  for (const anclaje of todosLosAnclajes(circuito)) {
    const d = distancia(anclaje.punto, punto);
    if (d <= mejorDistancia) {
      mejorDistancia = d;
      mejor = anclaje;
    }
  }
  return mejor;
}

/**
 * Componente cuyo cuerpo contiene el punto. Se busca del ultimo al primero
 * para que gane el que esta dibujado encima.
 */
export function componenteEn(
  circuito: Circuito,
  punto: Punto,
): Componente | null {
  for (let i = circuito.componentes.length - 1; i >= 0; i--) {
    const comp = circuito.componentes[i]!;
    if (contieneAlPunto(comp, punto)) return comp;
  }
  return null;
}

/** True si el punto cae dentro de la caja del componente, ya rotada. */
export function contieneAlPunto(comp: Componente, punto: Punto): boolean {
  const huella = HUELLAS[comp.tipo];
  // Se lleva el punto al sistema local deshaciendo la rotacion.
  const relativo = {
    x: punto.x - comp.posicion.x,
    y: punto.y - comp.posicion.y,
  };
  const local = rotarPunto(relativo, -comp.rotacion);
  return (
    Math.abs(local.x) <= huella.ancho && Math.abs(local.y) <= huella.alto
  );
}

/* ------------------------------------------------------------- rejilla */

export function ajustarAGrid(p: Punto, paso = PASO_REJILLA): Punto {
  return {
    x: Math.round(p.x / paso) * paso,
    y: Math.round(p.y / paso) * paso,
  };
}

/** Caja que envuelve todo el circuito, con margen. Sirve para exportar. */
export function cajaDelCircuito(
  circuito: Circuito,
  margen = 40,
): { x: number; y: number; ancho: number; alto: number } {
  const puntos = todosLosAnclajes(circuito).map((a) => a.punto);
  for (const c of circuito.componentes) puntos.push(c.posicion);

  if (!puntos.length) return { x: 0, y: 0, ancho: 200, alto: 200 };

  const xs = puntos.map((p) => p.x);
  const ys = puntos.map((p) => p.y);
  const minX = Math.min(...xs) - margen;
  const minY = Math.min(...ys) - margen;

  return {
    x: minX,
    y: minY,
    ancho: Math.max(...xs) + margen - minX,
    alto: Math.max(...ys) + margen - minY,
  };
}
