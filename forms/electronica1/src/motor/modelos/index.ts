/* =========================================================================
   modelos/index.ts — Despacho de los elementos no lineales.

   Newton no necesita saber si esta iterando un LED azul o un zener: solo
   necesita, para cada dispositivo, como evaluarlo y como limitar su paso.
   ========================================================================= */

import type { ColorLed, Componente, TipoComponente } from "../circuito";
import { evaluarDiodo, limitarDiodo } from "./diodo";
import { evaluarLed, limitarLed } from "./led";
import { evaluarZener, limitarZener } from "./zener";
import type { Evaluacion } from "./union";

export type { Evaluacion, ModeloCompanion } from "./union";
export { companionDe, evaluarUnion, limitarUnion, tensionCritica } from "./union";
export { brilloDeLed } from "./led";

const TIPOS_NO_LINEALES: ReadonlySet<TipoComponente> = new Set([
  "diodo",
  "led",
  "zener",
] as const);

export function esNoLineal(tipo: TipoComponente): boolean {
  return TIPOS_NO_LINEALES.has(tipo);
}

export interface DispositivoNoLineal {
  id: string;
  tipo: TipoComponente;
  /** Corriente y conductancia incremental en el punto v. */
  evaluar(v: number): Evaluacion;
  /** Paso de Newton amortiguado. */
  limitar(vNuevo: number, vViejo: number): number;
}

/** Devuelve el dispositivo, o null si el componente no es no lineal. */
export function dispositivoDe(comp: Componente): DispositivoNoLineal | null {
  switch (comp.tipo) {
    case "diodo":
      return {
        id: comp.id,
        tipo: comp.tipo,
        evaluar: evaluarDiodo,
        limitar: limitarDiodo,
      };

    case "led": {
      const { color } = comp.params as { color: ColorLed };
      return {
        id: comp.id,
        tipo: comp.tipo,
        evaluar: (v) => evaluarLed(v, color),
        limitar: (vn, vv) => limitarLed(vn, vv, color),
      };
    }

    case "zener": {
      const { tensionRupturaV } = comp.params as { tensionRupturaV: number };
      return {
        id: comp.id,
        tipo: comp.tipo,
        evaluar: (v) => evaluarZener(v, tensionRupturaV),
        limitar: (vn, vv) => limitarZener(vn, vv, tensionRupturaV),
      };
    }

    default:
      return null;
  }
}
