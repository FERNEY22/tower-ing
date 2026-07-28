/* =========================================================================
   solverLineal.ts — Resuelve el circuito y traduce el resultado.

   Fase 2: solo resistencias, potenciometros, fuentes DC e interruptores.
   Los elementos no lineales entran en la fase 3 envolviendo este solver en
   la iteracion de Newton-Raphson: este archivo seguira siendo el que resuelve
   "un" sistema, y newton.ts el que decide cuantas veces hay que hacerlo.

   Convenciones de signo que ve el estudiante
   ------------------------------------------
   resistencia / interruptor : corriente positiva de a hacia b
   potenciometro             : corriente positiva de a hacia b por el cursor
   fuente DC                 : corriente positiva cuando ENTREGA, es decir
                               cuando sale por el borne positivo
   ========================================================================= */

import {
  claveTerminal,
  type Circuito,
  type Componente,
  type Red,
  type TipoComponente,
} from "./circuito";
import { Diagnosticos, hayErrores, type Diagnostico } from "./diagnostico";
import {
  normaMaxima,
  residuoMaximo,
  resolverSistema,
  SistemaSingular,
  type Matriz,
  type Vector,
} from "./matriz";
import { MOTOR } from "@/config";
import {
  construirSistema,
  resistenciaEfectiva,
  tensionDeNodo,
  tramosPotenciometro,
  type Sistema,
} from "./mna";
import { validarTopologia, type Referencia } from "./topologia";

export interface ResultadoComponente {
  id: string;
  tipo: TipoComponente;
  /** Tension entre sus terminales, segun la convencion del tipo. */
  tensionV: number;
  /** Corriente que lo atraviesa, segun la convencion del tipo. */
  corrienteA: number;
  /** Potencia disipada (o entregada, en una fuente). Siempre positiva. */
  potenciaW: number;
}

export interface Solucion {
  ok: boolean;
  /** Tension de cada nodo. La referencia aparece con valor 0. */
  tensiones: Map<string, number>;
  componentes: Map<string, ResultadoComponente>;
  referencia: Referencia | null;
  /** Avisos de topologia y, si los hubo, el error que impidio resolver. */
  diagnosticos: Diagnostico[];
  /** Iteraciones consumidas. Siempre 1 en el solver lineal. */
  iteraciones: number;
}

function solucionFallida(
  diagnosticos: Diagnostico[],
  referencia: Referencia | null = null,
): Solucion {
  return {
    ok: false,
    tensiones: new Map(),
    componentes: new Map(),
    referencia,
    diagnosticos,
    iteraciones: 0,
  };
}

/**
 * Segunda red de seguridad, ademas del umbral de pivote.
 *
 * El umbral tiene que ser muy bajo para no rechazar circuitos que solo se
 * sostienen por gmin, y eso deja pasar algun sistema casi singular. Aqui se
 * comprueba lo unico que importa de verdad: que la solucion sea finita y que
 * cumpla el sistema que se planteo.
 */
function solucionCreible(A: Matriz, x: Vector, b: Vector): boolean {
  if (!x.every(Number.isFinite)) return false;

  const escala = Math.max(1, normaMaxima(A)) * Math.max(1, ...x.map(Math.abs));
  return residuoMaximo(A, x, b) <= escala * MOTOR.toleranciaResiduo;
}

/* ------------------------------------------------------------ resultados */

function tensionEntreTerminales(
  sistema: Sistema,
  x: Vector,
  red: Red,
  compId: string,
  desde: string,
  hasta: string,
): number {
  const a = tensionDeNodo(sistema, x, red.nodoDe.get(claveTerminal(compId, desde))!);
  const b = tensionDeNodo(sistema, x, red.nodoDe.get(claveTerminal(compId, hasta))!);
  return a - b;
}

/** Punto de operacion de un elemento no lineal, que aporta Newton. */
export interface PuntoUnion {
  tensionV: number;
  corrienteA: number;
}

function resultadoDeComponente(
  comp: Componente,
  sistema: Sistema,
  x: Vector,
  red: Red,
  uniones: ReadonlyMap<string, PuntoUnion>,
): ResultadoComponente {
  const base = { id: comp.id, tipo: comp.tipo };

  const union = uniones.get(comp.id);
  if (union) {
    return {
      ...base,
      tensionV: union.tensionV,
      corrienteA: union.corrienteA,
      potenciaW: Math.abs(union.tensionV * union.corrienteA),
    };
  }

  // Un componente quemado o un interruptor abierto no conducen: la tension
  // entre sus extremos es real, la corriente es cero.
  const abierto =
    comp.estado.quemado ||
    (comp.tipo === "interruptor" &&
      !(comp.params as { cerrado: boolean }).cerrado);

  switch (comp.tipo) {
    case "resistencia": {
      const v = tensionEntreTerminales(sistema, x, red, comp.id, "a", "b");
      const r = resistenciaEfectiva((comp.params as { valorOhm: number }).valorOhm);
      const i = abierto ? 0 : v / r;
      return { ...base, tensionV: v, corrienteA: i, potenciaW: Math.abs(v * i) };
    }

    case "potenciometro": {
      const v = tensionEntreTerminales(sistema, x, red, comp.id, "a", "b");
      const { totalOhm, cursor } = comp.params as {
        totalOhm: number;
        cursor: number;
      };
      const tramos = tramosPotenciometro(totalOhm, cursor);
      const vAC = tensionEntreTerminales(sistema, x, red, comp.id, "a", "cursor");
      const i = abierto ? 0 : vAC / tramos.aCursor;
      return { ...base, tensionV: v, corrienteA: i, potenciaW: Math.abs(v * i) };
    }

    case "interruptor": {
      const v = tensionEntreTerminales(sistema, x, red, comp.id, "a", "b");
      const rama = sistema.ramas.find((r) => r.componenteId === comp.id);
      const i = rama ? x[rama.indice]! : 0;
      return { ...base, tensionV: v, corrienteA: i, potenciaW: Math.abs(v * i) };
    }

    case "fuenteDC": {
      const v = tensionEntreTerminales(
        sistema,
        x,
        red,
        comp.id,
        "positivo",
        "negativo",
      );
      const rama = sistema.ramas.find((r) => r.componenteId === comp.id);
      // Aqui se invierte el signo de MNA, una sola vez en todo el motor:
      // la corriente que el estudiante espera ver es la que ENTREGA.
      const i = rama ? -x[rama.indice]! : 0;
      return { ...base, tensionV: v, corrienteA: i, potenciaW: Math.abs(v * i) };
    }

    case "tierra":
      return { ...base, tensionV: 0, corrienteA: 0, potenciaW: 0 };

    default:
      return { ...base, tensionV: 0, corrienteA: 0, potenciaW: 0 };
  }
}

/**
 * Arma la Solucion a partir del vector resuelto. La comparten el solver
 * lineal y el de Newton: la traduccion a tensiones y corrientes es la misma,
 * cambia solo como se llego al punto de operacion.
 */
export function construirSolucion(
  circuito: Circuito,
  red: Red,
  referencia: Referencia,
  sistema: Sistema,
  x: Vector,
  diagnosticos: Diagnostico[],
  iteraciones: number,
  uniones: ReadonlyMap<string, PuntoUnion> = new Map(),
): Solucion {
  const tensiones = new Map<string, number>();
  for (const nodo of red.nodos) {
    tensiones.set(nodo, tensionDeNodo(sistema, x, nodo));
  }

  const componentes = new Map<string, ResultadoComponente>();
  for (const comp of circuito.componentes) {
    componentes.set(
      comp.id,
      resultadoDeComponente(comp, sistema, x, red, uniones),
    );
  }

  return {
    ok: !hayErrores(diagnosticos),
    tensiones,
    componentes,
    referencia,
    diagnosticos,
    iteraciones,
  };
}

/* --------------------------------------------------------------- fachada */

export interface OpcionesSolver {
  gmin?: number;
}

/**
 * Valida la topologia, arma el sistema y lo resuelve.
 * Nunca lanza por culpa del circuito: los fallos salen como diagnosticos.
 */
export function resolverLineal(
  circuito: Circuito,
  opciones: OpcionesSolver = {},
): Solucion {
  const topologia = validarTopologia(circuito);

  if (!topologia.ok || !topologia.referencia) {
    return solucionFallida(topologia.diagnosticos, topologia.referencia);
  }

  const { red, referencia } = topologia;
  const sistema = construirSistema(circuito, red, referencia.nodoId, opciones);

  let x: Vector;
  try {
    x = resolverSistema(sistema.A, sistema.b);
  } catch (e) {
    if (e instanceof SistemaSingular) {
      // El circuito es valido topologicamente pero no tiene solucion unica:
      // normalmente, dos fuentes de tension distintas sobre el mismo par de
      // nodos. Se le cuenta al estudiante, no se le enseña la excepcion.
      return solucionFallida(
        [...topologia.diagnosticos, Diagnosticos.noConverge()],
        referencia,
      );
    }
    throw e; // fallo de programa: que se vea en desarrollo
  }

  if (!solucionCreible(sistema.A, x, sistema.b)) {
    return solucionFallida(
      [...topologia.diagnosticos, Diagnosticos.noConverge()],
      referencia,
    );
  }

  return construirSolucion(
    circuito,
    red,
    referencia,
    sistema,
    x,
    topologia.diagnosticos,
    1,
  );
}

/* ---------------------------------------------------------------- ayudas */

/** Tension de un componente en la solucion. NaN si no esta. */
export function tensionDe(solucion: Solucion, componenteId: string): number {
  return solucion.componentes.get(componenteId)?.tensionV ?? NaN;
}

/** Corriente por un componente en la solucion. NaN si no esta. */
export function corrienteDe(solucion: Solucion, componenteId: string): number {
  return solucion.componentes.get(componenteId)?.corrienteA ?? NaN;
}

/**
 * Diferencia de tension entre dos nodos. Es lo que medira el voltimetro
 * cuando llegue la fase 6.
 */
export function tensionEntreNodos(
  solucion: Solucion,
  nodoA: string,
  nodoB: string,
): number {
  return (solucion.tensiones.get(nodoA) ?? 0) - (solucion.tensiones.get(nodoB) ?? 0);
}
