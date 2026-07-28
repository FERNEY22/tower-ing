/* La politica de desbloqueo e intentos vive en config.ts. Estas pruebas
   fijan el COMPORTAMIENTO, no los numeros: si mañana INTENTOS.porLeccion
   pasa de 3 a 5, siguen pasando. */

import { describe, it, expect } from "vitest";
import { estadoDeTodas, estadoDeLeccion, resumen } from "@/plataforma/panel/desbloqueo";
import type { ProgresoEstudiante, ProgresoLeccion } from "@/plataforma/almacen/esquema";
import { LECCIONES, INTENTOS, EVALUACION } from "@/config";

const AHORA = 1_700_000_000_000;

function prog(parcial: Partial<ProgresoLeccion>): ProgresoLeccion {
  return {
    nombre: "Maria",
    intentos: 1,
    mejorNota: 0,
    aprobado: false,
    aprobadoEn: null,
    bitacoraIA: [],
    ultimo: null,
    ...parcial,
  };
}

describe("desbloqueo por aprobacion", () => {
  it("la leccion 1 siempre esta abierta", () => {
    const estados = estadoDeTodas({}, AHORA);
    expect(estados[0]!.clase).toBe("abierta");
  });

  it("las demas empiezan cerradas y dicen cual falta", () => {
    const estados = estadoDeTodas({}, AHORA);
    for (const e of estados.slice(1)) {
      expect(e.clase).toBe("cerrada");
      expect(e.motivo).toMatch(/lección \d/i);
    }
  });

  it("aprobar la anterior abre la siguiente, y solo la siguiente", () => {
    const progreso: ProgresoEstudiante = {
      l1: prog({ aprobado: true, aprobadoEn: AHORA - 1000, mejorNota: 85 }),
    };
    const estados = estadoDeTodas(progreso, AHORA);
    expect(estados[0]!.clase).toBe("aprobada");
    expect(estados[1]!.clase).toBe("abierta");
    expect(estados[2]!.clase).toBe("cerrada");
  });

  it("una leccion aprobada se puede repetir mientras queden intentos", () => {
    const progreso: ProgresoEstudiante = {
      l1: prog({ aprobado: true, aprobadoEn: AHORA, intentos: 1, mejorNota: 85 }),
    };
    const e = estadoDeLeccion(LECCIONES[0]!, progreso, AHORA);
    expect(e.clase).toBe("aprobada");
    expect(e.intentosRestantes).toBe(INTENTOS.porLeccion - 1);
  });
});

describe("tope de intentos", () => {
  it("agotar los intentos sin aprobar cierra la leccion", () => {
    const progreso: ProgresoEstudiante = {
      l1: prog({ intentos: INTENTOS.porLeccion, mejorNota: 40 }),
    };
    const e = estadoDeLeccion(LECCIONES[0]!, progreso, AHORA);
    expect(e.clase).toBe("sin-intentos");
    expect(e.intentosRestantes).toBe(0);
    expect(e.motivo).toContain(String(INTENTOS.porLeccion));
  });

  it("agotarlos habiendo aprobado no la marca como fallida", () => {
    const progreso: ProgresoEstudiante = {
      l1: prog({
        intentos: INTENTOS.porLeccion,
        aprobado: true,
        aprobadoEn: AHORA,
        mejorNota: 88,
      }),
    };
    const e = estadoDeLeccion(LECCIONES[0]!, progreso, AHORA);
    expect(e.clase).toBe("aprobada");
    expect(e.motivo).toBe("");
  });
});

describe("resumen del panel", () => {
  it("promedia sobre el total de lecciones, no sobre las intentadas", () => {
    const progreso: ProgresoEstudiante = {
      l1: prog({ mejorNota: 100, aprobado: true, aprobadoEn: AHORA }),
    };
    const r = resumen(progreso);
    expect(r.total).toBe(LECCIONES.length);
    expect(r.aprobadas).toBe(1);
    expect(r.promedio).toBe(Math.round(100 / LECCIONES.length));
  });

  it("una nota justo en el umbral cuenta como aprobada", () => {
    const progreso: ProgresoEstudiante = {
      l1: prog({
        mejorNota: EVALUACION.umbralAprobacion,
        aprobado: true,
        aprobadoEn: AHORA,
      }),
    };
    expect(resumen(progreso).aprobadas).toBe(1);
  });
});
