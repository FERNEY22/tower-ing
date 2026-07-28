/* =========================================================================
   quemado.ts — Que se rompe, por que, y que pasa despues.

   Despues de cada solucion convergida se comprueba la potencia y la
   corriente de cada componente. Al excederse, el componente se marca como
   quemado —pasa a ser un circuito abierto— y el circuito SE VUELVE A
   RESOLVER, porque al abrirse una rama cambia todo lo demas.

   Eso puede encadenar: al abrirse una rama, otra recibe mas corriente y
   tambien se quema. Es lo que pasa en una mesa de laboratorio y es lo que
   hace el bucle de aqui abajo.

   Un componente quemado sigue quemado hasta que el estudiante lo reemplace.
   ========================================================================= */

import { LIMITES } from "@/config";
import {
  conArticulo,
  capitalizar,
  type Circuito,
  type Componente,
  type TipoComponente,
} from "./circuito";
import { resolver, type OpcionesResolver } from "./index";
import type { Solucion } from "./solverLineal";
import { formatearAmperios, formatearVatios, formatearVoltios } from "./valores";

export type MotivoQuemado =
  | "potencia"
  | "corriente-directa"
  | "tension-inversa";

export interface Quemadura {
  componenteId: string;
  tipo: TipoComponente;
  motivo: MotivoQuemado;
  /** Valor que se excedio. */
  magnitud: number;
  /** Limite que se supero. */
  limite: number;
  unidad: "W" | "A" | "V";
  /** Explicacion para el estudiante. */
  mensaje: string;
}

/** Tope de rondas de quemado en cascada. Nunca deberia hacer falta tantas. */
const MAX_RONDAS = 12;

/* --------------------------------------------------------- comprobaciones */

function porPotencia(
  comp: Componente,
  potenciaW: number,
  limiteW: number,
): Quemadura | null {
  if (potenciaW <= limiteW) return null;
  return {
    componenteId: comp.id,
    tipo: comp.tipo,
    motivo: "potencia",
    magnitud: potenciaW,
    limite: limiteW,
    unidad: "W",
    mensaje:
      `${capitalizar(conArticulo(comp.tipo))} ${comp.id} está disipando ` +
      `${formatearVatios(potenciaW)} y solo aguanta ${formatearVatios(limiteW)}. ` +
      "Se quemó. Pon una de más potencia o reduce la corriente.",
  };
}

function porCorriente(
  comp: Componente,
  corrienteA: number,
  limiteA: number,
): Quemadura | null {
  if (corrienteA <= limiteA) return null;
  return {
    componenteId: comp.id,
    tipo: comp.tipo,
    motivo: "corriente-directa",
    magnitud: corrienteA,
    limite: limiteA,
    unidad: "A",
    mensaje:
      `Por ${conArticulo(comp.tipo)} ${comp.id} pasaron ` +
      `${formatearAmperios(corrienteA)}, muy por encima de los ` +
      `${formatearAmperios(limiteA)} que soporta. Se quemó: te faltó la ` +
      "resistencia limitadora.",
  };
}

function porTensionInversa(
  comp: Componente,
  tensionV: number,
  limiteV: number,
): Quemadura | null {
  if (tensionV <= limiteV) return null;
  return {
    componenteId: comp.id,
    tipo: comp.tipo,
    motivo: "tension-inversa",
    magnitud: tensionV,
    limite: limiteV,
    unidad: "V",
    mensaje:
      `${capitalizar(conArticulo(comp.tipo))} ${comp.id} recibió ` +
      `${formatearVoltios(tensionV)} en inversa y solo aguanta ` +
      `${formatearVoltios(limiteV)}. Se quemó. Revisa la polaridad.`,
  };
}

/**
 * Componentes que se pasan de sus limites en esta solucion.
 * No modifica nada: solo dictamina.
 */
export function evaluarQuemado(
  circuito: Circuito,
  solucion: Solucion,
): Quemadura[] {
  if (!solucion.ok) return [];

  const quemaduras: Quemadura[] = [];

  for (const comp of circuito.componentes) {
    if (comp.estado.quemado) continue; // ya estaba: no se quema dos veces

    const r = solucion.componentes.get(comp.id);
    if (!r) continue;

    const corriente = Math.abs(r.corrienteA);
    const potencia = r.potenciaW;
    let quemadura: Quemadura | null = null;

    switch (comp.tipo) {
      case "resistencia": {
        const { potenciaW } = comp.params as { potenciaW: number };
        quemadura = porPotencia(
          comp,
          potencia,
          potenciaW || LIMITES.resistenciaPotenciaWDefecto,
        );
        break;
      }

      case "led": {
        quemadura = porCorriente(comp, corriente, LIMITES.ledCorrienteMaxA);
        // Un LED tambien se rompe por tension inversa, y es un error que se
        // comete montandolo al reves en un circuito de tension alta.
        if (!quemadura && r.tensionV < 0) {
          quemadura = porTensionInversa(
            comp,
            Math.abs(r.tensionV),
            LIMITES.ledTensionInversaMaxV,
          );
        }
        break;
      }

      case "diodo":
        quemadura = porCorriente(comp, corriente, LIMITES.diodoCorrienteMaxA);
        break;

      case "zener": {
        const { potenciaW } = comp.params as { potenciaW: number };
        quemadura = porPotencia(
          comp,
          potencia,
          potenciaW || LIMITES.zenerPotenciaWDefecto,
        );
        break;
      }

      default:
        break;
    }

    if (quemadura) quemaduras.push(quemadura);
  }

  return quemaduras;
}

/** Devuelve un circuito nuevo con esos componentes marcados como quemados. */
export function marcarQuemados(
  circuito: Circuito,
  quemaduras: Quemadura[],
): Circuito {
  if (!quemaduras.length) return circuito;
  const porId = new Map(quemaduras.map((q) => [q.componenteId, q]));

  return {
    ...circuito,
    componentes: circuito.componentes.map((comp) => {
      const q = porId.get(comp.id);
      if (!q) return comp;
      return {
        ...comp,
        estado: { quemado: true, motivoQuemado: q.mensaje },
      };
    }),
  };
}

/** Deshace el quemado de un componente: el estudiante lo reemplaza. */
export function reemplazarComponente(
  circuito: Circuito,
  componenteId: string,
): Circuito {
  return {
    ...circuito,
    componentes: circuito.componentes.map((comp) =>
      comp.id === componenteId ? { ...comp, estado: { quemado: false } } : comp,
    ),
  };
}

/* --------------------------------------------------------------- fachada */

export interface ResultadoConQuemado {
  /** El circuito, con los componentes que se hayan quemado ya marcados. */
  circuito: Circuito;
  solucion: Solucion;
  /** Lo que se ha quemado en ESTA llamada. Vacio si no se quemo nada. */
  quemaduras: Quemadura[];
}

/**
 * Resuelve y aplica el modelo de quemado hasta que la cosa se estabiliza.
 *
 * Es la funcion que usa el lienzo: no basta con resolver, porque si algo se
 * quema el resultado que hay que mostrar es el DE DESPUES de que se abriera
 * esa rama.
 */
export function resolverConQuemado(
  circuito: Circuito,
  opciones: OpcionesResolver = {},
): ResultadoConQuemado {
  let actual = circuito;
  let solucion = resolver(actual, opciones);
  const quemaduras: Quemadura[] = [];

  for (let ronda = 0; ronda < MAX_RONDAS; ronda++) {
    if (!solucion.ok) break;

    const nuevas = evaluarQuemado(actual, solucion);
    if (!nuevas.length) break;

    quemaduras.push(...nuevas);
    actual = marcarQuemados(actual, nuevas);
    solucion = resolver(actual, opciones);
  }

  return { circuito: actual, solucion, quemaduras };
}
