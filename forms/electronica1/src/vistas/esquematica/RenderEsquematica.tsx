/* =========================================================================
   RenderEsquematica.tsx — Vista de simbologia normalizada.

   Toda la interaccion y la geometria vienen de LienzoSVG. Aqui solo se dice
   que simbolo lleva cada componente.
   ========================================================================= */

import { LienzoSVG } from "@/vistas/compartido/LienzoSVG";
import { Simbolo } from "./simbolos";

export function RenderEsquematica({ soloLectura = false }: { soloLectura?: boolean } = {}) {
  return (
    <LienzoSVG
      variante="esquematica"
      mostrarUniones
      soloLectura={soloLectura}
      dibujar={({ componente, brillo, rotacion }) => (
        <Simbolo componente={componente} brillo={brillo} rotacion={rotacion} />
      )}
    />
  );
}
