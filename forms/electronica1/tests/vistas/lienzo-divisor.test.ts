/* =========================================================================
   PUERTA DE LA FASE 4

   Armar el divisor "a mano" —con las mismas acciones que dispara el
   estudiante al colocar y cablear en el lienzo— y obtener los mismos
   6,000 V del caso A.

   Si el resultado no coincide con el del caso A, es que el lienzo y el motor
   no estan hablando del mismo circuito.
   ========================================================================= */

import { describe, it, expect, beforeEach } from "vitest";
import { useCircuito } from "@/estado/circuitoStore";
import { tensionDe, corrienteDe } from "@/motor";
import { puntoDeClave, terminalCercano } from "@/vistas/compartido/geometria";

function lienzo() {
  return useCircuito.getState();
}

beforeEach(() => {
  useCircuito.getState().limpiar();
});

describe("armar el divisor en el lienzo", () => {
  /** Coloca y cablea el divisor del caso A, paso a paso. */
  function montarDivisor() {
    const v1 = lienzo().colocar("fuenteDC", { x: 100, y: 200 }, { tensionV: 9 });
    const r1 = lienzo().colocar("resistencia", { x: 220, y: 120 }, { valorOhm: 1000 });
    const r2 = lienzo().colocar("resistencia", { x: 340, y: 200 }, { valorOhm: 2000 });
    const gnd = lienzo().colocar("tierra", { x: 100, y: 300 });

    lienzo().conectar(`${v1}:positivo`, `${r1}:a`);
    lienzo().conectar(`${r1}:b`, `${r2}:a`);
    lienzo().conectar(`${r2}:b`, `${v1}:negativo`);
    lienzo().conectar(`${v1}:negativo`, `${gnd}:ref`);

    return { v1, r1, r2, gnd };
  }

  it("los identificadores se generan como en un esquema", () => {
    const { v1, r1, r2, gnd } = montarDivisor();
    expect(v1).toBe("V1");
    expect(r1).toBe("R1");
    expect(r2).toBe("R2");
    expect(gnd).toBe("GND1");
  });

  it("quedan cuatro componentes y cuatro cables", () => {
    montarDivisor();
    expect(lienzo().circuito.componentes).toHaveLength(4);
    expect(lienzo().circuito.cables).toHaveLength(4);
  });

  it("V(R2) = 6,000 V, igual que en el caso A", () => {
    const { r2 } = montarDivisor();
    const s = lienzo().solucion!;
    expect(s.ok).toBe(true);
    expect(tensionDe(s, r2)).toBeCloseTo(6, 6);
  });

  it("I = 3,000 mA, igual que en el caso A", () => {
    const { r1 } = montarDivisor();
    expect(corrienteDe(lienzo().solucion!, r1)).toBeCloseTo(0.003, 9);
  });

  it("no queda ningun diagnostico pendiente", () => {
    montarDivisor();
    expect(lienzo().solucion!.diagnosticos).toEqual([]);
  });

  it("el circuito se resuelve solo, sin pedirlo", () => {
    // No hay ningun boton de "simular": cada accion recalcula.
    expect(lienzo().solucion).toBeNull();
    montarDivisor();
    expect(lienzo().solucion).not.toBeNull();
  });
});

describe("el lienzo va contando lo que falta mientras se monta", () => {
  it("con la fuente sola avisa de que esta suelta", () => {
    lienzo().colocar("fuenteDC", { x: 100, y: 100 }, { tensionV: 9 });
    const s = lienzo().solucion!;
    expect(s.diagnosticos.some((d) => d.codigo === "componente-suelto")).toBe(true);
  });

  it("a medio cablear avisa del terminal que queda al aire", () => {
    const v1 = lienzo().colocar("fuenteDC", { x: 100, y: 100 }, { tensionV: 9 });
    const r1 = lienzo().colocar("resistencia", { x: 220, y: 100 }, { valorOhm: 1000 });
    lienzo().conectar(`${v1}:positivo`, `${r1}:a`);

    const s = lienzo().solucion!;
    expect(s.diagnosticos.some((d) => d.codigo === "nodo-flotante")).toBe(true);
  });

  it("al cerrar la malla desaparecen los avisos de montaje", () => {
    const v1 = lienzo().colocar("fuenteDC", { x: 100, y: 100 }, { tensionV: 9 });
    const r1 = lienzo().colocar("resistencia", { x: 220, y: 100 }, { valorOhm: 1000 });
    lienzo().conectar(`${v1}:positivo`, `${r1}:a`);
    lienzo().conectar(`${r1}:b`, `${v1}:negativo`);

    const s = lienzo().solucion!;
    expect(s.ok).toBe(true);
    expect(s.diagnosticos.some((d) => d.codigo === "componente-suelto")).toBe(false);
    expect(s.diagnosticos.some((d) => d.codigo === "nodo-flotante")).toBe(false);

    // Queda el aviso de referencia: este circuito no lleva tierra, asi que
    // el motor toma el negativo de la fuente y lo dice. Es correcto que
    // siga ahi hasta que el estudiante coloque el simbolo.
    expect(s.diagnosticos.map((d) => d.codigo)).toEqual(["sin-referencia"]);
  });

  it("colocar la tierra retira tambien ese ultimo aviso", () => {
    const v1 = lienzo().colocar("fuenteDC", { x: 100, y: 100 }, { tensionV: 9 });
    const r1 = lienzo().colocar("resistencia", { x: 220, y: 100 }, { valorOhm: 1000 });
    const gnd = lienzo().colocar("tierra", { x: 100, y: 200 });
    lienzo().conectar(`${v1}:positivo`, `${r1}:a`);
    lienzo().conectar(`${r1}:b`, `${v1}:negativo`);
    lienzo().conectar(`${v1}:negativo`, `${gnd}:ref`);

    expect(lienzo().solucion!.diagnosticos).toEqual([]);
  });
});

describe("editar el circuito ya montado", () => {
  function montarSimple() {
    const v1 = lienzo().colocar("fuenteDC", { x: 100, y: 100 }, { tensionV: 10 });
    const r1 = lienzo().colocar("resistencia", { x: 220, y: 100 }, { valorOhm: 1000 });
    lienzo().conectar(`${v1}:positivo`, `${r1}:a`);
    lienzo().conectar(`${r1}:b`, `${v1}:negativo`);
    return { v1, r1 };
  }

  it("cambiar el valor de una resistencia cambia la corriente al instante", () => {
    const { r1 } = montarSimple();
    expect(corrienteDe(lienzo().solucion!, r1)).toBeCloseTo(0.01, 9);

    lienzo().actualizarParams(r1, { valorOhm: 2000 });
    expect(corrienteDe(lienzo().solucion!, r1)).toBeCloseTo(0.005, 9);
  });

  it("cambiar la tension de la fuente tambien", () => {
    const { v1, r1 } = montarSimple();
    // 20 V sobre 1 kΩ serian 0,4 W y la resistencia por defecto es de 1/4 W:
    // para probar el cambio de tension hay que ponerle una que aguante.
    lienzo().actualizarParams(r1, { potenciaW: 2 });
    lienzo().actualizarParams(v1, { tensionV: 20 });
    expect(corrienteDe(lienzo().solucion!, r1)).toBeCloseTo(0.02, 9);
  });

  it("subir la tension por encima de lo que aguanta la quema en el lienzo", () => {
    const { v1, r1 } = montarSimple();
    lienzo().actualizarParams(v1, { tensionV: 20 }); // 0,4 W sobre una de 1/4 W

    const componente = lienzo().circuito.componentes.find((c) => c.id === r1)!;
    expect(componente.estado.quemado).toBe(true);
    expect(lienzo().quemadurasRecientes).toHaveLength(1);
    expect(Math.abs(corrienteDe(lienzo().solucion!, r1))).toBeLessThan(1e-9);
  });

  it("reemplazarla la deja como nueva, y se vuelve a quemar si no se arregla", () => {
    const { v1, r1 } = montarSimple();
    lienzo().actualizarParams(v1, { tensionV: 20 });
    expect(
      lienzo().circuito.componentes.find((c) => c.id === r1)!.estado.quemado,
    ).toBe(true);

    lienzo().reemplazar(r1);
    // Sigue habiendo 20 V sobre 1 kΩ: se quema otra vez.
    expect(
      lienzo().circuito.componentes.find((c) => c.id === r1)!.estado.quemado,
    ).toBe(true);

    // Con una de 2 W ya aguanta.
    lienzo().actualizarParams(r1, { potenciaW: 2 });
    lienzo().reemplazar(r1);
    expect(
      lienzo().circuito.componentes.find((c) => c.id === r1)!.estado.quemado,
    ).toBe(false);
  });

  it("borrar un componente se lleva sus cables", () => {
    const { r1 } = montarSimple();
    expect(lienzo().circuito.cables).toHaveLength(2);

    lienzo().eliminar(r1);
    expect(lienzo().circuito.cables).toHaveLength(0);
    expect(lienzo().circuito.componentes).toHaveLength(1);
  });

  it("borrar deselecciona", () => {
    const { r1 } = montarSimple();
    lienzo().seleccionar(r1);
    lienzo().eliminar(r1);
    expect(lienzo().seleccion).toBeNull();
  });

  it("quitar un cable deja el circuito abierto y vuelve el aviso", () => {
    montarSimple();
    lienzo().desconectar(lienzo().circuito.cables[0]!.id);
    expect(lienzo().solucion!.diagnosticos.length).toBeGreaterThan(0);
  });
});

describe("reglas del cableado", () => {
  function dosResistencias() {
    const r1 = lienzo().colocar("resistencia", { x: 100, y: 100 });
    const r2 = lienzo().colocar("resistencia", { x: 220, y: 100 });
    return { r1, r2 };
  }

  it("no se puede cablear un terminal consigo mismo", () => {
    const { r1 } = dosResistencias();
    expect(lienzo().conectar(`${r1}:a`, `${r1}:a`)).toBeNull();
    expect(lienzo().aviso).toMatch(/distintos/i);
  });

  it("no se repite un cable que ya existe", () => {
    const { r1, r2 } = dosResistencias();
    expect(lienzo().conectar(`${r1}:b`, `${r2}:a`)).not.toBeNull();
    expect(lienzo().conectar(`${r1}:b`, `${r2}:a`)).toBeNull();
    expect(lienzo().conectar(`${r2}:a`, `${r1}:b`)).toBeNull(); // ni al reves
    expect(lienzo().circuito.cables).toHaveLength(1);
  });

  it("no se cablea hacia un terminal que no existe", () => {
    const { r1 } = dosResistencias();
    expect(lienzo().conectar(`${r1}:a`, "R9:b")).toBeNull();
    expect(lienzo().aviso).toMatch(/no existe/i);
  });

  it("los dos extremos de un mismo componente si se pueden unir", () => {
    // Es un cortocircuito, y el estudiante tiene derecho a equivocarse asi.
    const { r1 } = dosResistencias();
    expect(lienzo().conectar(`${r1}:a`, `${r1}:b`)).not.toBeNull();
  });
});

describe("geometria del lienzo", () => {
  it("los componentes se pegan a la rejilla", () => {
    const id = lienzo().colocar("resistencia", { x: 103, y: 197 });
    const comp = lienzo().circuito.componentes.find((c) => c.id === id)!;
    expect(comp.posicion).toEqual({ x: 100, y: 200 });
  });

  it("los terminales caen donde se puede hacer clic", () => {
    const id = lienzo().colocar("resistencia", { x: 100, y: 100 });
    const punto = puntoDeClave(lienzo().circuito, `${id}:a`)!;
    expect(punto).toEqual({ x: 70, y: 100 });

    // Un clic a tres unidades del terminal lo captura igual.
    const capturado = terminalCercano(lienzo().circuito, { x: 72, y: 102 });
    expect(capturado?.clave).toBe(`${id}:a`);
  });

  it("rotar mueve los terminales pero no cambia el circuito electrico", () => {
    const v1 = lienzo().colocar("fuenteDC", { x: 100, y: 100 }, { tensionV: 10 });
    const r1 = lienzo().colocar("resistencia", { x: 220, y: 100 }, { valorOhm: 1000 });
    lienzo().conectar(`${v1}:positivo`, `${r1}:a`);
    lienzo().conectar(`${r1}:b`, `${v1}:negativo`);

    const antes = corrienteDe(lienzo().solucion!, r1);
    const puntoAntes = puntoDeClave(lienzo().circuito, `${r1}:a`)!;

    lienzo().rotar(r1);

    expect(puntoDeClave(lienzo().circuito, `${r1}:a`)).not.toEqual(puntoAntes);
    expect(corrienteDe(lienzo().solucion!, r1)).toBeCloseTo(antes, 12);
  });

  it("mover un componente tampoco cambia el resultado", () => {
    const v1 = lienzo().colocar("fuenteDC", { x: 100, y: 100 }, { tensionV: 10 });
    const r1 = lienzo().colocar("resistencia", { x: 220, y: 100 }, { valorOhm: 1000 });
    lienzo().conectar(`${v1}:positivo`, `${r1}:a`);
    lienzo().conectar(`${r1}:b`, `${v1}:negativo`);

    const antes = corrienteDe(lienzo().solucion!, r1);
    lienzo().mover(r1, { x: 500, y: 400 });
    expect(corrienteDe(lienzo().solucion!, r1)).toBeCloseTo(antes, 12);
  });
});
