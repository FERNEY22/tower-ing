/* =========================================================================
   led.ts — LED. Una union PN por color, con su propia caida directa.

   El color no es decoracion: cambia Is y n, y por tanto la tension a la que
   enciende. Es justo lo que la leccion 2 le pide calcular al estudiante.
   ========================================================================= */

import { LED_POR_COLOR } from "../parametros";
import type { ColorLed } from "../circuito";
import {
  evaluarUnion,
  limitarUnion,
  tensionCritica,
  type Evaluacion,
} from "./union";

const VCRIT_POR_COLOR: Record<ColorLed, number> = {
  rojo: tensionCritica(LED_POR_COLOR.rojo.Is, LED_POR_COLOR.rojo.n),
  verde: tensionCritica(LED_POR_COLOR.verde.Is, LED_POR_COLOR.verde.n),
  azul: tensionCritica(LED_POR_COLOR.azul.Is, LED_POR_COLOR.azul.n),
  blanco: tensionCritica(LED_POR_COLOR.blanco.Is, LED_POR_COLOR.blanco.n),
};

export function evaluarLed(v: number, color: ColorLed): Evaluacion {
  const p = LED_POR_COLOR[color];
  return evaluarUnion(v, p.Is, p.n);
}

export function limitarLed(
  vNuevo: number,
  vViejo: number,
  color: ColorLed,
): number {
  return limitarUnion(vNuevo, vViejo, LED_POR_COLOR[color].n, VCRIT_POR_COLOR[color]);
}

/**
 * Brillo relativo (0..1) para la vista fisica. Se satura en la corriente
 * nominal: por encima el LED no brilla mas, se quema.
 */
export function brilloDeLed(corrienteA: number, corrienteNominalA = 0.02): number {
  if (!(corrienteA > 0)) return 0;
  return Math.min(1, corrienteA / corrienteNominalA);
}
