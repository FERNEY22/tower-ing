/* =========================================================================
   exportarCSV.ts — Los datos del grupo, para llevárselos a otra parte.

   Separador ";" y números enteros: es lo que abre bien un Excel en español
   sin pelearse con la coma decimal. Y BOM al principio, o las tildes salen
   rotas.

   Dos ficheros en vez de uno: el resumen es una rejilla de números, y la
   bitácora de IA es texto libre y largo. Meterlos en la misma tabla haría
   ilegibles los dos.
   ========================================================================= */

import { LECCIONES } from "@/config";
import type { FilaDocente } from "@/plataforma/almacen/esquema";

const SEP = ";";
const BOM = "﻿";

/** Escapa un campo según las reglas de CSV. */
export function campo(valor: unknown): string {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  if (texto.includes(SEP) || texto.includes('"') || /[\r\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

function fila(valores: unknown[]): string {
  return valores.map(campo).join(SEP);
}

/** Total de componentes quemados de un estudiante en una lección. */
function quemados(registro: FilaDocente["progreso"][string] | undefined): number {
  const q = registro?.ultimo?.quemados ?? {};
  return Object.values(q).reduce((s, n) => s + n, 0);
}

/* ---------------------------------------------------------------- resumen */

/**
 * Una fila por estudiante y un bloque de columnas por lección. Es la vista
 * que se pega en una planilla de notas.
 */
export function csvResumen(filas: FilaDocente[]): string {
  const cabecera = ["cedula", "nombre"];
  for (const l of LECCIONES) {
    cabecera.push(
      `${l.id}_nota`,
      `${l.id}_intentos`,
      `${l.id}_aprobado`,
      `${l.id}_intentos_diagnostico`,
      `${l.id}_quemados`,
      `${l.id}_cortocircuitos`,
      `${l.id}_mediciones`,
      `${l.id}_tiempo_activo_seg`,
    );
  }
  cabecera.push("nota_promedio", "lecciones_aprobadas", "tiempo_activo_total_seg");

  const lineas = [fila(cabecera)];

  for (const f of filas) {
    const valores: unknown[] = [f.ccMask, f.nombre];

    for (const l of LECCIONES) {
      const p = f.progreso[l.id];
      const u = p?.ultimo;
      valores.push(
        p?.mejorNota ?? 0,
        p?.intentos ?? 0,
        p?.aprobado ? "si" : "no",
        u?.diagnosticos.length ?? 0,
        quemados(p),
        u?.cortocircuitos ?? 0,
        u?.mediciones ?? 0,
        u?.tActivoSeg ?? 0,
      );
    }

    valores.push(
      Math.round(f.acumulado / LECCIONES.length),
      f.leccionesAprobadas,
      f.tActivoTotalSeg,
    );
    lineas.push(fila(valores));
  }

  return BOM + lineas.join("\r\n");
}

/* -------------------------------------------------------------- bitácoras */

/**
 * Una fila por entrada de bitácora. Alimenta el artículo de caso sobre
 * integración de IA en el aula, así que va aparte y completa.
 */
export function csvBitacoras(filas: FilaDocente[]): string {
  const lineas = [fila(["cedula", "nombre", "leccion", "entrada"])];

  for (const f of filas) {
    for (const l of LECCIONES) {
      const entradas = f.progreso[l.id]?.bitacoraIA ?? [];
      for (const entrada of entradas) {
        lineas.push(fila([f.ccMask, f.nombre, l.titulo, entrada]));
      }
    }
  }

  return BOM + lineas.join("\r\n");
}

/* ------------------------------------------------------------- diagnóstico */

/**
 * Una fila por intento de diagnóstico, con la opción elegida. Es el dato que
 * dice QUÉ está entendiendo mal el grupo, no solo cuántos acertaron.
 */
export function csvDiagnosticos(filas: FilaDocente[]): string {
  const lineas = [
    fila(["cedula", "nombre", "leccion", "intento", "opcion", "acerto", "seg"]),
  ];

  for (const f of filas) {
    for (const l of LECCIONES) {
      const intentos = f.progreso[l.id]?.ultimo?.diagnosticos ?? [];
      intentos.forEach((d, i) => {
        lineas.push(
          fila([
            f.ccMask,
            f.nombre,
            l.titulo,
            i + 1,
            d.etiqueta,
            d.correcto ? "si" : "no",
            d.tSeg,
          ]),
        );
      });
    }
  }

  return BOM + lineas.join("\r\n");
}

/* ----------------------------------------------------------- descarga */

export function descargarCsv(nombre: string, contenido: string): void {
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}
