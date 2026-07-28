/* =========================================================================
   BotonExportar.tsx — Exportar el lienzo visible a PNG con marca de agua.

   Exporta lo que el estudiante tiene delante: si está en la vista
   esquemática sale el esquema, y si está en la física sale el montaje. La
   especificación pide poder exportar desde cualquiera de las dos.
   ========================================================================= */

import { useState } from "react";
import { useCircuito } from "@/estado/circuitoStore";
import { useSesion } from "@/estado/sesionStore";
import { almacen } from "@/plataforma/almacen";
import { hashCircuito } from "./hashCircuito";
import { exportarPng } from "./pngMarcaAgua";

export function BotonExportar({ contexto }: { contexto: string }) {
  const [estado, setEstado] = useState<"listo" | "exportando" | "error">("listo");
  const circuito = useCircuito((s) => s.circuito);
  const identidad = useSesion((s) => s.identidad);
  const logger = useSesion((s) => s.logger);

  const vacio = circuito.componentes.length === 0;

  async function exportar() {
    if (!identidad || vacio) return;

    const svg = document.querySelector<SVGSVGElement>("svg.lienzo-svg");
    if (!svg) return;

    setEstado("exportando");
    try {
      const hash = await hashCircuito(circuito);
      const nombre = await exportarPng(svg, {
        nombre: identidad.nombre,
        ccMask: identidad.ccMask,
        contexto,
        ts: almacen.ahora(),
        hash,
      });

      logger?.emitir("export_png", { hash, archivo: nombre, contexto });
      setEstado("listo");
    } catch {
      setEstado("error");
    }
  }

  return (
    <button
      className="btn ghost"
      onClick={() => void exportar()}
      disabled={vacio || estado === "exportando"}
      title={
        vacio
          ? "No hay nada que exportar"
          : "Descarga el lienzo con tu nombre, la fecha y la huella del circuito"
      }
    >
      {estado === "exportando"
        ? "Exportando…"
        : estado === "error"
          ? "No se pudo exportar"
          : "Exportar PNG"}
    </button>
  );
}
