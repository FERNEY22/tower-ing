/* =========================================================================
   mna.ts — Estampado del sistema de analisis nodal modificado.

       [ G  B ] [ v ]   [ i ]
       [ C  D ] [ j ] = [ e ]

   v son las tensiones de nodo (sin la referencia) y j las corrientes por las
   ramas de tension. Aqui solo se ARMA el sistema; resolverlo es cosa de
   matriz.ts, y decidir que significa el resultado, de solverLineal.ts.

   Signo de j
   ----------
   La fila k impone v(p) − v(m) = V, y la columna k mete +j en la KCL del
   nodo p. Con la KCL escrita como "corriente que SALE del nodo", j resulta
   ser la corriente que sale del nodo p hacia dentro de la fuente. Una fuente
   que alimenta un circuito da por tanto j NEGATIVO.

   Es la convencion estandar de MNA y se respeta tal cual dentro del motor;
   solverLineal.ts la invierte una sola vez, al construir el resultado, para
   que el estudiante vea la corriente entregada en positivo.
   ========================================================================= */

import { MOTOR } from "@/config";
import {
  claveTerminal,
  type Circuito,
  type Componente,
  type Red,
} from "./circuito";
import { ceros, vectorCeros, type Matriz, type Vector } from "./matriz";
import type { ModeloCompanion } from "./modelos";

/** Una rama con corriente propia: fuente DC o interruptor cerrado. */
export interface RamaTension {
  /** Id del componente que la genera. */
  componenteId: string;
  /** Indice dentro del bloque j. */
  indice: number;
  nodoPositivo: string;
  nodoNegativo: string;
  /** Tension impuesta. 0 para un interruptor cerrado. */
  tensionV: number;
}

export interface Sistema {
  A: Matriz;
  b: Vector;
  /** nodoId -> fila/columna. La referencia NO aparece: su tension es 0. */
  indiceNodo: Map<string, number>;
  /** Ramas de tension, en el orden en que ocupan el bloque j. */
  ramas: RamaTension[];
  /** Numero de nodos incognita. */
  nNodos: number;
  dimension: number;
}

export class ElementoNoSoportado extends Error {
  constructor(tipo: string) {
    super(
      `El solver lineal no sabe estampar "${tipo}". Los elementos no lineales ` +
        "entran en la fase 3.",
    );
    this.name = "ElementoNoSoportado";
  }
}

/* ------------------------------------------------------------- utilidades */

/** Resistencia efectiva, con suelo para no generar conductancias infinitas. */
export function resistenciaEfectiva(ohm: number): number {
  if (!Number.isFinite(ohm) || ohm <= 0) return MOTOR.resistenciaMinimaOhm;
  return Math.max(ohm, MOTOR.resistenciaMinimaOhm);
}

/** Los dos tramos de un potenciometro, segun la posicion del cursor. */
export function tramosPotenciometro(
  totalOhm: number,
  cursor: number,
): { aCursor: number; cursorB: number } {
  const k = Math.min(1, Math.max(0, cursor));
  const total = Math.max(totalOhm, 2 * MOTOR.resistenciaMinimaOhm);
  return {
    aCursor: resistenciaEfectiva(total * k),
    cursorB: resistenciaEfectiva(total * (1 - k)),
  };
}

/* ------------------------------------------------------------- estampado */

/**
 * Conductancia entre dos nodos. Un indice de -1 significa "referencia", y
 * sus filas y columnas simplemente no se escriben: su tension es 0 por
 * definicion y no es incognita.
 */
function estamparConductancia(A: Matriz, i: number, j: number, g: number): void {
  if (i >= 0) A[i]![i] = A[i]![i]! + g;
  if (j >= 0) A[j]![j] = A[j]![j]! + g;
  if (i >= 0 && j >= 0) {
    A[i]![j] = A[i]![j]! - g;
    A[j]![i] = A[j]![i]! - g;
  }
}

/** Rama de tension: bloques B, C y el termino independiente e. */
function estamparRamaTension(
  A: Matriz,
  b: Vector,
  fila: number,
  p: number,
  m: number,
  tensionV: number,
): void {
  if (p >= 0) {
    A[p]![fila] = A[p]![fila]! + 1;
    A[fila]![p] = A[fila]![p]! + 1;
  }
  if (m >= 0) {
    A[m]![fila] = A[m]![fila]! - 1;
    A[fila]![m] = A[fila]![m]! - 1;
  }
  b[fila] = b[fila]! + tensionV;
}

/* --------------------------------------------------------------- fachada */

/** Terminales que tienen al menos un cable. */
export function terminalesCableados(circuito: Circuito): Set<string> {
  const s = new Set<string>();
  for (const c of circuito.cables) {
    s.add(claveTerminal(c.desde.componenteId, c.desde.terminal));
    s.add(claveTerminal(c.hasta.componenteId, c.hasta.terminal));
  }
  return s;
}

/**
 * True si el componente participa en el sistema lineal.
 *
 * Un componente sin ningun cable no se estampa: esta en el lienzo pero no es
 * circuito todavia. Sin esta comprobacion, un LED dejado a un lado del
 * dibujo tumbaria la simulacion entera.
 */
export function conduce(comp: Componente, cableados: Set<string>): boolean {
  const conectado = comp.terminales.some((t) =>
    cableados.has(claveTerminal(comp.id, t.nombre)),
  );
  if (!conectado) return false;

  if (comp.estado.quemado) return false; // quemado = circuito abierto
  if (comp.tipo === "tierra") return false; // es la referencia, no un elemento
  if (comp.tipo === "interruptor") {
    return (comp.params as { cerrado: boolean }).cerrado;
  }
  return true;
}

/** Ramas de tension del circuito, en orden estable. */
function recogerRamas(
  componentes: Componente[],
  red: Red,
  nNodos: number,
  cableados: Set<string>,
): RamaTension[] {
  const ramas: RamaTension[] = [];

  for (const comp of componentes) {
    if (!conduce(comp, cableados)) continue;

    if (comp.tipo === "fuenteDC") {
      ramas.push({
        componenteId: comp.id,
        indice: nNodos + ramas.length,
        nodoPositivo: red.nodoDe.get(claveTerminal(comp.id, "positivo"))!,
        nodoNegativo: red.nodoDe.get(claveTerminal(comp.id, "negativo"))!,
        tensionV: (comp.params as { tensionV: number }).tensionV,
      });
    } else if (comp.tipo === "interruptor") {
      // Un interruptor cerrado es un cortocircuito ideal, no una resistencia
      // pequeña: modelarlo como fuente de 0 V es exacto y no ensucia la
      // matriz con conductancias enormes.
      ramas.push({
        componenteId: comp.id,
        indice: nNodos + ramas.length,
        nodoPositivo: red.nodoDe.get(claveTerminal(comp.id, "a"))!,
        nodoNegativo: red.nodoDe.get(claveTerminal(comp.id, "b"))!,
        tensionV: 0,
      });
    }
  }

  return ramas;
}

export interface OpcionesEstampado {
  /** Conductancia de fuga de cada nodo a referencia. */
  gmin?: number;
  /**
   * Modelo compañero de cada elemento no lineal, linealizado en su punto de
   * operacion actual. Lo aporta Newton en cada iteracion. Sin el, un diodo
   * conectado no se puede estampar y se lanza ElementoNoSoportado.
   */
  companions?: ReadonlyMap<string, ModeloCompanion>;
}

export function construirSistema(
  circuito: Circuito,
  red: Red,
  nodoReferencia: string,
  opciones: OpcionesEstampado = {},
): Sistema {
  const gmin = opciones.gmin ?? MOTOR.gmin;

  // --- numeracion de incognitas: todos los nodos menos la referencia
  const indiceNodo = new Map<string, number>();
  for (const nodo of red.nodos) {
    if (nodo === nodoReferencia) continue;
    indiceNodo.set(nodo, indiceNodo.size);
  }
  const nNodos = indiceNodo.size;

  const cableados = terminalesCableados(circuito);
  const ramas = recogerRamas(circuito.componentes, red, nNodos, cableados);
  const dimension = nNodos + ramas.length;

  const A = ceros(dimension, dimension);
  const b = vectorCeros(dimension);

  const idx = (nodo: string): number => indiceNodo.get(nodo) ?? -1;
  const idxTerminal = (compId: string, terminal: string): number =>
    idx(red.nodoDe.get(claveTerminal(compId, terminal))!);

  // --- gmin: evita que un nodo sin camino a referencia deje la matriz singular
  for (let i = 0; i < nNodos; i++) {
    A[i]![i] = A[i]![i]! + gmin;
  }

  // --- elementos
  for (const comp of circuito.componentes) {
    if (!conduce(comp, cableados)) continue;

    switch (comp.tipo) {
      case "resistencia": {
        const { valorOhm } = comp.params as { valorOhm: number };
        const g = 1 / resistenciaEfectiva(valorOhm);
        estamparConductancia(
          A,
          idxTerminal(comp.id, "a"),
          idxTerminal(comp.id, "b"),
          g,
        );
        break;
      }

      case "potenciometro": {
        const { totalOhm, cursor } = comp.params as {
          totalOhm: number;
          cursor: number;
        };
        const tramos = tramosPotenciometro(totalOhm, cursor);
        estamparConductancia(
          A,
          idxTerminal(comp.id, "a"),
          idxTerminal(comp.id, "cursor"),
          1 / tramos.aCursor,
        );
        estamparConductancia(
          A,
          idxTerminal(comp.id, "cursor"),
          idxTerminal(comp.id, "b"),
          1 / tramos.cursorB,
        );
        break;
      }

      case "fuenteDC":
      case "interruptor":
        // Ya recogidos como ramas de tension, se estampan mas abajo.
        break;

      case "diodo":
      case "led":
      case "zener": {
        const companion = opciones.companions?.get(comp.id);
        if (!companion) throw new ElementoNoSoportado(comp.tipo);

        const anodo = idxTerminal(comp.id, "anodo");
        const catodo = idxTerminal(comp.id, "catodo");

        estamparConductancia(A, anodo, catodo, companion.Geq);
        // La fuente de corriente equivalente pasa al termino independiente.
        if (anodo >= 0) b[anodo] = b[anodo]! - companion.Ieq;
        if (catodo >= 0) b[catodo] = b[catodo]! + companion.Ieq;
        break;
      }

      case "tierra":
        break;
    }
  }

  // --- ramas de tension
  for (const rama of ramas) {
    estamparRamaTension(
      A,
      b,
      rama.indice,
      idx(rama.nodoPositivo),
      idx(rama.nodoNegativo),
      rama.tensionV,
    );
  }

  return { A, b, indiceNodo, ramas, nNodos, dimension };
}

/** Tension de un nodo a partir del vector solucion. La referencia vale 0. */
export function tensionDeNodo(
  sistema: Sistema,
  x: Vector,
  nodo: string,
): number {
  const i = sistema.indiceNodo.get(nodo);
  return i === undefined ? 0 : x[i]!;
}
