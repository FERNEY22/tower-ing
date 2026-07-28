/* =========================================================================
   eventos.ts — Catalogo de tipos de evento.

   Cada tipo declara el nivel minimo de registro necesario para emitirlo
   (ver REGISTRO.nivel en config.ts). Los hitos siempre se registran; el
   detalle fino de edicion solo con nivel completo.
   ========================================================================= */

import { NIVEL_REGISTRO_HITOS, NIVEL_REGISTRO_COMPLETO } from "@/config";

export const TIPOS_EVENTO = {
  // --- sesion
  session_start: NIVEL_REGISTRO_HITOS,
  session_end: NIVEL_REGISTRO_HITOS,

  // --- leccion
  lesson_start: NIVEL_REGISTRO_HITOS,
  lesson_complete: NIVEL_REGISTRO_HITOS,

  // --- edicion del circuito
  component_placed: NIVEL_REGISTRO_COMPLETO,
  component_removed: NIVEL_REGISTRO_COMPLETO,
  wire_created: NIVEL_REGISTRO_COMPLETO,
  wire_removed: NIVEL_REGISTRO_COMPLETO,
  value_changed: NIVEL_REGISTRO_COMPLETO,

  // --- instrumentacion
  measurement_taken: NIVEL_REGISTRO_HITOS,

  // --- evaluacion
  diagnosis_submitted: NIVEL_REGISTRO_HITOS,
  repair_submitted: NIVEL_REGISTRO_HITOS,

  // --- incidentes
  component_burned: NIVEL_REGISTRO_HITOS,
  short_circuit: NIVEL_REGISTRO_HITOS,
  simulation_failed: NIVEL_REGISTRO_HITOS,

  // --- salidas
  export_png: NIVEL_REGISTRO_HITOS,
  free_practice_save: NIVEL_REGISTRO_HITOS,
} as const;

export type TipoEvento = keyof typeof TIPOS_EVENTO;

/** Todos los tipos, para validacion y para el panel docente. */
export const LISTA_TIPOS = Object.keys(TIPOS_EVENTO) as TipoEvento[];

/** True si este tipo debe emitirse con el nivel de registro configurado. */
export function seRegistra(tipo: TipoEvento, nivelActual: number): boolean {
  if (nivelActual <= 0) return false;
  return nivelActual >= TIPOS_EVENTO[tipo];
}
