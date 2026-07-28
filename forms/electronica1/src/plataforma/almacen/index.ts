/* =========================================================================
   index.ts — Seleccion del backend.

   El resto del proyecto importa SIEMPRE desde aqui:
     import { almacen } from "@/plataforma/almacen";
   ========================================================================= */

import type { Almacen } from "./api";
import { AlmacenMemoria } from "./memoria";
import { AlmacenFirebase } from "./firebase";
import { ALMACEN } from "@/config";

function crear(): Almacen {
  return ALMACEN.backend === "memoria"
    ? new AlmacenMemoria()
    : new AlmacenFirebase();
}

export const almacen: Almacen = crear();

export type { Almacen } from "./api";
export * from "./esquema";
