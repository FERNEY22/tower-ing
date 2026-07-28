/* =========================================================================
   PracticaLibre.tsx — El editor sin averia sembrada ni nota.

   En la fase 9 se le añade guardar y recuperar circuitos y el registro de
   actividad. De momento es la forma de tener el lienzo en las manos.
   ========================================================================= */

import { Link } from "react-router-dom";
import { CURSO } from "@/config";
import { Lienzo } from "@/vistas/Lienzo";
import { CircuitosGuardados } from "./CircuitosGuardados";

export function PracticaLibre() {
  return (
    <div className="wrap ancho">
      <header className="practica-cabecera">
        <div>
          <div className="eyebrow">
            <span className="dot" /> {CURSO.codigo} · Sin evaluación
          </div>
          <h1 style={{ fontSize: "clamp(22px,3.4vw,32px)" }}>Práctica libre</h1>
        </div>
        <Link className="btn ghost" to="/panel">
          Volver al panel
        </Link>
      </header>

      <p className="lead" style={{ marginBottom: 18 }}>
        Lienzo vacío, todos los componentes y sin límite de tiempo. Aquí no se
        califica nada: el circuito se resuelve solo cada vez que lo cambias.
      </p>

      <Lienzo contextoExportacion="Práctica libre" />

      <CircuitosGuardados />
    </div>
  );
}
