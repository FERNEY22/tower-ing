/* =========================================================================
   union.ts — Matematica de la union PN. La comparten diodo, LED y zener.

   Aqui esta todo lo que evita que Newton-Raphson explote con exponenciales.
   Es la parte donde fallan las implementaciones ingenuas de MNA.
   ========================================================================= */

import { MOTOR } from "@/config";

export interface Evaluacion {
  /** Corriente por la union, de anodo a catodo. */
  i: number;
  /** Conductancia incremental dI/dV en ese punto. */
  g: number;
}

export interface ModeloCompanion {
  /** Conductancia equivalente, entre anodo y catodo. */
  Geq: number;
  /** Fuente de corriente equivalente, en paralelo. */
  Ieq: number;
}

/**
 * Shockley con extension lineal por encima del exponente maximo.
 *
 * Saturar la exponencial es obligatorio (se desborda a la primera), pero
 * DEJAR LA CORRIENTE PLANA seria un error: la conductancia seguiria siendo
 * enorme mientras la corriente ya no cambia, y el criterio de convergencia
 * por corriente no se cumpliria nunca. Por encima del limite se continua la
 * curva por su tangente, que es coherente y monotona.
 */
export function evaluarUnion(v: number, Is: number, n: number): Evaluacion {
  const nVt = n * MOTOR.Vt;
  const arg = v / nVt;

  if (arg <= MOTOR.expArgMax) {
    const e = Math.exp(arg);
    return { i: Is * (e - 1), g: (Is / nVt) * e };
  }

  const e = Math.exp(MOTOR.expArgMax);
  const g = (Is / nVt) * e;
  const vLimite = MOTOR.expArgMax * nVt;
  return { i: Is * (e - 1) + g * (v - vLimite), g };
}

/** Modelo compañero linealizado en el punto de operacion v. */
export function companionDe(evaluacion: Evaluacion, v: number): ModeloCompanion {
  return { Geq: evaluacion.g, Ieq: evaluacion.i - evaluacion.g * v };
}

/**
 * Tension critica: por encima de ella el paso completo de Newton se pasa de
 * largo y hay que amortiguar. Es el umbral del algoritmo estandar de
 * limitacion de union PN.
 */
export function tensionCritica(Is: number, n: number): number {
  const nVt = n * MOTOR.Vt;
  return nVt * Math.log(nVt / (Math.SQRT2 * Is));
}

/**
 * Limitacion del paso de tension (pnjlim).
 *
 * Sin esto, un salto de 0 V a 5 V en la primera iteracion mete un exponente
 * de 193 en la exponencial y el metodo no vuelve. Por encima de la tension
 * critica se avanza de forma logaritmica en lugar de dar el paso entero.
 */
export function limitarUnion(
  vNuevo: number,
  vViejo: number,
  n: number,
  vcrit: number,
): number {
  const nVt = n * MOTOR.Vt;

  if (vNuevo > vcrit && Math.abs(vNuevo - vViejo) > 2 * nVt) {
    if (vViejo > 0) {
      const arg = 1 + (vNuevo - vViejo) / nVt;
      return arg > 0 ? vViejo + nVt * Math.log(arg) : vcrit;
    }
    // Se venia de polarizacion inversa o de cero: se entra por abajo.
    return nVt * Math.log(vNuevo / nVt);
  }

  return vNuevo;
}
