/* =========================================================================
   PUERTA DE LA FASE 9

   Guardar un circuito, recuperarlo tal cual y que siga siendo editable y
   resoluble. No se guarda una captura: se guarda el circuito.
   ========================================================================= */

import { describe, it, expect, beforeEach } from "vitest";
import { useCircuito } from "@/estado/circuitoStore";
import { usePractica } from "@/estado/practicaStore";
import { useSesion } from "@/estado/sesionStore";
import { construirIdentidad } from "@/plataforma/ingreso/identidad";
import { almacen } from "@/plataforma/almacen";
import { AlmacenMemoria } from "@/plataforma/almacen/memoria";
import { hashCircuito } from "@/exportacion/hashCircuito";
import { corrienteDe, tensionDe } from "@/motor";

function lienzo() {
  return useCircuito.getState();
}
function practica() {
  return usePractica.getState();
}

/** El divisor del caso A, montado con las acciones del lienzo. */
function montarDivisor() {
  const v1 = lienzo().colocar("fuenteDC", { x: 120, y: 220 }, { tensionV: 9 });
  const r1 = lienzo().colocar("resistencia", { x: 260, y: 140 }, { valorOhm: 1000 });
  const r2 = lienzo().colocar("resistencia", { x: 400, y: 220 }, { valorOhm: 2000 });
  const gnd = lienzo().colocar("tierra", { x: 120, y: 340 });
  lienzo().conectar(`${v1}:positivo`, `${r1}:a`);
  lienzo().conectar(`${r1}:b`, `${r2}:a`);
  lienzo().conectar(`${r2}:b`, `${v1}:negativo`);
  lienzo().conectar(`${v1}:negativo`, `${gnd}:ref`);
  return { v1, r1, r2, gnd };
}

beforeEach(async () => {
  if (almacen instanceof AlmacenMemoria) almacen.limpiar();
  useCircuito.getState().limpiar();
  usePractica.setState({ guardados: [], error: null, aviso: null });

  const identidad = await construirIdentidad("María Fernanda Gómez", "1012345678");
  await useSesion.getState().ingresar(identidad);
});

describe("guardar un circuito", () => {
  it("queda en la lista con su nombre y su huella", async () => {
    montarDivisor();
    await practica().guardar("Divisor de prueba");

    expect(practica().guardados).toHaveLength(1);
    const g = practica().guardados[0]!;
    expect(g.nombre).toBe("Divisor de prueba");
    expect(g.hash).toBe(await hashCircuito(lienzo().circuito));
  });

  it("un nombre vacío no impide guardar", async () => {
    montarDivisor();
    await practica().guardar("   ");
    expect(practica().guardados[0]!.nombre).toBe("Sin título");
  });

  it("el lienzo vacío no se guarda, y lo dice", async () => {
    await practica().guardar("Nada");
    expect(practica().guardados).toHaveLength(0);
    expect(practica().error).toMatch(/vacío/i);
  });

  it("confirma con un aviso que incluye la huella", async () => {
    montarDivisor();
    await practica().guardar("Divisor");
    expect(practica().aviso).toContain("Divisor");
    expect(practica().aviso).toContain(practica().guardados[0]!.hash);
  });

  it("se pueden guardar varios y salen del más reciente al más antiguo", async () => {
    montarDivisor();
    await practica().guardar("Primero");
    lienzo().actualizarParams("R2", { valorOhm: 4700 });
    await practica().guardar("Segundo");

    expect(practica().guardados).toHaveLength(2);
    expect(practica().guardados[0]!.ts).toBeGreaterThanOrEqual(
      practica().guardados[1]!.ts,
    );
  });
});

describe("recuperar un circuito", () => {
  it("vuelve exactamente el mismo circuito", async () => {
    montarDivisor();
    const original = JSON.stringify(lienzo().circuito);
    await practica().guardar("Divisor");

    lienzo().limpiar();
    expect(lienzo().circuito.componentes).toHaveLength(0);

    practica().recuperar(practica().guardados[0]!.hash);
    expect(JSON.stringify(lienzo().circuito)).toBe(original);
  });

  it("y sigue resolviéndose: da los 6 V del caso A", async () => {
    montarDivisor();
    await practica().guardar("Divisor");
    lienzo().limpiar();
    practica().recuperar(practica().guardados[0]!.hash);

    expect(lienzo().solucion!.ok).toBe(true);
    expect(tensionDe(lienzo().solucion!, "R2")).toBeCloseTo(6, 6);
    expect(corrienteDe(lienzo().solucion!, "R1")).toBeCloseTo(0.003, 9);
  });

  it("y sigue siendo editable: no es una captura", async () => {
    montarDivisor();
    await practica().guardar("Divisor");
    lienzo().limpiar();
    practica().recuperar(practica().guardados[0]!.hash);

    lienzo().actualizarParams("R2", { valorOhm: 1000 });
    expect(tensionDe(lienzo().solucion!, "R2")).toBeCloseTo(4.5, 4);

    const nuevo = lienzo().colocar("led", { x: 600, y: 300 });
    expect(lienzo().circuito.componentes.find((c) => c.id === nuevo)).toBeDefined();
  });

  it("recuperar una huella que no existe no rompe nada", async () => {
    montarDivisor();
    const antes = JSON.stringify(lienzo().circuito);
    practica().recuperar("NOEXISTE");
    expect(JSON.stringify(lienzo().circuito)).toBe(antes);
  });

  it("recuperar deja el multímetro y los contadores como nuevos", async () => {
    montarDivisor();
    await practica().guardar("Divisor");

    lienzo().activarInstrumento("tension");
    lienzo().ponerSonda("R2:a");
    lienzo().ponerSonda("R2:b");
    expect(lienzo().contadores.mediciones).toBe(1);

    practica().recuperar(practica().guardados[0]!.hash);
    expect(lienzo().instrumento.activo).toBe(false);
    expect(lienzo().contadores.mediciones).toBe(0);
  });
});

describe("los circuitos son de cada estudiante", () => {
  it("otro estudiante no ve los circuitos del primero", async () => {
    montarDivisor();
    await practica().guardar("Divisor de María");
    expect(practica().guardados).toHaveLength(1);

    await useSesion.getState().salir();
    const otro = await construirIdentidad("Juan Pérez Rojas", "1098765432");
    await useSesion.getState().ingresar(otro);

    await practica().refrescar();
    expect(practica().guardados).toHaveLength(0);
  });

  it("sin sesión iniciada no se guarda nada", async () => {
    montarDivisor();
    await useSesion.getState().salir();
    await practica().guardar("Sin identidad");
    expect(practica().guardados).toHaveLength(0);
  });
});

describe("dos entregas del mismo montaje", () => {
  it("comparten huella aunque los hagan estudiantes distintos", async () => {
    montarDivisor();
    const huellaMaria = await hashCircuito(lienzo().circuito);

    // Otro estudiante monta lo mismo, en otro sitio del lienzo y en otro orden.
    lienzo().limpiar();
    const gnd = lienzo().colocar("tierra", { x: 700, y: 500 });
    const r2 = lienzo().colocar("resistencia", { x: 80, y: 60 }, { valorOhm: 2000 });
    const r1 = lienzo().colocar("resistencia", { x: 500, y: 400 }, { valorOhm: 1000 });
    const v1 = lienzo().colocar("fuenteDC", { x: 300, y: 300 }, { tensionV: 9 });
    lienzo().conectar(`${v1}:positivo`, `${r1}:a`);
    lienzo().conectar(`${r1}:b`, `${r2}:a`);
    lienzo().conectar(`${r2}:b`, `${v1}:negativo`);
    lienzo().conectar(`${v1}:negativo`, `${gnd}:ref`);

    expect(await hashCircuito(lienzo().circuito)).toBe(huellaMaria);
  });
});
