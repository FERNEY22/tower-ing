/* =========================================================================
   registro.ts — Las lecciones implementadas.

   config.ts declara las cinco del curso; aqui estan las que ya tienen
   circuito, distractores y verificacion. El panel usa la declaracion de
   config para pintar las tarjetas, y esta lista para saber cual se puede
   abrir de verdad.
   ========================================================================= */

import type { Leccion } from "./tipos";
import { LECCION_1 } from "./datos/l1-codigo-colores";
import { LECCION_2 } from "./datos/l2-led-sin-resistencia";
import { LECCION_3 } from "./datos/l3-diodo-invertido";
import { LECCION_4 } from "./datos/l4-recta-de-carga";
import { LECCION_5 } from "./datos/l5-zener-regulador";

export const LECCIONES_IMPLEMENTADAS: readonly Leccion[] = [
  LECCION_1,
  LECCION_2,
  LECCION_3,
  LECCION_4,
  LECCION_5,
];

export function leccionPorId(id: string): Leccion | undefined {
  return LECCIONES_IMPLEMENTADAS.find((l) => l.id === id);
}

export function estaImplementada(id: string): boolean {
  return leccionPorId(id) !== undefined;
}
