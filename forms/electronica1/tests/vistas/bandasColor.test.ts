/* Las bandas salen del valor real del componente: la leccion 1 consiste en
   leerlas. Si fueran decorativas, la leccion no tendria sentido. */

import { describe, it, expect } from "vitest";
import {
  bandaDeTolerancia,
  bandasDe,
  COLORES_DIGITO,
  leerBandas,
  valorDeBandas,
} from "@/vistas/fisica/bandasColor";
import { SERIE_E12 } from "@/motor/valores";

describe("codigo de cuatro bandas", () => {
  it("1 kΩ es marrón, negro, rojo", () => {
    expect(leerBandas(bandasDe(1000, 5))).toBe("marrón, negro, rojo, oro");
  });

  it("470 Ω es amarillo, violeta, marrón", () => {
    expect(leerBandas(bandasDe(470, 5))).toBe("amarillo, violeta, marrón, oro");
  });

  it("2,2 kΩ es rojo, rojo, rojo", () => {
    expect(leerBandas(bandasDe(2200, 5))).toBe("rojo, rojo, rojo, oro");
  });

  it("330 Ω es naranja, naranja, marrón", () => {
    expect(leerBandas(bandasDe(330, 5))).toBe("naranja, naranja, marrón, oro");
  });

  it("10 Ω es marrón, negro, negro", () => {
    expect(leerBandas(bandasDe(10, 5))).toBe("marrón, negro, negro, oro");
  });

  it("1 MΩ es marrón, negro, verde", () => {
    expect(leerBandas(bandasDe(1e6, 5))).toBe("marrón, negro, verde, oro");
  });

  it("por debajo de 10 Ω el multiplicador es oro", () => {
    // 4,7 Ω = 47 × 10⁻¹
    expect(leerBandas(bandasDe(4.7, 5))).toBe("amarillo, violeta, oro, oro");
  });
});

describe("ida y vuelta", () => {
  it("leer las bandas devuelve el valor original", () => {
    for (const v of [220, 330, 470, 1000, 2200, 4700, 10000, 1e6]) {
      expect(valorDeBandas(bandasDe(v))).toBeCloseTo(v, 6);
    }
  });

  it("funciona para toda la serie E12 en varias decadas", () => {
    for (const mantisa of SERIE_E12) {
      for (const decada of [1, 10, 100, 1000, 10000]) {
        const valor = mantisa * decada;
        expect(valorDeBandas(bandasDe(valor))).toBeCloseTo(valor, 6);
      }
    }
  });

  it("las tres primeras bandas son digito, digito, multiplicador", () => {
    const bandas = bandasDe(1000);
    expect(bandas.map((b) => b.papel)).toEqual([
      "digito",
      "digito",
      "multiplicador",
      "tolerancia",
    ]);
  });
});

describe("banda de tolerancia", () => {
  it("5 % es oro y 10 % es plata", () => {
    expect(bandaDeTolerancia(5).nombre).toBe("oro");
    expect(bandaDeTolerancia(10).nombre).toBe("plata");
  });

  it("1 % es marrón y 2 % rojo", () => {
    expect(bandaDeTolerancia(1).nombre).toBe("marrón");
    expect(bandaDeTolerancia(2).nombre).toBe("rojo");
  });

  it("20 % no lleva banda", () => {
    expect(bandaDeTolerancia(20).hex).toBe("transparent");
  });

  it("una tolerancia que no es normalizada usa la inmediatamente mas gruesa", () => {
    // Nunca se promete mas precision de la que hay.
    expect(bandaDeTolerancia(3).nombre).toBe("oro"); // 3 % -> se lee como 5 %
  });
});

describe("robustez", () => {
  it("un valor invalido devuelve bandas, no una excepcion", () => {
    expect(bandasDe(0)).toHaveLength(4);
    expect(bandasDe(-100)).toHaveLength(4);
    expect(bandasDe(NaN)).toHaveLength(4);
  });

  it("un valor que redondea a la decada siguiente no da un digito 10", () => {
    const bandas = bandasDe(9970);
    for (const b of bandas.slice(0, 2)) {
      expect(b.valor).toBeGreaterThanOrEqual(0);
      expect(b.valor).toBeLessThanOrEqual(9);
    }
    expect(valorDeBandas(bandas)).toBe(10000);
  });

  it("cada color del codigo tiene nombre y un hex de verdad", () => {
    for (const c of COLORES_DIGITO) {
      expect(c.nombre.length).toBeGreaterThan(2);
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
