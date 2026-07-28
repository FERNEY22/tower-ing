/* =========================================================================
   diodo.ts — Diodo de señal. Union PN simple, calibrada a 0,7 V.
   ========================================================================= */

import { DIODO_SILICIO } from "../parametros";
import {
  evaluarUnion,
  limitarUnion,
  tensionCritica,
  type Evaluacion,
} from "./union";

const VCRIT = tensionCritica(DIODO_SILICIO.Is, DIODO_SILICIO.n);

export function evaluarDiodo(v: number): Evaluacion {
  return evaluarUnion(v, DIODO_SILICIO.Is, DIODO_SILICIO.n);
}

export function limitarDiodo(vNuevo: number, vViejo: number): number {
  return limitarUnion(vNuevo, vViejo, DIODO_SILICIO.n, VCRIT);
}

export const TENSION_CRITICA_DIODO = VCRIT;
