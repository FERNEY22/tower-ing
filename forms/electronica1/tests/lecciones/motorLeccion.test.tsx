/* @vitest-environment jsdom */

/* La lección a través de la interfaz: lo que ve y pulsa el estudiante. */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useCircuito } from "@/estado/circuitoStore";
import { useLeccion } from "@/estado/leccionStore";
import { useSesion } from "@/estado/sesionStore";
import { MotorLeccion } from "@/lecciones/MotorLeccion";
import { LECCION_1 } from "@/lecciones/datos/l1-codigo-colores";
import { construirIdentidad } from "@/plataforma/ingreso/identidad";
import { almacen } from "@/plataforma/almacen";
import { AlmacenMemoria } from "@/plataforma/almacen/memoria";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let contenedor: HTMLDivElement;
let raiz: Root;

function montar(ruta = "/leccion/l1"): void {
  const arbol: ReactElement = (
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/leccion/:id" element={<MotorLeccion />} />
      </Routes>
    </MemoryRouter>
  );
  act(() => {
    raiz.render(arbol);
  });
}

function html(): string {
  return contenedor.innerHTML;
}

const CORRECTA = LECCION_1.opciones.find((o) => o.correcta)!;
const INCORRECTA = LECCION_1.opciones.find((o) => !o.correcta)!;

beforeEach(async () => {
  if (almacen instanceof AlmacenMemoria) almacen.limpiar();
  useLeccion.getState().abandonar();
  useCircuito.getState().limpiar();
  useCircuito.getState().cambiarVista("esquematica");

  const identidad = await construirIdentidad("María Fernanda Gómez", "1012345678");
  await useSesion.getState().ingresar(identidad);

  contenedor = document.createElement("div");
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

describe("la lección se abre y carga su circuito", () => {
  it("muestra el título y el paso de observar", () => {
    montar();
    expect(html()).toContain("Código de colores");
    expect(html()).toContain("Observa");
  });

  it("carga el circuito con la avería sembrada", () => {
    montar();
    const r1 = useCircuito
      .getState()
      .circuito.componentes.find((c) => c.id === "R1")!;
    expect((r1.params as { valorOhm: number }).valorOhm).toBe(100000);
  });

  it("dice cuál es el síntoma", () => {
    montar();
    expect(html()).toContain("El LED no enciende");
  });

  it("una lección que todavía no existe no revienta", () => {
    montar("/leccion/l9");
    expect(html()).toContain("no existe");
  });
});

describe("el circuito no se toca hasta reparar", () => {
  it("en observar no hay paleta de componentes", () => {
    montar();
    expect(html()).not.toContain("paleta-lista");
    expect(html()).toContain("no modificarlo");
  });

  it("en observar tampoco hay multímetro", () => {
    montar();
    expect(html()).not.toContain("Usar el multímetro");
  });

  it("al pasar a medir aparece el multímetro, pero no la paleta", () => {
    montar();
    act(() => useLeccion.getState().avanzar());
    expect(html()).toContain("Usar el multímetro");
    expect(html()).not.toContain("paleta-lista");
  });

  it("la paleta solo aparece al llegar a reparar", () => {
    montar();
    act(() => useLeccion.getState().avanzar());
    act(() => useLeccion.getState().avanzar());
    act(() => useLeccion.getState().declararDiagnostico(CORRECTA.id));
    act(() => useLeccion.getState().avanzar());

    expect(html()).toContain("paleta-lista");
  });
});

describe("el paso de diagnóstico", () => {
  function llegarADiagnosticar() {
    montar();
    act(() => useLeccion.getState().avanzar());
    act(() => useLeccion.getState().avanzar());
  }

  it("presenta todas las opciones", () => {
    llegarADiagnosticar();
    for (const o of LECCION_1.opciones) {
      expect(html()).toContain(o.texto.slice(0, 40));
    }
  });

  it("una opción fallida se tacha y explica por qué no es", () => {
    llegarADiagnosticar();
    act(() => useLeccion.getState().declararDiagnostico(INCORRECTA.id));

    expect(html()).toContain("opcion descartada");
    expect(html()).toContain("explicacion mal");
  });

  it("acertar marca la opción y abre el paso siguiente", () => {
    llegarADiagnosticar();
    act(() => useLeccion.getState().declararDiagnostico(CORRECTA.id));

    expect(html()).toContain("opcion acertada");
    expect(html()).toContain("Ahora sí, a reparar");
  });

  it("sin acertar no ofrece pasar a reparar", () => {
    llegarADiagnosticar();
    act(() => useLeccion.getState().declararDiagnostico(INCORRECTA.id));
    expect(html()).not.toContain("Ahora sí, a reparar");
  });
});

describe("reparar y verificar desde la interfaz", () => {
  function llegarAReparar() {
    montar();
    act(() => useLeccion.getState().avanzar());
    act(() => useLeccion.getState().avanzar());
    act(() => useLeccion.getState().declararDiagnostico(CORRECTA.id));
    act(() => useLeccion.getState().avanzar());
  }

  it("verificar sin arreglar explica qué falta", () => {
    llegarAReparar();
    act(() => useLeccion.getState().verificarReparacion());
    expect(html()).toContain("demasiado grande");
    expect(html()).toContain("explicacion mal");
  });

  it("con 680 Ω la da por buena y ofrece continuar", () => {
    llegarAReparar();
    act(() => useCircuito.getState().actualizarParams("R1", { valorOhm: 680 }));
    act(() => useLeccion.getState().verificarReparacion());

    expect(html()).toContain("explicacion bien");
    expect(html()).toContain("Continuar");
  });
});

describe("bitácora y resultado", () => {
  function llegarABitacora() {
    montar();
    act(() => useLeccion.getState().avanzar());
    act(() => useLeccion.getState().avanzar());
    act(() => useLeccion.getState().declararDiagnostico(CORRECTA.id));
    act(() => useLeccion.getState().avanzar());
    act(() => useCircuito.getState().actualizarParams("R1", { valorOhm: 680 }));
    act(() => useLeccion.getState().verificarReparacion());
    act(() => useLeccion.getState().avanzar());
  }

  it("pregunta por la IA con las dos partes de la pregunta", () => {
    llegarABitacora();
    expect(html()).toContain("¿Consultaste alguna IA");
    expect(html()).toContain("cómo lo detectaste");
  });

  it("no deja cerrar con la bitácora vacía", () => {
    llegarABitacora();
    const boton = Array.from(contenedor.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Cerrar la lección"),
    )!;
    expect(boton.disabled).toBe(true);
  });

  it("con la bitácora escrita ya deja cerrar", () => {
    llegarABitacora();
    act(() => useLeccion.getState().escribirBitacora("No consulté ninguna IA."));

    const boton = Array.from(contenedor.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Cerrar la lección"),
    )!;
    expect(boton.disabled).toBe(false);
  });

  it("el resultado muestra la nota y el desglose por criterio", async () => {
    llegarABitacora();
    act(() => useLeccion.getState().escribirBitacora("No consulté ninguna IA."));
    await act(async () => {
      await useLeccion.getState().finalizar();
    });

    expect(html()).toContain("100");
    expect(html()).toContain("Diagnóstico");
    expect(html()).toContain("Reparación");
    expect(html()).toContain("Eficiencia");
    expect(html()).toContain("Cuidado");
    expect(html()).toContain("Experto");
  });

  it("el desglose explica cada criterio, no solo da el número", async () => {
    llegarABitacora();
    act(() => useLeccion.getState().escribirBitacora("Ninguna."));
    await act(async () => {
      await useLeccion.getState().finalizar();
    });

    expect(html()).toContain("Acertaste al primer intento");
    expect(html()).toContain("Verificaste a la primera");
  });
});
