/* @vitest-environment jsdom */

/* =========================================================================
   PUERTA DE LA FASE 5

   Alternar entre las dos vistas mil veces sin que nada se descoloque.

   La especificacion es tajante: un unico modelo, dos renderizadores que lo
   leen, nunca dos modelos sincronizandose. Estas pruebas comprueban que eso
   se cumple de verdad y no solo sobre el papel.
   ========================================================================= */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { useCircuito } from "@/estado/circuitoStore";
import { Lienzo } from "@/vistas/Lienzo";
import { todosLosAnclajes } from "@/vistas/compartido/geometria";
import { corrienteDe, tensionDe } from "@/motor";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let contenedor: HTMLDivElement;
let raiz: Root;

function montar(nodo: ReactElement): void {
  act(() => {
    raiz.render(<MemoryRouter>{nodo}</MemoryRouter>);
  });
}

/** El circuito de la leccion 2: fuente, resistencia y LED. */
function montarCircuito() {
  const s = useCircuito.getState();
  const v1 = s.colocar("fuenteDC", { x: 120, y: 220 }, { tensionV: 5 });
  const r1 = s.colocar("resistencia", { x: 260, y: 140 }, { valorOhm: 330 });
  const d1 = s.colocar("led", { x: 400, y: 220 }, { color: "rojo" });
  const gnd = s.colocar("tierra", { x: 120, y: 340 });

  s.conectar(`${v1}:positivo`, `${r1}:a`);
  s.conectar(`${r1}:b`, `${d1}:anodo`);
  s.conectar(`${d1}:catodo`, `${v1}:negativo`);
  s.conectar(`${v1}:negativo`, `${gnd}:ref`);

  return { v1, r1, d1, gnd };
}

/** Posiciones de todos los terminales, como cadena comparable. */
function huellaDeAnclajes(): string {
  return todosLosAnclajes(useCircuito.getState().circuito)
    .map((a) => `${a.clave}@${a.punto.x},${a.punto.y}`)
    .sort()
    .join("|");
}

beforeEach(() => {
  useCircuito.getState().limpiar();
  // limpiar() vacia el circuito pero NO cambia de vista: vaciar el lienzo no
  // tiene por que sacar al estudiante de donde estaba mirando. Como esa
  // eleccion sobrevive, cada prueba fija su punto de partida.
  useCircuito.getState().cambiarVista("esquematica");
  contenedor = document.createElement("div");
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

describe("alternar entre las dos vistas", () => {
  it("mil cambios de vista no mueven un solo terminal", () => {
    montarCircuito();
    const antes = huellaDeAnclajes();

    for (let i = 0; i < 1000; i++) {
      act(() => useCircuito.getState().cambiarVista());
    }

    expect(huellaDeAnclajes()).toBe(antes);
  });

  it("mil cambios de vista dejan el circuito exactamente igual", () => {
    const { r1 } = montarCircuito();
    const circuitoAntes = JSON.stringify(useCircuito.getState().circuito);
    const corrienteAntes = corrienteDe(useCircuito.getState().solucion!, r1);

    for (let i = 0; i < 1000; i++) {
      act(() => useCircuito.getState().cambiarVista());
    }

    expect(JSON.stringify(useCircuito.getState().circuito)).toBe(circuitoAntes);
    expect(corrienteDe(useCircuito.getState().solucion!, r1)).toBe(corrienteAntes);
  });

  it("termina en la vista de partida tras un numero par de cambios", () => {
    montarCircuito();
    const inicial = useCircuito.getState().vista;
    for (let i = 0; i < 1000; i++) {
      act(() => useCircuito.getState().cambiarVista());
    }
    expect(useCircuito.getState().vista).toBe(inicial);
  });
});

describe("las dos vistas dibujan lo mismo, con distinto aspecto", () => {
  function terminalesDibujados(): string[] {
    return Array.from(contenedor.querySelectorAll("circle.terminal")).map(
      (c) => `${c.getAttribute("cx")},${c.getAttribute("cy")}`,
    );
  }

  function cablesDibujados(): string[] {
    return Array.from(contenedor.querySelectorAll("path.cable")).map(
      (p) => p.getAttribute("d") ?? "",
    );
  }

  it("los terminales caen en los mismos puntos en las dos", () => {
    montarCircuito();
    montar(<Lienzo />);
    const enEsquematica = terminalesDibujados();

    act(() => useCircuito.getState().cambiarVista("fisica"));
    expect(terminalesDibujados()).toEqual(enEsquematica);
  });

  it("los cables se trazan igual en las dos", () => {
    montarCircuito();
    montar(<Lienzo />);
    const enEsquematica = cablesDibujados();

    act(() => useCircuito.getState().cambiarVista("fisica"));
    expect(cablesDibujados()).toEqual(enEsquematica);
    expect(enEsquematica).toHaveLength(4);
  });

  it("las medidas mostradas son las mismas", () => {
    const { r1 } = montarCircuito();
    montar(<Lienzo />);
    const s = useCircuito.getState().solucion!;
    expect(s.ok).toBe(true);

    const esperado = tensionDe(s, r1).toFixed(3);
    act(() => useCircuito.getState().cambiarVista("fisica"));
    expect(useCircuito.getState().solucion!).toBe(s); // ni se recalculo
    expect(tensionDe(useCircuito.getState().solucion!, r1).toFixed(3)).toBe(esperado);
  });

  it("pero el dibujo SI cambia: no es la misma vista con otro nombre", () => {
    montarCircuito();
    montar(<Lienzo />);
    const esquematica = contenedor.querySelector(".lienzo-svg")!.innerHTML;

    act(() => useCircuito.getState().cambiarVista("fisica"));
    const fisica = contenedor.querySelector(".lienzo-svg")!.innerHTML;

    expect(fisica).not.toBe(esquematica);
  });

  it("la esquematica lleva puntos de union y la fisica no", () => {
    montarCircuito();
    montar(<Lienzo />);
    act(() => useCircuito.getState().cambiarVista("esquematica"));
    expect(contenedor.querySelectorAll("circle.union").length).toBeGreaterThan(0);

    act(() => useCircuito.getState().cambiarVista("fisica"));
    expect(contenedor.querySelectorAll("circle.union")).toHaveLength(0);
  });
});

describe("editar en una vista se ve en la otra", () => {
  it("mover un componente en la fisica lo mueve tambien en la esquematica", () => {
    const { r1 } = montarCircuito();
    montar(<Lienzo />);
    act(() => useCircuito.getState().cambiarVista("fisica"));
    act(() => useCircuito.getState().mover(r1, { x: 500, y: 400 }));

    const enFisica = huellaDeAnclajes();
    act(() => useCircuito.getState().cambiarVista("esquematica"));
    expect(huellaDeAnclajes()).toBe(enFisica);
  });

  it("rotar en una vista se refleja en la otra", () => {
    const { r1 } = montarCircuito();
    montar(<Lienzo />);
    act(() => useCircuito.getState().rotar(r1));
    const rotacion = useCircuito
      .getState()
      .circuito.componentes.find((c) => c.id === r1)!.rotacion;

    act(() => useCircuito.getState().cambiarVista("fisica"));
    expect(
      useCircuito.getState().circuito.componentes.find((c) => c.id === r1)!
        .rotacion,
    ).toBe(rotacion);
  });

  it("cablear en la fisica cierra el circuito igual que en la esquematica", () => {
    const s = useCircuito.getState();
    const v1 = s.colocar("fuenteDC", { x: 120, y: 200 }, { tensionV: 10 });
    const r1 = s.colocar("resistencia", { x: 260, y: 200 }, { valorOhm: 1000 });
    s.conectar(`${v1}:positivo`, `${r1}:a`);

    montar(<Lienzo />);
    act(() => useCircuito.getState().cambiarVista("fisica"));
    act(() => {
      useCircuito.getState().conectar(`${r1}:b`, `${v1}:negativo`);
    });

    expect(corrienteDe(useCircuito.getState().solucion!, r1)).toBeCloseTo(0.01, 9);
  });
});

describe("lo que la vista fisica enseña y la esquematica no", () => {
  it("la resistencia muestra sus bandas, calculadas de su valor", () => {
    const s = useCircuito.getState();
    s.colocar("resistencia", { x: 200, y: 200 }, { valorOhm: 1000 });
    montar(<Lienzo />);
    act(() => useCircuito.getState().cambiarVista("fisica"));

    const svg = contenedor.querySelector(".lienzo-svg")!.innerHTML;
    expect(svg).toContain("marrón, negro, rojo");
    // Y los colores estan realmente dibujados, no solo en el texto.
    expect(svg).toContain("#6b4423"); // marrón
    expect(svg).toContain("#1c1c1c"); // negro
    expect(svg).toContain("#c62828"); // rojo
  });

  it("cambiar el valor cambia las bandas", () => {
    const s = useCircuito.getState();
    const r = s.colocar("resistencia", { x: 200, y: 200 }, { valorOhm: 1000 });
    montar(<Lienzo />);
    act(() => useCircuito.getState().cambiarVista("fisica"));

    act(() => useCircuito.getState().actualizarParams(r, { valorOhm: 470 }));
    expect(contenedor.querySelector(".lienzo-svg")!.innerHTML).toContain(
      "amarillo, violeta, marrón",
    );
  });

  it("el LED dice donde tiene el catodo", () => {
    const s = useCircuito.getState();
    s.colocar("led", { x: 200, y: 200 }, { color: "verde" });
    montar(<Lienzo />);
    act(() => useCircuito.getState().cambiarVista("fisica"));

    expect(contenedor.querySelector(".lienzo-svg")!.innerHTML).toContain(
      "cara plana y pata corta en el cátodo",
    );
  });

  it("el LED se enciende cuando circula corriente", () => {
    montarCircuito();
    montar(<Lienzo />);
    act(() => useCircuito.getState().cambiarVista("fisica"));

    expect(contenedor.querySelector(".lienzo-svg")!.innerHTML).toMatch(
      /encendido al \d+ %/,
    );
  });

  it("y se queda apagado si el circuito esta abierto", () => {
    const { d1, v1 } = montarCircuito();
    act(() => {
      const cables = useCircuito.getState().circuito.cables;
      useCircuito.getState().desconectar(cables[0]!.id);
    });
    montar(<Lienzo />);
    act(() => useCircuito.getState().cambiarVista("fisica"));

    expect(contenedor.querySelector(".lienzo-svg")!.innerHTML).toContain(
      "apagado",
    );
    expect(d1).toBeTruthy();
    expect(v1).toBeTruthy();
  });

  it("el diodo señala su franja de catodo", () => {
    const s = useCircuito.getState();
    s.colocar("diodo", { x: 200, y: 200 });
    montar(<Lienzo />);
    act(() => useCircuito.getState().cambiarVista("fisica"));

    expect(contenedor.querySelector(".lienzo-svg")!.innerHTML).toContain(
      "la franja clara es el cátodo",
    );
  });

  it("el zener se distingue del diodo comun", () => {
    const s = useCircuito.getState();
    s.colocar("diodo", { x: 200, y: 200 });
    s.colocar("zener", { x: 400, y: 200 });
    montar(<Lienzo />);
    act(() => useCircuito.getState().cambiarVista("fisica"));

    const svg = contenedor.querySelector(".lienzo-svg")!.innerHTML;
    expect(svg).toContain("cuerpo de vidrio");
    expect(svg).toContain("#b5701f"); // ambar del zener
    expect(svg).toContain("#232323"); // negro del diodo comun
  });

  it("el potenciometro enseña la posicion real del mando", () => {
    const s = useCircuito.getState();
    const p = s.colocar("potenciometro", { x: 200, y: 200 }, { cursor: 0.25 });
    montar(<Lienzo />);
    act(() => useCircuito.getState().cambiarVista("fisica"));

    const svg = contenedor.querySelector(".lienzo-svg")!.innerHTML;
    expect(svg).toContain("cursor al 25 %");
    expect(svg).toContain("rotate(-67.5)"); // −135° + 0,25 × 270°

    act(() => useCircuito.getState().actualizarParams(p, { cursor: 1 }));
    expect(contenedor.querySelector(".lienzo-svg")!.innerHTML).toContain(
      "rotate(135)",
    );
  });
});
