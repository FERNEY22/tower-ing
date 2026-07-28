/* =========================================================================
   practicaStore.ts — Circuitos guardados de la práctica libre.

   Se guarda el circuito entero, no una captura: recuperarlo devuelve algo
   editable y resoluble, no una imagen. Y se guarda con su huella, para que
   coincida con la que aparece en la marca de agua del PNG.
   ========================================================================= */

import { create } from "zustand";
import type { Circuito } from "@/motor/circuito";
import type { CircuitoGuardado } from "@/plataforma/almacen/esquema";
import { almacen } from "@/plataforma/almacen";
import { hashCircuito } from "@/exportacion/hashCircuito";
import { useCircuito } from "./circuitoStore";
import { useSesion } from "./sesionStore";

interface EstadoPractica {
  guardados: CircuitoGuardado[];
  cargando: boolean;
  guardando: boolean;
  error: string | null;
  /** Confirmación breve tras guardar, para que se vea que pasó algo. */
  aviso: string | null;

  refrescar(): Promise<void>;
  guardar(nombre: string): Promise<void>;
  recuperar(hash: string): void;
  limpiarAviso(): void;
}

export const usePractica = create<EstadoPractica>((set, get) => ({
  guardados: [],
  cargando: false,
  guardando: false,
  error: null,
  aviso: null,

  async refrescar() {
    const identidad = useSesion.getState().identidad;
    if (!identidad) return;

    set({ cargando: true, error: null });
    try {
      const guardados = await almacen.cargarCircuitos(identidad.ccHash);
      set({ guardados, cargando: false });
    } catch (e) {
      set({
        cargando: false,
        error: e instanceof Error ? e.message : "No se pudieron cargar tus circuitos.",
      });
    }
  },

  async guardar(nombre) {
    const identidad = useSesion.getState().identidad;
    const circuito = useCircuito.getState().circuito;

    if (!identidad) return;
    if (!circuito.componentes.length) {
      set({ error: "El lienzo está vacío: no hay nada que guardar." });
      return;
    }

    set({ guardando: true, error: null, aviso: null });
    try {
      const hash = await hashCircuito(circuito);
      const registro: CircuitoGuardado = {
        nombre: nombre.trim() || "Sin título",
        ts: almacen.ahora(),
        hash,
        circuito,
      };

      await almacen.guardarCircuito(identidad.ccHash, registro);
      useSesion.getState().logger?.emitir("free_practice_save", {
        hash,
        componentes: circuito.componentes.length,
      });

      set({ guardando: false, aviso: `Guardado como ${registro.nombre} · ${hash}` });
      await get().refrescar();
    } catch (e) {
      set({
        guardando: false,
        error: e instanceof Error ? e.message : "No se pudo guardar el circuito.",
      });
    }
  },

  recuperar(hash) {
    const registro = get().guardados.find((g) => g.hash === hash);
    if (!registro) return;
    useCircuito.getState().cargar(registro.circuito as Circuito);
    set({ aviso: `Recuperado ${registro.nombre}` });
  },

  limpiarAviso() {
    set({ aviso: null });
  },
}));
