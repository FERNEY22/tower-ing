import { describe, it, expect, beforeEach } from "vitest";
import { AlmacenMemoria } from "@/plataforma/almacen/memoria";
import { Logger, nuevaSesionId } from "@/plataforma/registro/logger";
import { seRegistra, LISTA_TIPOS } from "@/plataforma/registro/eventos";
import { CronometroActividad } from "@/plataforma/registro/tiempoActivo";
import { REGISTRO, TIEMPO } from "@/config";

describe("catalogo de eventos", () => {
  it("cubre los tipos que exige la especificacion", () => {
    for (const t of [
      "session_start",
      "session_end",
      "lesson_start",
      "lesson_complete",
      "component_placed",
      "component_removed",
      "wire_created",
      "wire_removed",
      "value_changed",
      "measurement_taken",
      "diagnosis_submitted",
      "repair_submitted",
      "component_burned",
      "short_circuit",
      "simulation_failed",
      "export_png",
      "free_practice_save",
    ]) {
      expect(LISTA_TIPOS).toContain(t);
    }
  });

  it("con nivel 0 no se registra nada", () => {
    expect(seRegistra("component_burned", 0)).toBe(false);
    expect(seRegistra("session_start", 0)).toBe(false);
  });

  it("con nivel 1 pasan los hitos pero no la edicion fina", () => {
    expect(seRegistra("diagnosis_submitted", 1)).toBe(true);
    expect(seRegistra("wire_created", 1)).toBe(false);
  });

  it("con nivel 2 pasa todo", () => {
    for (const t of LISTA_TIPOS) expect(seRegistra(t, 2)).toBe(true);
  });
});

describe("logger", () => {
  const almacen = new AlmacenMemoria();

  beforeEach(async () => {
    almacen.limpiar();
    await almacen.init();
  });

  it("encola sin tocar la red y envia al vaciar", async () => {
    const log = new Logger({ almacen, ccHash: "ab12", sesionId: "s1" });
    log.emitir("lesson_start");
    log.emitir("measurement_taken", { modo: "V", valor: 6.0 });

    expect(log.pendientes).toBe(2);
    expect(await almacen.cargarEventos("ab12", "s1")).toHaveLength(0);

    await log.vaciar();
    const eventos = await almacen.cargarEventos("ab12", "s1");
    expect(eventos).toHaveLength(2);
    expect(eventos[1]!.payload).toEqual({ modo: "V", valor: 6.0 });
  });

  it("envia solo al llenarse el lote", async () => {
    const log = new Logger({ almacen, ccHash: "ab12", sesionId: "s1" });
    for (let i = 0; i < REGISTRO.loteMaxEventos - 1; i++) {
      log.emitir("component_placed", { i });
    }
    expect(log.pendientes).toBe(REGISTRO.loteMaxEventos - 1);

    log.emitir("component_placed", { ultimo: true });
    await log.vaciar();
    expect(await almacen.cargarEventos("ab12", "s1")).toHaveLength(
      REGISTRO.loteMaxEventos,
    );
  });

  it("etiqueta los eventos con la leccion en curso", async () => {
    const log = new Logger({ almacen, ccHash: "ab12", sesionId: "s1" });
    log.emitir("session_start");
    log.fijarLeccion("l3");
    log.emitir("lesson_start");
    await log.cerrar();

    const eventos = await almacen.cargarEventos("ab12", "s1");
    expect(eventos[0]!.leccion).toBeNull();
    expect(eventos[1]!.leccion).toBe("l3");
  });

  it("genera identificadores de sesion distintos", () => {
    const a = nuevaSesionId(Date.now());
    const b = nuevaSesionId(Date.now());
    expect(a).not.toBe(b);
    expect(a).toMatch(/^\d{8}-[a-z0-9]+$/);
  });
});

describe("cronometro de actividad", () => {
  it("cuenta el tiempo mientras hay interaccion", () => {
    let t = 0;
    const c = new CronometroActividad(() => t);
    c.iniciar();

    for (let i = 0; i < 5; i++) {
      t += 10_000;
      c.marcarInteraccion();
    }

    const r = c.leer();
    expect(r.activoSeg).toBe(50);
    expect(r.pestanaSeg).toBe(50);
    expect(r.inactivo).toBe(false);
  });

  it("congela el tiempo activo tras el limite de inactividad", () => {
    let t = 0;
    const c = new CronometroActividad(() => t);
    c.iniciar();

    t += 30_000;
    c.marcarInteraccion(); // 30 s activos

    t += 10 * 60_000; // diez minutos mirando el techo

    const r = c.leer();
    expect(r.activoSeg).toBe(30 + TIEMPO.inactividadMs / 1000);
    expect(r.pestanaSeg).toBe(630);
    expect(r.inactivo).toBe(true);
  });

  it("vuelve a contar cuando el estudiante retoma", () => {
    let t = 0;
    const c = new CronometroActividad(() => t);
    c.iniciar();

    t += 10 * 60_000;
    c.marcarInteraccion();
    const congelado = c.leer().activoSeg;

    t += 20_000;
    c.marcarInteraccion();

    expect(c.leer().activoSeg).toBe(congelado + 20);
  });

  it("detecta la sesion huerfana", () => {
    let t = 0;
    const c = new CronometroActividad(() => t);
    c.iniciar();
    expect(c.huerfana).toBe(false);

    t += TIEMPO.sesionHuerfanaMs + 1000;
    expect(c.huerfana).toBe(true);
  });
});
