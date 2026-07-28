/* @vitest-environment jsdom */

/* =========================================================================
   PUERTA DE LA FASE 10

   El panel docente muestra todo lo que pide la especificación: lecciones y
   nota de cada una, intentos de diagnóstico y qué opción se eligió,
   componentes quemados por tipo, cortocircuitos, tiempo activo por lección y
   las entradas de bitácora de IA. Más la exportación.
   ========================================================================= */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { EVALUACION } from "@/config";
import { PanelDocente } from "@/plataforma/docente/PanelDocente";
import { autenticacion, CONTRASENA_SIMULADA } from "@/plataforma/docente/auth";
import { almacen } from "@/plataforma/almacen";
import { AlmacenMemoria } from "@/plataforma/almacen/memoria";
import type { ResultadoSesion } from "@/plataforma/almacen/esquema";
import { useCircuito } from "@/estado/circuitoStore";
import { useLeccion } from "@/estado/leccionStore";
import { useSesion } from "@/estado/sesionStore";
import { construirIdentidad } from "@/plataforma/ingreso/identidad";
import { leccionPorId } from "@/lecciones/registro";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let contenedor: HTMLDivElement;
let raiz: Root;

function montar(nodo: ReactElement): void {
  act(() => {
    raiz.render(<MemoryRouter>{nodo}</MemoryRouter>);
  });
}

function html(): string {
  return contenedor.innerHTML;
}

async function entrarComoDocente() {
  await act(async () => {
    await autenticacion.iniciar("profe@ean.edu.co", CONTRASENA_SIMULADA);
  });
}

/** Sesión de lección ya calificada, para poblar la base sin recorrer la UI. */
function sesion(parcial: Partial<ResultadoSesion> = {}): ResultadoSesion {
  return {
    nota: 85,
    desglose: { diagnostico: 40, reparacion: 30, eficiencia: 10, cuidado: 5, total: 85 },
    aprobado: true,
    diagnosticos: [
      { opcion: 1, etiqueta: "El LED está montado al revés.", correcto: false, tSeg: 24 },
      { opcion: 0, etiqueta: "La resistencia es de 100 kΩ.", correcto: true, tSeg: 61 },
    ],
    reparacionesFallidas: 1,
    quemados: { led: 2 },
    cortocircuitos: 1,
    mediciones: 4,
    tActivoSeg: 245,
    tPestanaSeg: 900,
    bitacoraIA: "Le pregunté a una IA y me dijo 470 Ω; al calcularlo salían 680.",
    ts: Date.now(),
    ...parcial,
  };
}

async function poblarGrupo() {
  const maria = await construirIdentidad("María Fernanda Gómez", "1012345678");
  const juan = await construirIdentidad("Juan Pérez Rojas", "1098765432");

  await almacen.registrarParticipante(maria.ccHash, maria.nombre, maria.ccMask);
  await almacen.registrarParticipante(juan.ccHash, juan.nombre, juan.ccMask);

  await almacen.guardarResultado(maria.ccHash, "l1", maria.nombre, sesion());
  await almacen.guardarResultado(maria.ccHash, "l2", maria.nombre, sesion({ nota: 95 }));
  await almacen.guardarResultado(
    juan.ccHash,
    "l1",
    juan.nombre,
    sesion({
      nota: 40,
      aprobado: false,
      diagnosticos: [
        { opcion: 2, etiqueta: "La fuente no da suficiente.", correcto: false, tSeg: 12 },
      ],
      quemados: {},
      cortocircuitos: 0,
      bitacoraIA: "No consulté ninguna IA.",
    }),
  );

  return { maria, juan };
}

beforeEach(async () => {
  if (almacen instanceof AlmacenMemoria) almacen.limpiar();
  await autenticacion.cerrar();
  contenedor = document.createElement("div");
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

describe("autenticación", () => {
  it("sin sesión pide correo y contraseña", async () => {
    montar(<PanelDocente />);
    await act(async () => {});
    expect(html()).toContain("Panel de resultados");
    expect(html()).toContain("Contraseña");
  });

  it("avisa en grande de que la autenticación simulada no protege nada", async () => {
    montar(<PanelDocente />);
    await act(async () => {});
    expect(autenticacion.esSimulada).toBe(true);
    expect(html()).toContain("Modo desarrollo");
    expect(html()).toContain("no protege nada");
  });

  it("una contraseña equivocada no entra", async () => {
    await expect(
      autenticacion.iniciar("profe@ean.edu.co", "loquesea"),
    ).rejects.toThrow(/incorrectos/i);
  });

  it("un correo sin arroba tampoco", async () => {
    await expect(autenticacion.iniciar("profe", CONTRASENA_SIMULADA)).rejects.toThrow(
      /correo válido/i,
    );
  });

  it("con las credenciales buenas entra al tablero", async () => {
    montar(<PanelDocente />);
    await entrarComoDocente();
    expect(html()).toContain("Resultados del grupo");
    expect(html()).toContain("profe@ean.edu.co");
  });
});

describe("el tablero con el grupo cargado", () => {
  beforeEach(async () => {
    await poblarGrupo();
    montar(<PanelDocente />);
    await entrarComoDocente();
    await act(async () => {});
  });

  it("lista a los estudiantes ordenados por acumulado", () => {
    const cuerpo = html();
    expect(cuerpo).toContain("María Fernanda Gómez");
    expect(cuerpo).toContain("Juan Pérez Rojas");
    expect(cuerpo.indexOf("María")).toBeLessThan(cuerpo.indexOf("Juan"));
  });

  it("muestra la cédula enmascarada, nunca la completa", () => {
    expect(html()).toContain("••••678");
    expect(html()).not.toContain("1012345678");
  });

  it("muestra la nota de cada lección y marca si aprobó", () => {
    expect(html()).toContain("nota ok");
    expect(html()).toContain("nota no");
  });

  it("los indicadores suman quemados, cortocircuitos y mediciones", () => {
    expect(html()).toContain("COMPONENTES QUEMADOS");
    expect(html()).toContain("CORTOCIRCUITOS");
    expect(html()).toContain("MEDICIONES");
  });

  it("una fila desplegada enseña el detalle de la lección", () => {
    const fila = contenedor.querySelector("tr.fila-estudiante")!;
    act(() => {
      fila.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const cuerpo = html();
    expect(cuerpo).toContain("Intentos de lección");
    expect(cuerpo).toContain("Reparaciones fallidas");
    expect(cuerpo).toContain("Tiempo activo");
    expect(cuerpo).toContain("Pestaña abierta");
  });

  it("el detalle enseña QUÉ opción eligió en cada intento", () => {
    const fila = contenedor.querySelector("tr.fila-estudiante")!;
    act(() => {
      fila.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const cuerpo = html();
    expect(cuerpo).toContain("El LED está montado al revés.");
    expect(cuerpo).toContain("La resistencia es de 100 kΩ.");
    expect(cuerpo).toContain("li class=\"fallo\"");
    expect(cuerpo).toContain("li class=\"acierto\"");
  });

  it("el detalle enseña los quemados por tipo", () => {
    const fila = contenedor.querySelector("tr.fila-estudiante")!;
    act(() => {
      fila.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(html()).toContain("led ×2");
  });

  it("el detalle enseña la bitácora de IA", () => {
    const fila = contenedor.querySelector("tr.fila-estudiante")!;
    act(() => {
      fila.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(html()).toContain("Bitácora de IA");
    expect(html()).toContain("me dijo 470");
  });

  it("volver a pulsar la pliega", () => {
    const fila = contenedor.querySelector("tr.fila-estudiante")!;
    act(() => fila.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(contenedor.querySelectorAll("tr.fila-detalle")).toHaveLength(1);

    act(() => fila.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(contenedor.querySelectorAll("tr.fila-detalle")).toHaveLength(0);
  });
});

describe("grupo vacío", () => {
  it("lo dice en lugar de enseñar una tabla vacía", async () => {
    montar(<PanelDocente />);
    await entrarComoDocente();
    await act(async () => {});
    expect(html()).toContain("Todavía no hay ningún estudiante");
  });

  it("los botones de exportar están deshabilitados", async () => {
    montar(<PanelDocente />);
    await entrarComoDocente();
    await act(async () => {});

    const csv = Array.from(contenedor.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("CSV resumen"),
    )!;
    expect(csv.disabled).toBe(true);
  });
});

describe("una lección recorrida de verdad llega al panel", () => {
  it("lo que el estudiante hizo aparece en el detalle del docente", async () => {
    const identidad = await construirIdentidad("Ana Ruiz Marín", "1011111111");
    await useSesion.getState().ingresar(identidad);

    const L1 = leccionPorId("l1")!;
    const leccion = useLeccion.getState();
    leccion.iniciar(L1);
    leccion.avanzar();

    useCircuito.getState().activarInstrumento("tension");
    useCircuito.getState().ponerSonda("R1:a");
    useCircuito.getState().ponerSonda("R1:b");
    useCircuito.getState().desactivarInstrumento();

    leccion.avanzar();
    const malas = L1.opciones.filter((o) => !o.correcta);
    useLeccion.getState().declararDiagnostico(malas[0]!.id);
    useLeccion.getState().declararDiagnostico(
      L1.opciones.find((o) => o.correcta)!.id,
    );
    useLeccion.getState().avanzar();

    useCircuito.getState().actualizarParams("R1", { valorOhm: 680 });
    useLeccion.getState().verificarReparacion();
    useLeccion.getState().avanzar();
    useLeccion.getState().escribirBitacora("Pregunté a una IA y se equivocó.");
    await act(async () => {
      await useLeccion.getState().finalizar();
    });

    montar(<PanelDocente />);
    await entrarComoDocente();
    await act(async () => {});

    const fila = contenedor.querySelector("tr.fila-estudiante")!;
    act(() => fila.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    const cuerpo = html();
    expect(cuerpo).toContain("Ana Ruiz Marín");
    // El diagnóstico fallido, con su texto completo.
    expect(cuerpo).toContain(malas[0]!.texto.slice(0, 30));
    expect(cuerpo).toContain("Pregunté a una IA y se equivocó.");
    // Y la nota: acertó al segundo intento, así que no es la máxima.
    expect(cuerpo).not.toContain(`>${EVALUACION.escalaMax}<`);
  });
});
