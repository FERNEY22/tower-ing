/* =========================================================================
   PanelMultimetro.tsx — El instrumento, con su pantalla y su selector.

   OJO CON EL NOMBRE: este archivo NO puede llamarse Multimetro.tsx. En
   Windows el sistema de archivos no distingue mayusculas, asi que
   "Multimetro.tsx" y "multimetro.ts" en la misma carpeta se resuelven al
   mismo modulo y el store acaba importando el componente en vez de la
   logica. Costo 36 pruebas rotas averiguarlo.
   ========================================================================= */

import { useCircuito } from "@/estado/circuitoStore";
import { NOMBRE_MODO, type ModoMultimetro } from "./multimetro";
import "./panelMultimetro.css";

const MODOS: ModoMultimetro[] = ["tension", "corriente", "resistencia"];

export function Multimetro() {
  const instrumento = useCircuito((s) => s.instrumento);
  const activar = useCircuito((s) => s.activarInstrumento);
  const cambiarModo = useCircuito((s) => s.cambiarModoInstrumento);
  const desactivar = useCircuito((s) => s.desactivarInstrumento);

  if (!instrumento.activo) {
    return (
      <button className="btn ghost" onClick={() => activar("tension")}>
        Usar el multímetro
      </button>
    );
  }

  const { modo, sondaA, sondaB, lectura } = instrumento;

  return (
    <div className="multimetro">
      <div className="dmm-cabecera">
        <span className="dmm-titulo">Multímetro</span>
        <button className="dmm-cerrar" onClick={desactivar} aria-label="Guardar el multímetro">
          ×
        </button>
      </div>

      <div className="dmm-pantalla">
        <span className="dmm-valor">{lectura?.texto ?? "— — —"}</span>
      </div>

      <div className="dmm-modos" role="group" aria-label="Modo de medida">
        {MODOS.map((m) => (
          <button
            key={m}
            className={"dmm-modo" + (modo === m ? " activo" : "")}
            onClick={() => cambiarModo(m)}
          >
            {m === "tension" ? "V" : m === "corriente" ? "A" : "Ω"}
          </button>
        ))}
      </div>

      <p className="dmm-modo-nombre">{NOMBRE_MODO[modo]}</p>

      <ol className="dmm-sondas">
        <li className={sondaA ? "puesta" : ""}>
          Punta 1 · {sondaA ?? "sin poner"}
        </li>
        <li className={sondaB ? "puesta" : ""}>
          Punta 2 · {sondaB ?? "sin poner"}
        </li>
      </ol>

      <p className="dmm-ayuda">
        {modo === "corriente"
          ? "El amperímetro va en serie: haz clic en un cable para abrirlo e intercalarlo. Si pones las dos puntas sobre terminales, lo estás conectando en paralelo."
          : "Haz clic en dos terminales para apoyar las puntas."}
      </p>

      {lectura?.advertencia && (
        <p className={"dmm-advertencia" + (lectura.cortocircuito ? " grave" : "")}>
          {lectura.advertencia}
        </p>
      )}
    </div>
  );
}
