/* @vitest-environment jsdom */

/* Que el build compile no significa que el arbol de React se monte sin
   reventar. Aqui se monta de verdad, contra un DOM.

   OJO con renderizar a cadena en lugar de montar: zustand devuelve el estado
   INICIAL en render de servidor, asi que un renderToStaticMarkup dibujaria
   siempre el lienzo vacio y estas pruebas pasarian sin comprobar nada. */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { useCircuito } from "@/estado/circuitoStore";
import { Lienzo } from "@/vistas/Lienzo";
import { MiniaturaSimbolo } from "@/vistas/esquematica/simbolos";
import { crearComponente, PLANTILLAS, type TipoComponente } from "@/motor/circuito";

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let contenedor: HTMLDivElement;
let raiz: Root;

function montar(nodo: ReactElement): string {
  act(() => {
    raiz.render(<MemoryRouter>{nodo}</MemoryRouter>);
  });
  return contenedor.innerHTML;
}

beforeEach(() => {
  useCircuito.getState().limpiar();
  contenedor = document.createElement("div");
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

describe("simbolos", () => {
  const tipos = Object.keys(PLANTILLAS) as TipoComponente[];

  for (const tipo of tipos) {
    it(`el simbolo de ${tipo} se dibuja`, () => {
      const html = montar(
        <MiniaturaSimbolo componente={crearComponente(tipo, "X1")} />,
      );
      expect(html).toContain("<svg");
      expect(html.length).toBeGreaterThan(80);
    });
  }

  it("el interruptor se dibuja distinto abierto que cerrado", () => {
    const abierto = montar(
      <MiniaturaSimbolo
        componente={crearComponente("interruptor", "S1", { cerrado: false })}
      />,
    );
    const cerrado = montar(
      <MiniaturaSimbolo
        componente={crearComponente("interruptor", "S1", { cerrado: true })}
      />,
    );
    expect(abierto).not.toBe(cerrado);
  });
});

describe("lienzo vacio", () => {
  it("se monta sin romperse", () => {
    expect(montar(<Lienzo />)).toContain("Componentes");
  });

  it("ofrece los ocho componentes de la fase 1", () => {
    const html = montar(<Lienzo />);
    for (const etiqueta of [
      "resistencia",
      "potenciómetro",
      "fuente DC",
      "interruptor",
      "diodo",
      "LED",
      "zener",
      "tierra",
    ]) {
      expect(html).toContain(etiqueta);
    }
  });

  it("no muestra diagnosticos cuando no hay nada montado", () => {
    expect(montar(<Lienzo />)).not.toContain("diagnosticos");
  });
});

describe("lienzo con el divisor montado", () => {
  function montarDivisor() {
    const s = useCircuito.getState();
    const v1 = s.colocar("fuenteDC", { x: 100, y: 200 }, { tensionV: 9 });
    const r1 = s.colocar("resistencia", { x: 220, y: 120 }, { valorOhm: 1000 });
    const r2 = s.colocar("resistencia", { x: 340, y: 200 }, { valorOhm: 2000 });
    const gnd = s.colocar("tierra", { x: 100, y: 300 });
    s.conectar(`${v1}:positivo`, `${r1}:a`);
    s.conectar(`${r1}:b`, `${r2}:a`);
    s.conectar(`${r2}:b`, `${v1}:negativo`);
    s.conectar(`${v1}:negativo`, `${gnd}:ref`);
  }

  it("dibuja un cable por cada conexion", () => {
    montarDivisor();
    const html = montar(<Lienzo />);
    expect(html.match(/class="cable"/g) ?? []).toHaveLength(4);
  });

  it("etiqueta los componentes con su referencia", () => {
    montarDivisor();
    const html = montar(<Lienzo />);
    for (const ref of ["V1", "R1", "R2"]) expect(html).toContain(ref);
  });

  it("muestra junto a cada componente la medida ya resuelta", () => {
    montarDivisor();
    // La caida de R2 del caso A, escrita como la escribe el curso.
    expect(montar(<Lienzo />)).toContain("6 V");
  });

  it("dibuja un terminal por cada terminal del circuito", () => {
    montarDivisor();
    const html = montar(<Lienzo />);
    // 3 componentes de 2 terminales + la tierra de 1 = 7
    expect(html.match(/class="terminal[^"]*"/g) ?? []).toHaveLength(7);
  });

  it("dibuja punto de union donde confluyen tres conexiones", () => {
    montarDivisor();
    const html = montar(<Lienzo />);
    // En V1:negativo se juntan el retorno de R2 y el cable de tierra: son
    // tres conexiones contando el propio borne, y ahi va el punto.
    expect(html.match(/class="union"/g) ?? []).toHaveLength(1);
  });

  it("añadir una rama mas crea otro punto de union", () => {
    montarDivisor();
    const s = useCircuito.getState();
    const extra = s.colocar("resistencia", { x: 340, y: 340 }, { valorOhm: 470 });
    s.conectar("R1:b", `${extra}:a`);

    const html = montar(<Lienzo />);
    expect(html.match(/class="union"/g) ?? []).toHaveLength(2);
  });

  it("una union de solo dos terminales no lleva punto", () => {
    const s = useCircuito.getState();
    const v1 = s.colocar("fuenteDC", { x: 100, y: 100 }, { tensionV: 9 });
    const r1 = s.colocar("resistencia", { x: 220, y: 100 }, { valorOhm: 1000 });
    s.conectar(`${v1}:positivo`, `${r1}:a`);
    s.conectar(`${r1}:b`, `${v1}:negativo`);

    const html = montar(<Lienzo />);
    expect(html.match(/class="union"/g) ?? []).toHaveLength(0);
  });
});

describe("lienzo a medio montar", () => {
  it("saca el aviso del terminal al aire", () => {
    const s = useCircuito.getState();
    const v1 = s.colocar("fuenteDC", { x: 100, y: 100 }, { tensionV: 9 });
    const r1 = s.colocar("resistencia", { x: 220, y: 100 }, { valorOhm: 1000 });
    s.conectar(`${v1}:positivo`, `${r1}:a`);

    expect(montar(<Lienzo />)).toContain("terminal al aire");
  });

  it("saca el cortocircuito y lo marca como error, no como aviso", () => {
    const s = useCircuito.getState();
    const v1 = s.colocar("fuenteDC", { x: 100, y: 100 }, { tensionV: 9 });
    const r1 = s.colocar("resistencia", { x: 220, y: 100 }, { valorOhm: 1000 });
    s.conectar(`${v1}:positivo`, `${r1}:a`);
    s.conectar(`${r1}:b`, `${v1}:negativo`);
    s.conectar(`${v1}:positivo`, `${v1}:negativo`);

    const html = montar(<Lienzo />);
    expect(html).toContain("Cortocircuito en la fuente");
    expect(html).toContain('class="diag error"');
  });

  it("ningun mensaje que ve el estudiante lleva jerga de solver", () => {
    const s = useCircuito.getState();
    s.colocar("led", { x: 100, y: 100 });
    const html = montar(<Lienzo />);
    expect(html).not.toMatch(/matriz|singular|Newton|gmin|NaN|undefined/);
  });
});

describe("inspector", () => {
  it("aparece al seleccionar y trae los campos del tipo", () => {
    const s = useCircuito.getState();
    const r1 = s.colocar("resistencia", { x: 100, y: 100 }, { valorOhm: 470 });
    s.seleccionar(r1);

    const html = montar(<Lienzo />);
    expect(html).toContain("Potencia nominal");
    expect(html).toContain("470 Ω");
  });

  it("un LED trae su selector de color, no un campo de ohmios", () => {
    const s = useCircuito.getState();
    const led = s.colocar("led", { x: 100, y: 100 }, { color: "verde" });
    s.seleccionar(led);

    const html = montar(<Lienzo />);
    expect(html).toContain("Verde · 2,1 V");
    expect(html).not.toContain("Potencia nominal");
  });

  it("el potenciometro trae el deslizador del cursor", () => {
    const s = useCircuito.getState();
    const p = s.colocar("potenciometro", { x: 100, y: 100 });
    s.seleccionar(p);

    const html = montar(<Lienzo />);
    expect(html).toContain('type="range"');
    expect(html).toContain("50 %");
  });

  it("muestra las tres medidas del componente seleccionado", () => {
    const s = useCircuito.getState();
    const v1 = s.colocar("fuenteDC", { x: 100, y: 100 }, { tensionV: 10 });
    const r1 = s.colocar("resistencia", { x: 220, y: 100 }, { valorOhm: 1000 });
    s.conectar(`${v1}:positivo`, `${r1}:a`);
    s.conectar(`${r1}:b`, `${v1}:negativo`);
    s.seleccionar(r1);

    const html = montar(<Lienzo />);
    expect(html).toContain("Tensión");
    expect(html).toContain("Corriente");
    expect(html).toContain("Potencia");
    expect(html).toContain("10,0000 V");
  });
});

describe("el lienzo reacciona a los cambios del store", () => {
  it("colocar un componente lo hace aparecer sin volver a montar", () => {
    montar(<Lienzo />);
    expect(contenedor.innerHTML).not.toContain("R1");

    act(() => {
      useCircuito.getState().colocar("resistencia", { x: 100, y: 100 });
    });
    expect(contenedor.innerHTML).toContain("R1");
  });

  it("mover el cursor del potenciometro cambia la medida en pantalla", () => {
    const s = useCircuito.getState();
    const v1 = s.colocar("fuenteDC", { x: 100, y: 100 }, { tensionV: 10 });
    const p1 = s.colocar("potenciometro", { x: 260, y: 100 }, { totalOhm: 10000 });
    s.conectar(`${v1}:positivo`, `${p1}:a`);
    s.conectar(`${p1}:cursor`, `${v1}:negativo`);
    s.seleccionar(p1);

    montar(<Lienzo />);
    const antes = contenedor.innerHTML;

    act(() => {
      useCircuito.getState().actualizarParams(p1, { cursor: 0.9 });
    });
    expect(contenedor.innerHTML).not.toBe(antes);
    expect(contenedor.innerHTML).toContain("90 %");
  });
});
