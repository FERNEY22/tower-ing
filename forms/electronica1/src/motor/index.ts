/* =========================================================================
   motor/index.ts — La unica puerta del motor.

   El resto del proyecto llama a `resolver(circuito)` y no necesita saber si
   por dentro hubo una eliminacion gaussiana o cuarenta iteraciones de
   Newton. Tampoco tiene que decidir cual usar.
   ========================================================================= */

import type { Circuito } from "./circuito";
import { resolverLineal, type Solucion } from "./solverLineal";
import { resolverNoLineal, tieneNoLineales } from "./newton";

export interface OpcionesResolver {
  gmin?: number;
  permitirEscalonamiento?: boolean;
}

/**
 * Resuelve el circuito en continua.
 *
 * Nunca lanza por culpa de lo que haya construido el estudiante: todo lo que
 * puede salir mal viene en `solucion.diagnosticos`, en su idioma.
 */
export function resolver(
  circuito: Circuito,
  opciones: OpcionesResolver = {},
): Solucion {
  return tieneNoLineales(circuito)
    ? resolverNoLineal(circuito, opciones)
    : resolverLineal(circuito, opciones);
}

/* ------------------------------------------------------------- reexportes */

export type {
  Circuito,
  Cable,
  Componente,
  ColorLed,
  ParamsPorTipo,
  Punto,
  Red,
  RefTerminal,
  Terminal,
  TipoComponente,
  Polaridad,
} from "./circuito";

export {
  cable,
  circuitoVacio,
  claveTerminal,
  componentePorId,
  construirRed,
  crearCable,
  crearComponente,
  etiquetaDe,
  nodoDeTerminal,
  terminalVisible,
} from "./circuito";

export type { Diagnostico, Severidad, CodigoDiagnostico } from "./diagnostico";
export { hayErrores, soloAvisos } from "./diagnostico";

export type { ResultadoTopologia, Referencia } from "./topologia";
export { validarTopologia, diagnosticosDe } from "./topologia";

export type { Solucion, ResultadoComponente } from "./solverLineal";
export {
  corrienteDe,
  resolverLineal,
  tensionDe,
  tensionEntreNodos,
} from "./solverLineal";

export type { ResultadoNewton } from "./newton";
export { resolverNoLineal, tieneNoLineales } from "./newton";

export { brilloDeLed, esNoLineal } from "./modelos";
export {
  CALIBRACIONES,
  CORRIENTE_CALIBRACION_A,
  DIODO_SILICIO,
  LED_POR_COLOR,
} from "./parametros";

export {
  e12MasCercano,
  esE12,
  formatearAmperios,
  formatearMagnitud,
  formatearOhm,
  formatearVatios,
  formatearVoltios,
  SERIE_E12,
} from "./valores";
