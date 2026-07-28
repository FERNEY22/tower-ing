/* =========================================================================
   ayudas.ts — Utilidades que comparten las verificaciones de las lecciones.

   Verificar una reparacion es casi siempre lo mismo: mirar que el componente
   siga ahi, que no este quemado, y que una magnitud caiga en un rango. Lo
   que cambia es el mensaje, y ese es el que enseña.
   ========================================================================= */

import type { Circuito, Componente } from "@/motor/circuito";
import { resolver } from "@/motor";
import type { Solucion } from "@/motor/solverLineal";
import type { Verificacion } from "../tipos";

export function componente(circuito: Circuito, id: string): Componente | undefined {
  return circuito.componentes.find((c) => c.id === id);
}

/** Corriente por un componente, 0 si no esta en la solucion. */
export function corriente(solucion: Solucion | null, id: string): number {
  return solucion?.componentes.get(id)?.corrienteA ?? 0;
}

/** Tension de un componente, 0 si no esta en la solucion. */
export function tension(solucion: Solucion | null, id: string): number {
  return solucion?.componentes.get(id)?.tensionV ?? 0;
}

/**
 * Comprobaciones previas comunes a todas las lecciones: que el componente
 * clave siga en el lienzo, no este quemado y el circuito se resuelva.
 * Devuelve null si todo esta en orden.
 */
export function problemasBasicos(
  circuito: Circuito,
  solucion: Solucion | null,
  imprescindibles: { id: string; nombre: string }[],
): Verificacion | null {
  for (const { id, nombre } of imprescindibles) {
    const c = componente(circuito, id);
    if (!c) {
      return {
        ok: false,
        mensaje:
          `Falta ${nombre} (${id}). La reparación no consiste en quitar el ` +
          "componente que te estorba.",
      };
    }
    if (c.estado.quemado) {
      return {
        ok: false,
        mensaje:
          `${nombre} (${id}) está quemado. Arregla primero la causa y luego ` +
          "reemplázalo: si lo cambias con el circuito todavía mal, se vuelve " +
          "a quemar al instante.",
      };
    }
  }

  if (!solucion?.ok) {
    return {
      ok: false,
      mensaje:
        "El circuito todavía no se puede resolver. Revisa los avisos de " +
        "montaje que hay bajo el lienzo antes de verificar.",
    };
  }

  return null;
}

/**
 * Resuelve una variante del circuito con algunos parametros cambiados, sin
 * tocar el original. Sirve para comprobar que una reparacion aguanta en
 * condiciones distintas de las que el estudiante tiene delante.
 */
export function resolverVariante(
  circuito: Circuito,
  cambios: Record<string, Record<string, unknown>>,
): Solucion {
  const variante: Circuito = {
    ...circuito,
    componentes: circuito.componentes.map((c) =>
      cambios[c.id] ? ({ ...c, params: { ...c.params, ...cambios[c.id] } } as Componente) : c,
    ),
  };
  return resolver(variante);
}

/** True si el interruptor existe y esta cerrado. */
export function interruptorCerrado(circuito: Circuito, id: string): boolean {
  const s = componente(circuito, id);
  if (!s || s.tipo !== "interruptor") return false;
  return (s.params as { cerrado: boolean }).cerrado;
}
