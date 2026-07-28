import { describe, it, expect } from "vitest";
import {
  nombreDeArchivo,
  textoMarcaAgua,
  type DatosMarcaAgua,
} from "@/exportacion/pngMarcaAgua";

const DATOS: DatosMarcaAgua = {
  nombre: "María Fernanda Gómez",
  ccMask: "••••678",
  contexto: "Lección 3 · Polarización directa e inversa",
  ts: Date.UTC(2026, 6, 27, 15, 30),
  hash: "A1B2C3D4",
};

describe("texto de la marca de agua", () => {
  const [linea1, linea2] = textoMarcaAgua(DATOS);

  it("lleva nombre, cédula enmascarada y contexto", () => {
    expect(linea1).toContain("María Fernanda Gómez");
    expect(linea1).toContain("••••678");
    expect(linea1).toContain("Polarización");
  });

  it("lleva fecha, hora y huella del circuito", () => {
    expect(linea2).toContain("A1B2C3D4");
    expect(linea2).toMatch(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
  });

  it("nunca escribe la cédula completa", () => {
    const todo = linea1 + linea2;
    expect(todo).not.toMatch(/\d{7,}/);
  });

  it("distingue la práctica libre de una lección", () => {
    const [l1] = textoMarcaAgua({ ...DATOS, contexto: "Práctica libre" });
    expect(l1).toContain("Práctica libre");
  });
});

describe("nombre del archivo", () => {
  it("es descriptivo y lleva la huella", () => {
    expect(nombreDeArchivo(DATOS)).toBe(
      "circuito-leccion-3-polarizacion-directa-e-inversa-A1B2C3D4.png",
    );
  });

  it("quita tildes y caracteres raros", () => {
    const n = nombreDeArchivo({ ...DATOS, contexto: "Práctica libre" });
    expect(n).toBe("circuito-practica-libre-A1B2C3D4.png");
    expect(n).toMatch(/^[a-zA-Z0-9.-]+$/);
  });

  it("aguanta un contexto vacío sin generar un nombre roto", () => {
    const n = nombreDeArchivo({ ...DATOS, contexto: "" });
    expect(n).toBe("circuito--A1B2C3D4.png");
    expect(n.endsWith(".png")).toBe(true);
  });
});
