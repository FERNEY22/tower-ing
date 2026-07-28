/* =========================================================================
   zener.ts — Zener: rama directa mas rama de ruptura inversa.

       I = Is·(exp(V/(n·Vt)) − 1) − Isbv·(exp(−(V + Vz)/(nz·Vt)) − 1)

   La derivada de la segunda rama respecto de V lleva dos signos menos que se
   cancelan, asi que las dos conductancias SUMAN. Si restaran, el modelo no
   seria monotono y Newton no convergeria nunca.
   ========================================================================= */

import {
  ZENER_DIRECTO,
  ZENER_RUPTURA,
  tensionRupturaInterna,
} from "../parametros";
import {
  evaluarUnion,
  limitarUnion,
  tensionCritica,
  type Evaluacion,
} from "./union";

const VCRIT_DIRECTO = tensionCritica(ZENER_DIRECTO.Is, ZENER_DIRECTO.n);
const VCRIT_RUPTURA = tensionCritica(ZENER_RUPTURA.Isbv, ZENER_RUPTURA.nz);

export function evaluarZener(v: number, vzNominalV: number): Evaluacion {
  const vzInterna = tensionRupturaInterna(vzNominalV);

  const directa = evaluarUnion(v, ZENER_DIRECTO.Is, ZENER_DIRECTO.n);
  // La rama de ruptura se evalua en u = −(V + Vz).
  const ruptura = evaluarUnion(
    -(v + vzInterna),
    ZENER_RUPTURA.Isbv,
    ZENER_RUPTURA.nz,
  );

  return {
    i: directa.i - ruptura.i,
    // d(−I_ruptura)/dV = −g_ruptura · d(−(V+Vz))/dV = +g_ruptura
    g: directa.g + ruptura.g,
  };
}

/**
 * Limitacion de paso en las dos zonas. Un zener trabaja en inversa, asi que
 * limitar solo la rama directa dejaria sin proteccion justo el modo de
 * funcionamiento de la leccion 5.
 */
export function limitarZener(
  vNuevo: number,
  vViejo: number,
  vzNominalV: number,
): number {
  const vzInterna = tensionRupturaInterna(vzNominalV);

  const enDirecta = limitarUnion(vNuevo, vViejo, ZENER_DIRECTO.n, VCRIT_DIRECTO);

  const uNuevo = -(enDirecta + vzInterna);
  const uViejo = -(vViejo + vzInterna);
  const uLimitado = limitarUnion(
    uNuevo,
    uViejo,
    ZENER_RUPTURA.nz,
    VCRIT_RUPTURA,
  );

  return uLimitado === uNuevo ? enDirecta : -uLimitado - vzInterna;
}
