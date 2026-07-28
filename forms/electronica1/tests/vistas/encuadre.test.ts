/* =========================================================================
   El tamaño con el que se ve el dibujo.

   Antes el lienzo tenía un encuadre fijo de 900×560 metido en 330 px: 0,37
   píxeles por unidad, y las bandas de una resistencia quedaban en 1,5 px.
   La lección 1 consiste en leerlas, así que no se podía hacer.

   Ahora el encuadre se ajusta al circuito y la escala llega al tope de
   config. Estas pruebas fijan la condición que lo hace posible: que ninguna
   lección se despatarre por el lienzo.
   ========================================================================= */

import { describe, it, expect } from "vitest";
import { LIENZO } from "@/config";
import { cajaDelCircuito } from "@/vistas/compartido/geometria";
import { LECCIONES_IMPLEMENTADAS } from "@/lecciones/registro";
import { resolver } from "@/motor";
import { diagnosticosDe, validarTopologia } from "@/motor/topologia";

/** El encuadre real: la caja del circuito, nunca menor que el mínimo. */
function encuadre(circuito: Parameters<typeof cajaDelCircuito>[0]) {
  const caja = cajaDelCircuito(circuito, LIENZO.margenEncuadre);
  return {
    ancho: Math.max(caja.ancho, LIENZO.encuadreMinimo.ancho),
    alto: Math.max(caja.alto, LIENZO.encuadreMinimo.alto),
  };
}

describe("las cinco lecciones caben a la escala máxima", () => {
  for (const l of LECCIONES_IMPLEMENTADAS) {
    it(`${l.id} entra dentro del encuadre mínimo`, () => {
      const caja = cajaDelCircuito(l.circuitoInicial(), LIENZO.margenEncuadre);

      // Si un circuito se sale del encuadre mínimo, el ajuste tiene que
      // alejarse para mostrarlo entero y todo se ve más pequeño.
      expect(caja.ancho, `${l.id} es demasiado ancho`).toBeLessThanOrEqual(
        LIENZO.encuadreMinimo.ancho,
      );
      expect(caja.alto, `${l.id} es demasiado alto`).toBeLessThanOrEqual(
        LIENZO.encuadreMinimo.alto,
      );
    });
  }

  it("con un hueco de portátil corriente todas llegan al tope", () => {
    // 1366×768 con el panel lateral puesto: quedan unos 620 px de ancho y
    // unos 450 de alto para el dibujo.
    const anchoHueco = 620;
    const altoHueco = 450;

    for (const l of LECCIONES_IMPLEMENTADAS) {
      const e = encuadre(l.circuitoInicial());
      const ppu = Math.min(
        LIENZO.pxPorUnidadMax,
        anchoHueco / e.ancho,
        altoHueco / e.alto,
      );
      expect(ppu, `${l.id} no llega al tope`).toBe(LIENZO.pxPorUnidadMax);
    }
  });

  it("a esa escala las bandas de color se leen", () => {
    // Una banda mide 4 unidades. Antes salían a 1,5 px.
    const anchoBanda = 4 * LIENZO.pxPorUnidadMax;
    expect(anchoBanda).toBeGreaterThan(5);
  });

  it("un componente pasa de 22 px a más de 80", () => {
    // La huella de un componente son 60 unidades entre terminales.
    expect(60 * LIENZO.pxPorUnidadMax).toBeGreaterThan(80);
  });
});

describe("el circuito queda centrado en el encuadre", () => {
  it("el aire sobrante se reparte a los dos lados", () => {
    const circuito = LECCIONES_IMPLEMENTADAS[0]!.circuitoInicial();
    const caja = cajaDelCircuito(circuito, LIENZO.margenEncuadre);
    const e = encuadre(circuito);

    const sobraAncho = e.ancho - caja.ancho;
    const sobraAlto = e.alto - caja.alto;
    expect(sobraAncho).toBeGreaterThanOrEqual(0);
    expect(sobraAlto).toBeGreaterThanOrEqual(0);
  });

  it("un lienzo vacío no da un encuadre diminuto", () => {
    const e = encuadre({ componentes: [], cables: [] });
    expect(e.ancho).toBe(LIENZO.encuadreMinimo.ancho);
    expect(e.alto).toBe(LIENZO.encuadreMinimo.alto);
  });
});

describe("el trazado reorganizado no rompió ningún circuito", () => {
  for (const l of LECCIONES_IMPLEMENTADAS) {
    it(`${l.id} sigue resolviéndose sin errores de montaje`, () => {
      const s = resolver(l.circuitoInicial());
      expect(s.ok, `${l.id} no resuelve`).toBe(true);
      expect(
        s.diagnosticos.filter((d) => d.severidad === "error"),
        `${l.id} tiene errores`,
      ).toEqual([]);
    });
  }

  it("ninguna arranca con terminales al aire", () => {
    // El potenciómetro de la lección 4 dejaba su extremo libre sin conectar y
    // eso sacaba un aviso que no tenía nada que ver con la avería.
    for (const l of LECCIONES_IMPLEMENTADAS) {
      const topologia = validarTopologia(l.circuitoInicial());
      expect(
        diagnosticosDe(topologia, "nodo-flotante"),
        `${l.id} tiene terminales sueltos`,
      ).toEqual([]);
    }
  });

  it("ninguna arranca con componentes sin conectar", () => {
    for (const l of LECCIONES_IMPLEMENTADAS) {
      const topologia = validarTopologia(l.circuitoInicial());
      expect(diagnosticosDe(topologia, "componente-suelto"), l.id).toEqual([]);
    }
  });
});
