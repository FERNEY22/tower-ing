/* =========================================================================
   BitacoraIA.tsx — El campo obligatorio de cierre.

   Alimenta un articulo de caso sobre integracion de IA en el aula, asi que
   la pregunta es concreta: no "¿usaste IA?", sino "si te dio un error, ¿cual
   era y como lo detectaste?". La segunda parte es la que enseña algo.
   ========================================================================= */

import { useLeccion } from "@/estado/leccionStore";

const MINIMO = 10;

export function BitacoraIA() {
  const texto = useLeccion((s) => s.bitacoraIA);
  const escribir = useLeccion((s) => s.escribirBitacora);
  const finalizar = useLeccion((s) => s.finalizar);
  const guardando = useLeccion((s) => s.guardando);

  const suficiente = texto.trim().length >= MINIMO;

  return (
    <div className="guia">
      <h2>Antes de cerrar</h2>
      <p>
        ¿Consultaste alguna IA durante esta lección? Si la respuesta que te dio
        tenía un error, ¿cuál era y cómo lo detectaste?
      </p>

      <textarea
        className="t"
        rows={5}
        value={texto}
        onChange={(e) => escribir(e.target.value)}
        placeholder="Si no consultaste ninguna, escríbelo también."
      />

      <p className="hint">
        Este campo es obligatorio y lo lee el docente. No afecta a tu nota.
      </p>

      <button
        className="btn wide"
        disabled={!suficiente || guardando}
        onClick={() => void finalizar()}
      >
        {guardando ? "Guardando…" : "Cerrar la lección"}
      </button>
    </div>
  );
}
