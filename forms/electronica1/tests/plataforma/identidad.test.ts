import { describe, it, expect } from "vitest";
import {
  construirIdentidad,
  enmascarar,
  hashCedula,
  soloDigitos,
  validarCedula,
  validarNombre,
} from "@/plataforma/ingreso/identidad";
import { IDENTIDAD } from "@/config";

describe("normalizacion de la entrada", () => {
  it("descarta todo lo que no sea digito", () => {
    expect(soloDigitos("1.012.345-678")).toBe("1012345678");
  });

  it("exige nombre y apellido", () => {
    expect(validarNombre("Maria").ok).toBe(false);
    expect(validarNombre("  ").ok).toBe(false);
    expect(validarNombre("Maria Fernanda Gomez").ok).toBe(true);
  });

  it("acota la longitud de la cedula", () => {
    expect(validarCedula("123").ok).toBe(false);
    expect(validarCedula("1234567890123456").ok).toBe(false);
    expect(validarCedula("1012345678").ok).toBe(true);
  });
});

describe("enmascarado", () => {
  it("deja ver solo los ultimos digitos", () => {
    expect(enmascarar("1012345678")).toBe("••••678");
  });

  it("no filtra el resto de la cedula", () => {
    const mascara = enmascarar("1012345678");
    expect(mascara).not.toContain("1012345");
  });
});

describe("hash de la cedula", () => {
  it("es estable para la misma cedula", async () => {
    const a = await hashCedula("1012345678");
    const b = await hashCedula("1.012.345.678");
    expect(a).toBe(b);
  });

  it("difiere entre cedulas distintas", async () => {
    const a = await hashCedula("1012345678");
    const b = await hashCedula("1012345679");
    expect(a).not.toBe(b);
  });

  it("tiene la longitud configurada y es hexadecimal", async () => {
    const h = await hashCedula("1012345678");
    expect(h).toHaveLength(IDENTIDAD.hashLongitud);
    expect(h).toMatch(/^[0-9a-f]+$/);
  });

  it("no contiene la cedula original", async () => {
    const h = await hashCedula("1012345678");
    expect(h).not.toContain("1012345678");
  });
});

describe("construccion de identidad", () => {
  it("arma nombre normalizado, hash y mascara", async () => {
    const id = await construirIdentidad("  Maria   Fernanda Gomez ", "1012345678");
    expect(id.nombre).toBe("Maria Fernanda Gomez");
    expect(id.ccMask).toBe("••••678");
    expect(id.ccHash).toHaveLength(IDENTIDAD.hashLongitud);
  });

  it("rechaza entradas invalidas con mensaje utilizable", async () => {
    await expect(construirIdentidad("Maria", "1012345678")).rejects.toThrow(
      /nombre y apellido/i,
    );
    await expect(construirIdentidad("Maria Gomez", "12")).rejects.toThrow(
      /dígitos/i,
    );
  });
});
