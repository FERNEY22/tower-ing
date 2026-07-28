import { describe, it, expect } from "vitest";
import { LECCIONES } from "@/config";
import {
  campo,
  csvBitacoras,
  csvDiagnosticos,
  csvResumen,
} from "@/plataforma/docente/exportarCSV";
import type { FilaDocente, ResultadoSesion } from "@/plataforma/almacen/esquema";

function sesion(parcial: Partial<ResultadoSesion> = {}): ResultadoSesion {
  return {
    nota: 85,
    desglose: { diagnostico: 40, reparacion: 30, eficiencia: 10, cuidado: 5, total: 85 },
    aprobado: true,
    diagnosticos: [
      { opcion: 1, etiqueta: "El LED al revés", correcto: false, tSeg: 24 },
      { opcion: 0, etiqueta: "La R es de 100 kΩ", correcto: true, tSeg: 61 },
    ],
    reparacionesFallidas: 1,
    quemados: { led: 2, resistencia: 1 },
    cortocircuitos: 1,
    mediciones: 4,
    tActivoSeg: 245,
    tPestanaSeg: 900,
    bitacoraIA: "Le pregunté a una IA; decía 470 Ω.",
    ts: 1_700_000_000_000,
    ...parcial,
  };
}

function fila(parcial: Partial<FilaDocente> = {}): FilaDocente {
  return {
    ccHash: "ab12cd34",
    ccMask: "••••678",
    nombre: "María Fernanda Gómez",
    progreso: {
      l1: {
        nombre: "María Fernanda Gómez",
        intentos: 2,
        mejorNota: 85,
        aprobado: true,
        aprobadoEn: 1_700_000_000_000,
        bitacoraIA: ["Le pregunté a una IA; decía 470 Ω."],
        ultimo: sesion(),
      },
    },
    acumulado: 85,
    leccionesAprobadas: 1,
    tActivoTotalSeg: 245,
    ...parcial,
  };
}

describe("escapado de campos", () => {
  it("deja en paz lo que no lo necesita", () => {
    expect(campo("hola")).toBe("hola");
    expect(campo(42)).toBe("42");
  });

  it("entrecomilla lo que lleva el separador", () => {
    expect(campo("uno;dos")).toBe('"uno;dos"');
  });

  it("duplica las comillas internas", () => {
    expect(campo('dijo "no"')).toBe('"dijo ""no"""');
  });

  it("entrecomilla lo que lleva saltos de línea", () => {
    expect(campo("uno\ndos")).toBe('"uno\ndos"');
  });

  it("convierte los vacíos en cadena vacía", () => {
    expect(campo(null)).toBe("");
    expect(campo(undefined)).toBe("");
  });
});

describe("CSV de resumen", () => {
  const csv = csvResumen([fila()]);
  const lineas = csv.split("\r\n");

  it("empieza con BOM para que Excel lea las tildes", () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("tiene cabecera y una línea por estudiante", () => {
    expect(lineas).toHaveLength(2);
  });

  it("trae un bloque de columnas por cada lección del curso", () => {
    for (const l of LECCIONES) {
      expect(lineas[0]).toContain(`${l.id}_nota`);
      expect(lineas[0]).toContain(`${l.id}_quemados`);
      expect(lineas[0]).toContain(`${l.id}_tiempo_activo_seg`);
    }
  });

  it("lleva la nota, los intentos y si aprobó", () => {
    expect(lineas[1]).toContain("85");
    expect(lineas[1]).toContain("si");
  });

  it("suma los quemados de todos los tipos", () => {
    // led 2 + resistencia 1 = 3
    const campos = lineas[1]!.split(";");
    const indice = lineas[0]!.split(";").indexOf("l1_quemados");
    expect(campos[indice]).toBe("3");
  });

  it("nunca escribe la cédula completa", () => {
    expect(csv).toContain("••••678");
    expect(csv).not.toMatch(/\d{7,}/);
  });

  it("una lección sin hacer sale en cero, no en blanco", () => {
    const campos = lineas[1]!.split(";");
    const indice = lineas[0]!.split(";").indexOf("l5_nota");
    expect(campos[indice]).toBe("0");
  });

  it("un grupo vacío devuelve solo la cabecera", () => {
    expect(csvResumen([]).split("\r\n")).toHaveLength(1);
  });
});

describe("CSV de bitácoras", () => {
  it("saca una línea por entrada, con el texto completo", () => {
    const lineas = csvBitacoras([fila()]).split("\r\n");
    expect(lineas).toHaveLength(2);
    expect(lineas[1]).toContain("decía 470");
  });

  it("un estudiante sin bitácoras no genera líneas", () => {
    const sinBitacora = fila({
      progreso: {
        l1: {
          nombre: "X",
          intentos: 1,
          mejorNota: 50,
          aprobado: false,
          aprobadoEn: null,
          bitacoraIA: [],
          ultimo: null,
        },
      },
    });
    expect(csvBitacoras([sinBitacora]).split("\r\n")).toHaveLength(1);
  });

  it("una entrada con punto y coma no rompe la tabla", () => {
    const conSeparador = fila({
      progreso: {
        l1: {
          nombre: "X",
          intentos: 1,
          mejorNota: 50,
          aprobado: false,
          aprobadoEn: null,
          bitacoraIA: ["Dijo esto; luego lo otro"],
          ultimo: null,
        },
      },
    });
    const lineas = csvBitacoras([conSeparador]).split("\r\n");
    expect(lineas[1]).toContain('"Dijo esto; luego lo otro"');
    expect(lineas).toHaveLength(2);
  });
});

describe("CSV de diagnósticos", () => {
  const lineas = csvDiagnosticos([fila()]).split("\r\n");

  it("saca una línea por intento, en orden", () => {
    expect(lineas).toHaveLength(3);
    expect(lineas[1]).toContain("El LED al revés");
    expect(lineas[2]).toContain("La R es de 100 kΩ");
  });

  it("dice en qué intento fue y si acertó", () => {
    expect(lineas[1]).toContain(";1;");
    expect(lineas[1]).toContain(";no;");
    expect(lineas[2]).toContain(";2;");
    expect(lineas[2]).toContain(";si;");
  });

  it("incluye el tiempo hasta responder", () => {
    expect(lineas[1]!.endsWith(";24")).toBe(true);
  });
});
