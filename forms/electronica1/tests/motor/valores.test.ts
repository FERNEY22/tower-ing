import { describe, it, expect } from "vitest";
import {
  SERIE_E12,
  descomponer,
  e12MasCercano,
  esE12,
  formatearAmperios,
  formatearMagnitud,
  formatearOhm,
  formatearVoltios,
} from "@/motor/valores";

describe("descomposicion en mantisa y exponente", () => {
  it("separa correctamente valores de distintas decadas", () => {
    expect(descomponer(1000)).toEqual({ mantisa: 1, exponente: 3 });
    expect(descomponer(220).mantisa).toBeCloseTo(2.2, 10);
    expect(descomponer(220).exponente).toBe(2);
    expect(descomponer(0.047).mantisa).toBeCloseTo(4.7, 10);
    expect(descomponer(0.047).exponente).toBe(-2);
  });
});

describe("serie E12", () => {
  it("reconoce los valores de catalogo mas usados en el curso", () => {
    for (const v of [220, 330, 470, 1000, 2200, 10000, 1e6]) {
      expect(esE12(v)).toBe(true);
    }
  });

  it("rechaza valores que no existen en una gaveta", () => {
    expect(esE12(1234)).toBe(false);
    expect(esE12(0)).toBe(false);
    expect(esE12(-100)).toBe(false);
  });

  it("ajusta al valor real mas cercano", () => {
    expect(e12MasCercano(1234)).toBe(1200);
    expect(e12MasCercano(215)).toBe(220);
  });

  it("mide la cercania en escala logaritmica, no aritmetica", () => {
    // 3000 esta a 3,3 kΩ por arriba y a 3,0 kΩ por debajo en distancia
    // aritmetica, pero la serie E12 es geometrica: 3300/3000 = 1,100 esta
    // mas cerca que 3000/2700 = 1,111. Gana 3,3 kΩ.
    expect(e12MasCercano(3000)).toBe(3300);
    expect(e12MasCercano(2900)).toBe(2700);
  });

  it("sube de decada cuando corresponde", () => {
    expect(e12MasCercano(9500)).toBe(10000);
  });

  it("deja intactos los valores que ya son E12", () => {
    for (const m of SERIE_E12) {
      expect(e12MasCercano(m * 1000)).toBeCloseTo(m * 1000, 6);
    }
  });

  it("no arrastra ruido de coma flotante", () => {
    expect(e12MasCercano(219.7).toString()).toBe("220");
  });
});

describe("formato de magnitudes", () => {
  it("usa prefijo del SI y coma decimal, como en el curso", () => {
    expect(formatearOhm(1500)).toBe("1,5 kΩ");
    expect(formatearOhm(470)).toBe("470 Ω");
    expect(formatearOhm(2.2e6)).toBe("2,2 MΩ");
  });

  it("baja de escala en corrientes pequeñas", () => {
    expect(formatearAmperios(0.0092)).toBe("9,2 mA");
    expect(formatearAmperios(1e-6)).toBe("1 µA");
  });

  it("da a las tensiones las cifras que exige la validacion", () => {
    // El caso A pide leer 6,000 V, no 6 V.
    expect(formatearVoltios(6.0004)).toBe("6 V");
    expect(formatearVoltios(1.9012)).toBe("1,901 V");
  });

  it("maneja el cero y el signo", () => {
    expect(formatearOhm(0)).toBe("0 Ω");
    expect(formatearVoltios(-5)).toBe("-5 V");
  });

  it("no escupe NaN a la interfaz", () => {
    expect(formatearMagnitud(NaN, "V")).toBe("— V");
    expect(formatearMagnitud(Infinity, "A")).toBe("— A");
  });
});
