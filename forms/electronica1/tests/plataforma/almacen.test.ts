/* Puerta de la fase 0: guardar y leer un participante, y que la contabilidad
   de intentos, mejor nota y aprobacion se comporte como dice la especificacion. */

import { describe, it, expect, beforeEach } from "vitest";
import { AlmacenMemoria } from "@/plataforma/almacen/memoria";
import type { ResultadoSesion } from "@/plataforma/almacen/esquema";
import { EVALUACION, INTENTOS } from "@/config";

const almacen = new AlmacenMemoria();

function sesion(nota: number, extra: Partial<ResultadoSesion> = {}): ResultadoSesion {
  return {
    nota,
    desglose: {
      diagnostico: nota * 0.4,
      reparacion: nota * 0.3,
      eficiencia: nota * 0.15,
      cuidado: nota * 0.15,
      total: nota,
    },
    aprobado: nota >= EVALUACION.umbralAprobacion,
    diagnosticos: [],
    reparacionesFallidas: 0,
    quemados: {},
    cortocircuitos: 0,
    mediciones: 0,
    tActivoSeg: 0,
    tPestanaSeg: 0,
    bitacoraIA: "",
    ts: Date.now(),
    ...extra,
  };
}

beforeEach(async () => {
  almacen.limpiar();
  await almacen.init();
});

describe("participantes", () => {
  it("guarda y recupera un participante", async () => {
    const p = await almacen.registrarParticipante("ab12", "Maria Gomez", "••••678");
    expect(p.nombre).toBe("Maria Gomez");
    expect(p.ccMask).toBe("••••678");

    const grupo = await almacen.cargarGrupo();
    expect(grupo).toHaveLength(1);
    expect(grupo[0]!.ccHash).toBe("ab12");
  });

  it("no sobrescribe el registro si la cedula ya existe", async () => {
    await almacen.registrarParticipante("ab12", "Maria Gomez", "••••678");
    const segundo = await almacen.registrarParticipante("ab12", "Otro Nombre", "••••999");
    expect(segundo.nombre).toBe("Maria Gomez");
  });

  it("nunca persiste la cedula completa", async () => {
    await almacen.registrarParticipante("ab12", "Maria Gomez", "••••678");
    const grupo = await almacen.cargarGrupo();
    expect(JSON.stringify(grupo)).not.toContain("1012345678");
  });
});

describe("progreso de lecciones", () => {
  it("empieza vacio", async () => {
    expect(await almacen.cargarProgreso("ab12")).toEqual({});
  });

  it("cuenta intentos y conserva la mejor nota", async () => {
    await almacen.guardarResultado("ab12", "l1", "Maria", sesion(45));
    await almacen.guardarResultado("ab12", "l1", "Maria", sesion(82));
    const p = await almacen.guardarResultado("ab12", "l1", "Maria", sesion(60));

    expect(p.l1!.intentos).toBe(3);
    expect(p.l1!.mejorNota).toBe(82);
    expect(p.l1!.ultimo!.nota).toBe(60); // el ultimo es el ultimo, no el mejor
  });

  it("marca aprobado en el umbral y fija aprobadoEn una sola vez", async () => {
    await almacen.guardarResultado("ab12", "l1", "Maria", sesion(59));
    let p = await almacen.cargarProgreso("ab12");
    expect(p.l1!.aprobado).toBe(false);
    expect(p.l1!.aprobadoEn).toBeNull();

    p = await almacen.guardarResultado("ab12", "l1", "Maria", sesion(60));
    const primeraMarca = p.l1!.aprobadoEn;
    expect(p.l1!.aprobado).toBe(true);
    expect(primeraMarca).toBeTypeOf("number");

    p = await almacen.guardarResultado("ab12", "l1", "Maria", sesion(95));
    expect(p.l1!.aprobadoEn).toBe(primeraMarca);
  });

  it("acumula una entrada de bitacora por sesion, ignorando las vacias", async () => {
    await almacen.guardarResultado("ab12", "l1", "Maria", sesion(70, { bitacoraIA: "  " }));
    await almacen.guardarResultado("ab12", "l1", "Maria", sesion(70, { bitacoraIA: "Me dijo 1,2 V y medi 0,7." }));
    const p = await almacen.cargarProgreso("ab12");
    expect(p.l1!.bitacoraIA).toEqual(["Me dijo 1,2 V y medi 0,7."]);
  });

  it("mantiene las lecciones independientes entre si", async () => {
    await almacen.guardarResultado("ab12", "l1", "Maria", sesion(90));
    await almacen.guardarResultado("ab12", "l2", "Maria", sesion(30));
    const p = await almacen.cargarProgreso("ab12");
    expect(p.l1!.aprobado).toBe(true);
    expect(p.l2!.aprobado).toBe(false);
  });

  it("el tope de intentos de config es alcanzable y verificable", async () => {
    for (let i = 0; i < INTENTOS.porLeccion; i++) {
      await almacen.guardarResultado("ab12", "l1", "Maria", sesion(50));
    }
    const p = await almacen.cargarProgreso("ab12");
    expect(p.l1!.intentos).toBe(INTENTOS.porLeccion);
  });
});

describe("eventos", () => {
  it("acumula lotes en la misma sesion y los devuelve ordenados", async () => {
    await almacen.registrarEventos("ab12", "s1", [
      { tipo: "session_start", t: 100, leccion: null },
      { tipo: "lesson_start", t: 200, leccion: "l1" },
    ]);
    await almacen.registrarEventos("ab12", "s1", [
      { tipo: "measurement_taken", t: 300, leccion: "l1", payload: { modo: "V" } },
    ]);

    const eventos = await almacen.cargarEventos("ab12", "s1");
    expect(eventos).toHaveLength(3);
    expect(eventos.map((e) => e.tipo)).toEqual([
      "session_start",
      "lesson_start",
      "measurement_taken",
    ]);
  });

  it("separa las sesiones", async () => {
    await almacen.registrarEventos("ab12", "s1", [
      { tipo: "session_start", t: 1, leccion: null },
    ]);
    expect(await almacen.cargarEventos("ab12", "s2")).toEqual([]);
  });
});

describe("vista del docente", () => {
  it("aplana acumulado, aprobadas y tiempo activo", async () => {
    await almacen.registrarParticipante("ab12", "Maria Gomez", "••••678");
    await almacen.registrarParticipante("cd34", "Juan Perez", "••••123");

    await almacen.guardarResultado("ab12", "l1", "Maria Gomez", sesion(80, { tActivoSeg: 300 }));
    await almacen.guardarResultado("ab12", "l2", "Maria Gomez", sesion(70, { tActivoSeg: 200 }));
    await almacen.guardarResultado("cd34", "l1", "Juan Perez", sesion(40, { tActivoSeg: 100 }));

    const grupo = await almacen.cargarGrupo();
    expect(grupo[0]!.nombre).toBe("Maria Gomez"); // ordenado por acumulado
    expect(grupo[0]!.acumulado).toBe(150);
    expect(grupo[0]!.leccionesAprobadas).toBe(2);
    expect(grupo[0]!.tActivoTotalSeg).toBe(500);
    expect(grupo[1]!.leccionesAprobadas).toBe(0);
  });
});
