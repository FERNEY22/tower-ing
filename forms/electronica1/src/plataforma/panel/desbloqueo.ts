/* =========================================================================
   desbloqueo.ts — Estado de cada leccion para el panel del estudiante.

   Regla vigente (PROGRESION en config.ts): la leccion N+1 se abre al aprobar
   la N, sin espera adicional. Si algun dia se quiere reintroducir la espera
   por minutos, basta con subir PROGRESION.esperaMinutos.
   ========================================================================= */

import { LECCIONES, PROGRESION, INTENTOS, type DefinicionLeccion } from "@/config";
import type { ProgresoEstudiante } from "@/plataforma/almacen/esquema";

export type ClaseEstado = "abierta" | "aprobada" | "cerrada" | "sin-intentos";

export interface EstadoLeccion {
  leccion: DefinicionLeccion;
  clase: ClaseEstado;
  /** Motivo del bloqueo, listo para mostrar. Vacio si esta abierta. */
  motivo: string;
  mejorNota: number;
  intentosUsados: number;
  intentosRestantes: number;
  /** Milisegundos que faltan para que se abra, si el bloqueo es temporal. */
  esperaRestanteMs: number | null;
}

export function estadoDeLeccion(
  leccion: DefinicionLeccion,
  progreso: ProgresoEstudiante,
  ahora: number,
): EstadoLeccion {
  const mio = progreso[leccion.id];
  const mejorNota = mio?.mejorNota ?? 0;
  const intentosUsados = mio?.intentos ?? 0;
  const intentosRestantes = Math.max(0, INTENTOS.porLeccion - intentosUsados);

  const base = {
    leccion,
    mejorNota,
    intentosUsados,
    intentosRestantes,
    esperaRestanteMs: null as number | null,
  };

  // La primera leccion nunca esta bloqueada.
  const previa = LECCIONES.find((l) => l.n === leccion.n - 1);

  if (previa && PROGRESION.desbloqueoPorAprobacion) {
    const progPrevia = progreso[previa.id];
    if (!progPrevia?.aprobado) {
      return {
        ...base,
        clase: "cerrada",
        motivo: `Primero aprueba la lección ${previa.n}.`,
      };
    }
    if (PROGRESION.esperaMinutos > 0 && progPrevia.aprobadoEn) {
      const falta =
        PROGRESION.esperaMinutos * 60_000 - (ahora - progPrevia.aprobadoEn);
      if (falta > 0) {
        return {
          ...base,
          clase: "cerrada",
          motivo: "Disponible en",
          esperaRestanteMs: falta,
        };
      }
    }
  }

  if (intentosRestantes === 0) {
    return {
      ...base,
      clase: mio?.aprobado ? "aprobada" : "sin-intentos",
      motivo: mio?.aprobado
        ? ""
        : `Usaste los ${INTENTOS.porLeccion} intentos de esta lección.`,
    };
  }

  return {
    ...base,
    clase: mio?.aprobado ? "aprobada" : "abierta",
    motivo: "",
  };
}

export function estadoDeTodas(
  progreso: ProgresoEstudiante,
  ahora: number,
): EstadoLeccion[] {
  return LECCIONES.map((l) => estadoDeLeccion(l, progreso, ahora));
}

/** Suma de las mejores notas y numero de lecciones aprobadas. */
export function resumen(progreso: ProgresoEstudiante) {
  let notaTotal = 0;
  let aprobadas = 0;
  for (const l of LECCIONES) {
    const p = progreso[l.id];
    if (!p) continue;
    notaTotal += p.mejorNota;
    if (p.aprobado) aprobadas += 1;
  }
  const promedio = LECCIONES.length
    ? Math.round(notaTotal / LECCIONES.length)
    : 0;
  return { promedio, aprobadas, total: LECCIONES.length };
}
