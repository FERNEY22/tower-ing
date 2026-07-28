/* @vitest-environment jsdom */

/* El multimetro y el quemado, a traves de la interfaz: lo que hace el
   estudiante, no lo que hace el motor. */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { useCircuito } from "@/estado/circuitoStore";
import { Lienzo } from "@/vistas/Lienzo";

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

/** Divisor del caso A, montado con las acciones del lienzo. */
function montarDivisor() {
  const s = useCircuito.getState();
  const v1 = s.colocar("fuenteDC", { x: 120, y: 220 }, { tensionV: 9 });
  const r1 = s.colocar("resistencia", { x: 260, y: 140 }, { valorOhm: 1000 });
  const r2 = s.colocar("resistencia", { x: 400, y: 220 }, { valorOhm: 2000 });
  const gnd = s.colocar("tierra", { x: 120, y: 340 });
  s.conectar(`${v1}:positivo`, `${r1}:a`);
  s.conectar(`${r1}:b`, `${r2}:a`);
  s.conectar(`${r2}:b`, `${v1}:negativo`);
  s.conectar(`${v1}:negativo`, `${gnd}:ref`);
  return { v1, r1, r2, gnd };
}

beforeEach(() => {
  useCircuito.getState().limpiar();
  useCircuito.getState().cambiarVista("esquematica");
  contenedor = document.createElement("div");
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

describe("el multimetro en el panel", () => {
  it("empieza guardado", () => {
    montar(<Lienzo />);
    expect(html()).toContain("Usar el multímetro");
    expect(html()).not.toContain("dmm-pantalla");
  });

  it("al sacarlo muestra la pantalla y los tres modos", () => {
    montar(<Lienzo />);
    act(() => useCircuito.getState().activarInstrumento("tension"));
    expect(html()).toContain("dmm-pantalla");
    expect(html()).toContain("Tensión (V)");
  });

  it("la pantalla arranca en blanco", () => {
    montar(<Lienzo />);
    act(() => useCircuito.getState().activarInstrumento("tension"));
    expect(html()).toContain("— — —");
  });
});

describe("medir tension apoyando las dos puntas", () => {
  it("la primera punta sola no da lectura", () => {
    const { r2 } = montarDivisor();
    montar(<Lienzo />);
    act(() => useCircuito.getState().activarInstrumento("tension"));
    act(() => useCircuito.getState().ponerSonda(`${r2}:a`));

    expect(useCircuito.getState().instrumento.lectura).toBeNull();
    expect(html()).toContain("— — —");
  });

  it("con las dos puntas lee los 6 V del caso A", () => {
    const { r2 } = montarDivisor();
    montar(<Lienzo />);
    act(() => useCircuito.getState().activarInstrumento("tension"));
    act(() => useCircuito.getState().ponerSonda(`${r2}:a`));
    act(() => useCircuito.getState().ponerSonda(`${r2}:b`));

    const lectura = useCircuito.getState().instrumento.lectura!;
    expect(lectura.valido).toBe(true);
    expect(lectura.valor!).toBeCloseTo(6, 3);
    expect(html()).toContain("6 V");
  });

  it("las puntas se dibujan en el lienzo", () => {
    const { r2 } = montarDivisor();
    montar(<Lienzo />);
    act(() => useCircuito.getState().activarInstrumento("tension"));
    act(() => useCircuito.getState().ponerSonda(`${r2}:a`));
    expect(contenedor.querySelectorAll("g.sonda").length).toBe(1);

    act(() => useCircuito.getState().ponerSonda(`${r2}:b`));
    expect(contenedor.querySelectorAll("g.sonda").length).toBe(2);
  });

  it("una tercera punta empieza una medida nueva", () => {
    const { r1, r2 } = montarDivisor();
    montar(<Lienzo />);
    act(() => useCircuito.getState().activarInstrumento("tension"));
    act(() => useCircuito.getState().ponerSonda(`${r2}:a`));
    act(() => useCircuito.getState().ponerSonda(`${r2}:b`));
    act(() => useCircuito.getState().ponerSonda(`${r1}:a`));

    const i = useCircuito.getState().instrumento;
    expect(i.sondaA).toBe(`${r1}:a`);
    expect(i.sondaB).toBeNull();
    expect(i.lectura).toBeNull();
  });

  it("cambiar de modo obliga a volver a poner las puntas", () => {
    const { r2 } = montarDivisor();
    montar(<Lienzo />);
    act(() => useCircuito.getState().activarInstrumento("tension"));
    act(() => useCircuito.getState().ponerSonda(`${r2}:a`));
    act(() => useCircuito.getState().ponerSonda(`${r2}:b`));
    act(() => useCircuito.getState().cambiarModoInstrumento("resistencia"));

    const i = useCircuito.getState().instrumento;
    expect(i.sondaA).toBeNull();
    expect(i.lectura).toBeNull();
  });
});

describe("el amperimetro y sus dos formas de conectarlo", () => {
  it("en serie, abriendo un cable, lee los 3 mA", () => {
    montarDivisor();
    montar(<Lienzo />);
    act(() => useCircuito.getState().activarInstrumento("corriente"));

    const cable = useCircuito.getState().circuito.cables[1]!; // R1:b → R2:a
    act(() => useCircuito.getState().medirEnCable(cable.id));

    const lectura = useCircuito.getState().instrumento.lectura!;
    expect(lectura.valido).toBe(true);
    expect(Math.abs(lectura.valor!)).toBeCloseTo(0.003, 5);
    expect(lectura.cortocircuito).toBeUndefined();
  });

  it("en paralelo, con las dos puntas, avisa del cortocircuito", () => {
    const { r2 } = montarDivisor();
    montar(<Lienzo />);
    act(() => useCircuito.getState().activarInstrumento("corriente"));
    act(() => useCircuito.getState().ponerSonda(`${r2}:a`));
    act(() => useCircuito.getState().ponerSonda(`${r2}:b`));

    const lectura = useCircuito.getState().instrumento.lectura!;
    expect(lectura.cortocircuito).toBe(true);
    expect(html()).toContain("en serie");
    expect(html()).toContain("dmm-advertencia grave");
  });

  it("no impide el error: lo hace y lo enseña", () => {
    const { r2 } = montarDivisor();
    montar(<Lienzo />);
    act(() => useCircuito.getState().activarInstrumento("corriente"));
    act(() => useCircuito.getState().ponerSonda(`${r2}:a`));
    act(() => useCircuito.getState().ponerSonda(`${r2}:b`));

    // La lectura existe y es absurdamente alta, como en el laboratorio.
    const lectura = useCircuito.getState().instrumento.lectura!;
    expect(lectura.valido).toBe(true);
    expect(Math.abs(lectura.valor!)).toBeGreaterThan(0.008);
  });

  it("con el amperimetro en la mano los cables se marcan como medibles", () => {
    montarDivisor();
    montar(<Lienzo />);
    expect(contenedor.querySelectorAll("path.cable.medible")).toHaveLength(0);

    act(() => useCircuito.getState().activarInstrumento("corriente"));
    expect(
      contenedor.querySelectorAll("path.cable.medible").length,
    ).toBeGreaterThan(0);
  });
});

describe("el ohmimetro se niega con el circuito alimentado", () => {
  it("no mide si hay fuente conectada", () => {
    const { r2 } = montarDivisor();
    montar(<Lienzo />);
    act(() => useCircuito.getState().activarInstrumento("resistencia"));
    act(() => useCircuito.getState().ponerSonda(`${r2}:a`));
    act(() => useCircuito.getState().ponerSonda(`${r2}:b`));

    expect(useCircuito.getState().instrumento.lectura!.valido).toBe(false);
    expect(html()).toContain("Desconecta");
  });

  it("mide bien sin fuente", () => {
    const s = useCircuito.getState();
    const r1 = s.colocar("resistencia", { x: 200, y: 200 }, { valorOhm: 470 });
    const r2 = s.colocar("resistencia", { x: 340, y: 200 }, { valorOhm: 1000 });
    s.conectar(`${r1}:b`, `${r2}:a`);

    montar(<Lienzo />);
    act(() => useCircuito.getState().activarInstrumento("resistencia"));
    act(() => useCircuito.getState().ponerSonda(`${r1}:a`));
    act(() => useCircuito.getState().ponerSonda(`${r2}:b`));

    expect(useCircuito.getState().instrumento.lectura!.valor!).toBeCloseTo(
      1470,
      0,
    );
  });
});

describe("el multimetro no estorba al cableado", () => {
  it("con el instrumento activo, pinchar un terminal no empieza un cable", () => {
    const { r1 } = montarDivisor();
    montar(<Lienzo />);
    act(() => useCircuito.getState().activarInstrumento("tension"));
    act(() => useCircuito.getState().ponerSonda(`${r1}:a`));

    expect(useCircuito.getState().cableDesde).toBeNull();
  });

  it("guardarlo devuelve el lienzo a su estado normal", () => {
    montarDivisor();
    montar(<Lienzo />);
    act(() => useCircuito.getState().activarInstrumento("corriente"));
    act(() => useCircuito.getState().desactivarInstrumento());

    expect(html()).toContain("Usar el multímetro");
    expect(contenedor.querySelectorAll("g.sonda")).toHaveLength(0);
  });
});

describe("quemado en el lienzo", () => {
  /** LED sin resistencia limitadora: la averia de la leccion 2. */
  function montarLedSinLimitadora() {
    const s = useCircuito.getState();
    const v1 = s.colocar("fuenteDC", { x: 120, y: 220 }, { tensionV: 5 });
    const led = s.colocar("led", { x: 300, y: 220 }, { color: "rojo" });
    const gnd = s.colocar("tierra", { x: 120, y: 340 });
    s.conectar(`${v1}:positivo`, `${led}:anodo`);
    s.conectar(`${led}:catodo`, `${v1}:negativo`);
    s.conectar(`${v1}:negativo`, `${gnd}:ref`);
    return { v1, led, gnd };
  }

  it("el LED se quema al cerrar el circuito", () => {
    const { led } = montarLedSinLimitadora();
    montar(<Lienzo />);

    expect(
      useCircuito.getState().circuito.componentes.find((c) => c.id === led)!
        .estado.quemado,
    ).toBe(true);
  });

  it("sale el humo en el lienzo", () => {
    montarLedSinLimitadora();
    montar(<Lienzo />);
    expect(contenedor.querySelectorAll("g.humo").length).toBe(1);
  });

  it("el aviso explica que paso y ofrece reemplazarlo", () => {
    montarLedSinLimitadora();
    montar(<Lienzo />);
    expect(html()).toContain("Se quemó");
    expect(html()).toContain("resistencia limitadora");
    expect(html()).toContain("Reemplazar");
  });

  it("el humo se ve tambien en la vista fisica", () => {
    montarLedSinLimitadora();
    montar(<Lienzo />);
    act(() => useCircuito.getState().cambiarVista("fisica"));
    expect(contenedor.querySelectorAll("g.humo").length).toBe(1);
  });

  it("con su resistencia de 330 Ω no se quema y luce", () => {
    const s = useCircuito.getState();
    const v1 = s.colocar("fuenteDC", { x: 120, y: 220 }, { tensionV: 5 });
    const r1 = s.colocar("resistencia", { x: 260, y: 140 }, { valorOhm: 330 });
    const led = s.colocar("led", { x: 400, y: 220 }, { color: "rojo" });
    const gnd = s.colocar("tierra", { x: 120, y: 340 });
    s.conectar(`${v1}:positivo`, `${r1}:a`);
    s.conectar(`${r1}:b`, `${led}:anodo`);
    s.conectar(`${led}:catodo`, `${v1}:negativo`);
    s.conectar(`${v1}:negativo`, `${gnd}:ref`);

    montar(<Lienzo />);
    expect(contenedor.querySelectorAll("g.humo")).toHaveLength(0);
    act(() => useCircuito.getState().cambiarVista("fisica"));
    expect(html()).toMatch(/encendido al \d+ %/);
  });
});
