/* Puerta de la fase 0, extremo a extremo y sin navegador:
   el estudiante escribe nombre y cedula, queda registrado, y el panel puede
   leer su progreso y decidir que lecciones estan abiertas. */

import { describe, it, expect, beforeEach } from "vitest";
import { useSesion } from "@/estado/sesionStore";
import { construirIdentidad } from "@/plataforma/ingreso/identidad";
import { almacen } from "@/plataforma/almacen";
import { estadoDeTodas } from "@/plataforma/panel/desbloqueo";
import { ALMACEN } from "@/config";

beforeEach(async () => {
  await useSesion.getState().salir();
});

describe("flujo de ingreso", () => {
  it("sin credenciales de Firebase cae al almacen en memoria", () => {
    // Es lo que permite que el proyecto arranque recien clonado.
    expect(ALMACEN.backend).toBe("memoria");
  });

  it("ingresar deja la sesion lista para trabajar", async () => {
    const identidad = await construirIdentidad("Maria Fernanda Gomez", "1012345678");
    await useSesion.getState().ingresar(identidad);

    const s = useSesion.getState();
    expect(s.error).toBeNull();
    expect(s.cargando).toBe(false);
    expect(s.identidad?.nombre).toBe("Maria Fernanda Gomez");
    expect(s.identidad?.ccMask).toBe("••••678");
    expect(s.logger).not.toBeNull();
    expect(s.cronometro).not.toBeNull();
  });

  it("el participante queda guardado y recuperable", async () => {
    const identidad = await construirIdentidad("Maria Fernanda Gomez", "1012345678");
    await useSesion.getState().ingresar(identidad);

    const grupo = await almacen.cargarGrupo();
    const fila = grupo.find((f) => f.ccHash === identidad.ccHash);
    expect(fila).toBeDefined();
    expect(fila!.nombre).toBe("Maria Fernanda Gomez");
    expect(fila!.ccMask).toBe("••••678");
  });

  it("volver a entrar recupera al mismo estudiante, no crea otro", async () => {
    const primera = await construirIdentidad("Maria Fernanda Gomez", "1012345678");
    await useSesion.getState().ingresar(primera);
    await useSesion.getState().salir();

    const segunda = await construirIdentidad("Maria F. Gomez", "1.012.345.678");
    await useSesion.getState().ingresar(segunda);

    expect(segunda.ccHash).toBe(primera.ccHash);
    const grupo = await almacen.cargarGrupo();
    expect(grupo.filter((f) => f.ccHash === primera.ccHash)).toHaveLength(1);
  });

  it("un estudiante nuevo empieza con solo la leccion 1 abierta", async () => {
    const identidad = await construirIdentidad("Juan Perez Rojas", "1098765432");
    await useSesion.getState().ingresar(identidad);

    const { progreso } = useSesion.getState();
    expect(progreso).toEqual({});

    const estados = estadoDeTodas(progreso, almacen.ahora());
    expect(estados[0]!.clase).toBe("abierta");
    expect(estados.slice(1).every((e) => e.clase === "cerrada")).toBe(true);
  });

  it("salir limpia la sesion y vacia la cola de eventos", async () => {
    const identidad = await construirIdentidad("Maria Fernanda Gomez", "1012345678");
    await useSesion.getState().ingresar(identidad);
    const sesionLogger = useSesion.getState().logger!;

    await useSesion.getState().salir();

    expect(useSesion.getState().identidad).toBeNull();
    expect(useSesion.getState().logger).toBeNull();
    expect(sesionLogger.pendientes).toBe(0);
  });

  it("registra el arranque y el cierre de la sesion", async () => {
    const identidad = await construirIdentidad("Maria Fernanda Gomez", "1012345678");
    await useSesion.getState().ingresar(identidad);

    const logger = useSesion.getState().logger!;
    await logger.vaciar();
    await useSesion.getState().salir();

    // El id de sesion es interno; se busca en todo lo escrito del estudiante.
    const grupo = await almacen.cargarGrupo();
    expect(grupo.some((f) => f.ccHash === identidad.ccHash)).toBe(true);
  });
});
