/* =========================================================================
   RenderFisica.tsx — Vista con el aspecto real de los componentes.

   Misma geometria y misma interaccion que la esquematica: las dos usan
   LienzoSVG. Sin puntos de union, porque eso es convencion de esquema y en
   un montaje real no existe.
   ========================================================================= */

import { LienzoSVG } from "@/vistas/compartido/LienzoSVG";
import { Sprite } from "./sprites";

export function RenderFisica({ soloLectura = false }: { soloLectura?: boolean } = {}) {
  return (
    <LienzoSVG
      variante="fisica"
      mostrarUniones={false}
      soloLectura={soloLectura}
      dibujar={({ componente, brillo, rotacion }) => (
        <Sprite componente={componente} brillo={brillo} rotacion={rotacion} />
      )}
    />
  );
}
