/* =========================================================================
   tipos.ts — Que es una leccion.

   Una leccion es un circuito con una averia sembrada, unas opciones de
   diagnostico con distractores plausibles, y un criterio para dar la
   reparacion por buena. Nada mas: el flujo y la rubrica son comunes.

   Los distractores importan tanto como la opcion correcta. Un distractor
   plausible dice QUE esta entendiendo mal el estudiante; uno absurdo solo
   dice que sabe descartar tonterias.
   ========================================================================= */

import type { Circuito } from "@/motor/circuito";
import type { Solucion } from "@/motor/solverLineal";

export interface OpcionDiagnostico {
  id: string;
  texto: string;
  correcta: boolean;
  /** Por que es correcta, o por que no lo es. Se muestra al responder. */
  explicacion: string;
}

export interface Verificacion {
  ok: boolean;
  /** Que decirle al estudiante, acierte o no. */
  mensaje: string;
}

export interface Leccion {
  id: string;
  numero: number;
  titulo: string;
  /** Que va a hacer y para que. Se muestra en el paso de observar. */
  intro: string;
  /** Que deberia estar pasando y no pasa. */
  sintoma: string;
  /** Pista de por donde empezar a medir. */
  pistaMedicion: string;
  /** Objetivo de aprendizaje, en una linea. */
  objetivo: string;

  /**
   * Panel extra junto a la guia. Solo la leccion 4 necesita uno: la curva
   * I-V con la recta de carga.
   */
  panel?: "curva-iv";

  /** Circuito de partida, con la averia ya sembrada. */
  circuitoInicial(): Circuito;

  /** Opciones de diagnostico. Exactamente una es correcta. */
  opciones: OpcionDiagnostico[];

  /** Da la reparacion por buena, o explica que falta. */
  verificar(circuito: Circuito, solucion: Solucion | null): Verificacion;
}

/** Comprueba que una leccion esta bien definida. Se usa en las pruebas. */
export function validarLeccion(leccion: Leccion): string[] {
  const problemas: string[] = [];

  const correctas = leccion.opciones.filter((o) => o.correcta);
  if (correctas.length !== 1) {
    problemas.push(
      `${leccion.id}: debe haber exactamente una opción correcta, hay ${correctas.length}.`,
    );
  }
  if (leccion.opciones.length < 3) {
    problemas.push(`${leccion.id}: hacen falta al menos tres opciones.`);
  }

  const ids = new Set(leccion.opciones.map((o) => o.id));
  if (ids.size !== leccion.opciones.length) {
    problemas.push(`${leccion.id}: hay identificadores de opción repetidos.`);
  }

  for (const o of leccion.opciones) {
    if (o.texto.length < 15) {
      problemas.push(`${leccion.id}/${o.id}: la opción es demasiado escueta.`);
    }
    if (o.explicacion.length < 20) {
      problemas.push(`${leccion.id}/${o.id}: falta explicación.`);
    }
  }

  return problemas;
}
