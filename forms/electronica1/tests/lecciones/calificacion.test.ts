/* La rubrica. Escrita contra el COMPORTAMIENTO: si mañana cambian los pesos
   en config.ts, estas pruebas siguen valiendo. */

import { describe, it, expect } from "vitest";
import { EVALUACION } from "@/config";
import {
  acerto,
  calificar,
  estadoInicial,
  explicarDesglose,
  puntosDiagnostico,
  totalQuemados,
  type EstadoEvaluacion,
} from "@/lecciones/calificacion";
import type { IntentoDiagnostico } from "@/plataforma/almacen/esquema";

function intento(correcto: boolean, tSeg = 10): IntentoDiagnostico {
  return { opcion: 0, etiqueta: "una opción", correcto, tSeg };
}

/** Sesion perfecta: acierta a la primera, repara y no rompe nada. */
function impecable(): EstadoEvaluacion {
  return {
    ...estadoInicial(),
    diagnosticos: [intento(true)],
    reparacionVerificada: true,
  };
}

describe("puntaje del diagnóstico", () => {
  it("acertar al primer intento da el peso completo", () => {
    expect(puntosDiagnostico([intento(true)])).toBe(EVALUACION.pesos.diagnostico);
  });

  it("se degrada con cada intento fallido previo", () => {
    const dos = puntosDiagnostico([intento(false), intento(true)]);
    const tres = puntosDiagnostico([intento(false), intento(false), intento(true)]);
    expect(dos).toBeLessThan(EVALUACION.pesos.diagnostico);
    expect(tres).toBeLessThan(dos);
    expect(tres).toBeGreaterThan(0);
  });

  it("a partir del cuarto intento ya no puntúa", () => {
    const muchos = [intento(false), intento(false), intento(false), intento(true)];
    expect(puntosDiagnostico(muchos)).toBe(0);
  });

  it("no acertar nunca da cero", () => {
    expect(puntosDiagnostico([intento(false), intento(false)])).toBe(0);
    expect(puntosDiagnostico([])).toBe(0);
  });
});

describe("la regla central del curso", () => {
  it("reparar sin diagnóstico correcto NO puntúa, aunque funcione", () => {
    const sinDiagnostico: EstadoEvaluacion = {
      ...estadoInicial(),
      diagnosticos: [intento(false)],
      reparacionVerificada: true,
    };
    expect(calificar(sinDiagnostico).reparacion).toBe(0);
  });

  it("con diagnóstico correcto y reparación verificada sí puntúa", () => {
    expect(calificar(impecable()).reparacion).toBe(EVALUACION.pesos.reparacion);
  });

  it("diagnosticar bien pero no reparar tampoco da los puntos de reparación", () => {
    const sinReparar: EstadoEvaluacion = {
      ...estadoInicial(),
      diagnosticos: [intento(true)],
      reparacionVerificada: false,
    };
    expect(calificar(sinReparar).reparacion).toBe(0);
    expect(calificar(sinReparar).diagnostico).toBe(EVALUACION.pesos.diagnostico);
  });
});

describe("eficiencia", () => {
  it("verificar a la primera da el peso completo", () => {
    expect(calificar(impecable()).eficiencia).toBe(EVALUACION.pesos.eficiencia);
  });

  it("cada verificación fallida descuenta", () => {
    const una = calificar({ ...impecable(), reparacionesFallidas: 1 }).eficiencia;
    const dos = calificar({ ...impecable(), reparacionesFallidas: 2 }).eficiencia;
    expect(una).toBeLessThan(EVALUACION.pesos.eficiencia);
    expect(dos).toBeLessThan(una);
  });

  it("nunca baja de cero por muchos fallos que haya", () => {
    expect(
      calificar({ ...impecable(), reparacionesFallidas: 99 }).eficiencia,
    ).toBe(0);
  });
});

describe("cuidado", () => {
  it("no romper nada da el peso completo", () => {
    expect(calificar(impecable()).cuidado).toBe(EVALUACION.pesos.cuidado);
  });

  it("cada componente quemado descuenta", () => {
    const uno = calificar({ ...impecable(), quemados: { led: 1 } }).cuidado;
    const dos = calificar({ ...impecable(), quemados: { led: 2 } }).cuidado;
    expect(uno).toBeLessThan(EVALUACION.pesos.cuidado);
    expect(dos).toBeLessThan(uno);
  });

  it("los cortocircuitos también descuentan", () => {
    expect(calificar({ ...impecable(), cortocircuitos: 1 }).cuidado).toBeLessThan(
      EVALUACION.pesos.cuidado,
    );
  });

  it("cuenta los quemados de todos los tipos", () => {
    expect(totalQuemados({ led: 2, resistencia: 1 })).toBe(3);
    expect(totalQuemados({})).toBe(0);
  });

  it("nunca baja de cero", () => {
    expect(
      calificar({ ...impecable(), quemados: { led: 50 }, cortocircuitos: 50 })
        .cuidado,
    ).toBe(0);
  });
});

describe("nota total", () => {
  it("la sesión impecable saca el máximo", () => {
    expect(calificar(impecable()).total).toBe(EVALUACION.escalaMax);
  });

  it("no hacer nada saca cero", () => {
    expect(calificar(estadoInicial()).total).toBe(
      EVALUACION.pesos.eficiencia + EVALUACION.pesos.cuidado,
    );
  });

  it("es la suma de los cuatro criterios", () => {
    const e: EstadoEvaluacion = {
      diagnosticos: [intento(false), intento(true)],
      reparacionVerificada: true,
      reparacionesFallidas: 1,
      quemados: { led: 1 },
      cortocircuitos: 0,
    };
    const d = calificar(e);
    expect(d.total).toBe(d.diagnostico + d.reparacion + d.eficiencia + d.cuidado);
  });

  it("nunca se pasa de la escala ni baja de cero", () => {
    for (const e of [impecable(), estadoInicial()]) {
      const total = calificar(e).total;
      expect(total).toBeGreaterThanOrEqual(0);
      expect(total).toBeLessThanOrEqual(EVALUACION.escalaMax);
    }
  });

  it("los pesos de config suman la escala completa", () => {
    const { pesos, escalaMax } = EVALUACION;
    expect(
      pesos.diagnostico + pesos.reparacion + pesos.eficiencia + pesos.cuidado,
    ).toBe(escalaMax);
  });
});

describe("explicación del desglose", () => {
  it("da un motivo por cada criterio", () => {
    const e = impecable();
    const filas = explicarDesglose(e, calificar(e));
    expect(filas).toHaveLength(4);
    for (const f of filas) expect(f.motivo.length).toBeGreaterThan(10);
  });

  it("dice explícitamente por qué la reparación no puntuó", () => {
    const e: EstadoEvaluacion = {
      ...estadoInicial(),
      diagnosticos: [intento(false)],
      reparacionVerificada: true,
    };
    const fila = explicarDesglose(e, calificar(e)).find(
      (f) => f.criterio === "Reparación",
    )!;
    expect(fila.motivo).toMatch(/sin haber declarado/i);
  });

  it("dice en qué intento se acertó", () => {
    const e: EstadoEvaluacion = {
      ...impecable(),
      diagnosticos: [intento(false), intento(true)],
    };
    const fila = explicarDesglose(e, calificar(e)).find(
      (f) => f.criterio === "Diagnóstico",
    )!;
    expect(fila.motivo).toMatch(/intento 2/i);
  });
});

describe("acerto()", () => {
  it("detecta si hubo diagnóstico correcto en cualquier intento", () => {
    expect(acerto([intento(false), intento(true)])).toBe(true);
    expect(acerto([intento(false)])).toBe(false);
    expect(acerto([])).toBe(false);
  });
});
