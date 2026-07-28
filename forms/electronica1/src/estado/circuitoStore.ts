/* =========================================================================
   circuitoStore.ts — La instancia viva del circuito.

   ES LA FUENTE DE VERDAD. Las dos vistas la leen; ninguna guarda una copia
   propia ni sincroniza nada con la otra. Toda modificacion pasa por una
   accion de aqui, y despues de cada una se vuelve a resolver el circuito.

   Resolver en cada cambio es barato —los circuitos del curso tienen menos de
   una docena de nodos— y es lo que hace que el estudiante vea la corriente
   cambiar mientras mueve el cursor del potenciometro.
   ========================================================================= */

import { create } from "zustand";
import {
  claveDeRef,
  claveTerminal,
  crearCable,
  crearComponente,
  refDesdeClave,
  type Circuito,
  type Componente,
  type ParamsPorTipo,
  type Punto,
  type TipoComponente,
} from "@/motor/circuito";
import type { Solucion } from "@/motor";
import {
  reemplazarComponente,
  resolverConQuemado,
  type Quemadura,
} from "@/motor/quemado";
import {
  medir,
  medirCorrienteEnSerie,
  type Medicion,
  type ModoMultimetro,
} from "@/instrumentos/multimetro";
import { ajustarAGrid, normalizarRotacion } from "@/vistas/compartido/geometria";

export type Vista = "esquematica" | "fisica";

/** Prefijo de los identificadores, como en cualquier esquema. */
const PREFIJOS: Record<TipoComponente, string> = {
  resistencia: "R",
  potenciometro: "P",
  fuenteDC: "V",
  interruptor: "S",
  diodo: "D",
  led: "LED",
  zener: "Z",
  tierra: "GND",
};

/** Siguiente id libre para ese prefijo: R1, R2, R3… */
export function siguienteId(circuito: Circuito, tipo: TipoComponente): string {
  const prefijo = PREFIJOS[tipo];
  let mayor = 0;

  for (const c of circuito.componentes) {
    if (!c.id.startsWith(prefijo)) continue;
    const n = Number(c.id.slice(prefijo.length));
    if (Number.isInteger(n) && n > mayor) mayor = n;
  }
  return `${prefijo}${mayor + 1}`;
}

function siguienteIdCable(circuito: Circuito): string {
  let mayor = 0;
  for (const c of circuito.cables) {
    const n = Number(c.id.slice(1));
    if (Number.isInteger(n) && n > mayor) mayor = n;
  }
  return `w${mayor + 1}`;
}

/** True si ya existe un cable entre esos dos terminales, en cualquier orden. */
function yaConectados(circuito: Circuito, a: string, b: string): boolean {
  return circuito.cables.some((c) => {
    const d = claveDeRef(c.desde);
    const h = claveDeRef(c.hasta);
    return (d === a && h === b) || (d === b && h === a);
  });
}

function existeTerminal(circuito: Circuito, clave: string): boolean {
  const corte = clave.indexOf(":");
  if (corte < 0) return false;
  const comp = circuito.componentes.find((c) => c.id === clave.slice(0, corte));
  return !!comp?.terminales.some((t) => t.nombre === clave.slice(corte + 1));
}

/* ------------------------------------------------------------------ store */

export interface EstadoInstrumento {
  activo: boolean;
  modo: ModoMultimetro;
  sondaA: string | null;
  sondaB: string | null;
  lectura: Medicion | null;
}

/**
 * Lo que hizo el estudiante durante la sesion. La rubrica lee de aqui, y el
 * panel docente tambien: es el rastro de destreza, no solo la nota.
 */
export interface Contadores {
  mediciones: number;
  cortocircuitos: number;
  /** Componentes quemados, acumulados por tipo. */
  quemadosPorTipo: Record<string, number>;
}

interface EstadoCircuito {
  circuito: Circuito;
  solucion: Solucion | null;
  vista: Vista;
  /** Lo que se ha quemado en el ultimo cambio. Para la animacion de humo. */
  quemadurasRecientes: Quemadura[];
  instrumento: EstadoInstrumento;
  contadores: Contadores;
  /** Id del componente seleccionado, si hay alguno. */
  seleccion: string | null;
  /** Terminal desde el que se esta tirando un cable. */
  cableDesde: string | null;
  /** Motivo por el que se rechazo la ultima accion, para avisar al usuario. */
  aviso: string | null;

  colocar<T extends TipoComponente>(
    tipo: T,
    posicion: Punto,
    params?: Partial<ParamsPorTipo[T]>,
  ): string;
  mover(id: string, posicion: Punto): void;
  rotar(id: string, grados?: number): void;
  eliminar(id: string): void;
  actualizarParams(id: string, params: Record<string, unknown>): void;

  conectar(desde: string, hasta: string): string | null;
  desconectar(cableId: string): void;

  /** Sustituye un componente quemado por uno nuevo. */
  reemplazar(id: string): void;

  seleccionar(id: string | null): void;
  empezarCable(clave: string | null): void;
  cambiarVista(vista?: Vista): void;
  limpiarAviso(): void;

  activarInstrumento(modo: ModoMultimetro): void;
  cambiarModoInstrumento(modo: ModoMultimetro): void;
  desactivarInstrumento(): void;
  ponerSonda(clave: string): void;
  medirEnCable(cableId: string): void;

  cargar(circuito: Circuito): void;
  limpiar(): void;
  recalcular(): void;
  /** Pone los contadores a cero sin tocar el circuito. */
  reiniciarContadores(): void;
}

const CIRCUITO_VACIO: Circuito = { componentes: [], cables: [] };

const INSTRUMENTO_APAGADO: EstadoInstrumento = {
  activo: false,
  modo: "tension",
  sondaA: null,
  sondaB: null,
  lectura: null,
};

function contadoresACero(): Contadores {
  return { mediciones: 0, cortocircuitos: 0, quemadosPorTipo: {} };
}

export const useCircuito = create<EstadoCircuito>((set, get) => {
  /**
   * Aplica un cambio al circuito, lo resuelve y aplica el modelo de quemado.
   *
   * El circuito que se guarda es el que devuelve resolverConQuemado, no el
   * que entro: si algo se quemo, ese componente queda marcado y lo que se
   * muestra es la solucion DE DESPUES de que se abriera la rama.
   */
  function aplicar(cambio: (c: Circuito) => Circuito): void {
    const propuesto = cambio(get().circuito);

    if (!propuesto.componentes.length) {
      set({ circuito: propuesto, solucion: null, quemadurasRecientes: [] });
      return;
    }

    const { circuito, solucion, quemaduras } = resolverConQuemado(propuesto);

    // Los quemados se acumulan durante toda la sesion, no solo el ultimo.
    const quemadosPorTipo = { ...get().contadores.quemadosPorTipo };
    for (const q of quemaduras) {
      quemadosPorTipo[q.tipo] = (quemadosPorTipo[q.tipo] ?? 0) + 1;
    }

    set({
      circuito,
      solucion,
      quemadurasRecientes: quemaduras,
      contadores: { ...get().contadores, quemadosPorTipo },
    });
  }

  /** Suma la medida a los contadores de la sesion. */
  function anotarMedicion(lectura: Medicion | null): void {
    if (!lectura) return;
    const contadores = get().contadores;
    set({
      contadores: {
        ...contadores,
        mediciones: contadores.mediciones + (lectura.valido ? 1 : 0),
        cortocircuitos:
          contadores.cortocircuitos + (lectura.cortocircuito ? 1 : 0),
      },
    });
  }

  function calcular(circuito: Circuito): Solucion | null {
    if (!circuito.componentes.length) return null;
    return resolverConQuemado(circuito).solucion;
  }

  return {
    circuito: CIRCUITO_VACIO,
    solucion: null,
    vista: "esquematica",
    seleccion: null,
    cableDesde: null,
    aviso: null,
    quemadurasRecientes: [],
    instrumento: INSTRUMENTO_APAGADO,
    contadores: contadoresACero(),

    colocar(tipo, posicion, params) {
      const id = siguienteId(get().circuito, tipo);
      const comp = crearComponente(tipo, id, params, ajustarAGrid(posicion));
      aplicar((c) => ({ ...c, componentes: [...c.componentes, comp] }));
      set({ seleccion: id });
      return id;
    },

    mover(id, posicion) {
      const destino = ajustarAGrid(posicion);
      aplicar((c) => ({
        ...c,
        componentes: c.componentes.map((comp) =>
          comp.id === id ? { ...comp, posicion: destino } : comp,
        ),
      }));
    },

    rotar(id, grados = 90) {
      aplicar((c) => ({
        ...c,
        componentes: c.componentes.map((comp) =>
          comp.id === id
            ? { ...comp, rotacion: normalizarRotacion(comp.rotacion + grados) }
            : comp,
        ),
      }));
    },

    eliminar(id) {
      aplicar((c) => ({
        // Los cables que colgaban del componente se van con el: dejarlos
        // apuntando a un terminal inexistente romperia la red.
        componentes: c.componentes.filter((comp) => comp.id !== id),
        cables: c.cables.filter(
          (cable) =>
            cable.desde.componenteId !== id && cable.hasta.componenteId !== id,
        ),
      }));
      if (get().seleccion === id) set({ seleccion: null });
    },

    actualizarParams(id, params) {
      aplicar((c) => ({
        ...c,
        componentes: c.componentes.map((comp) =>
          comp.id === id
            ? ({ ...comp, params: { ...comp.params, ...params } } as Componente)
            : comp,
        ),
      }));
    },

    conectar(desde, hasta) {
      const { circuito } = get();

      if (desde === hasta) {
        set({ aviso: "Un cable tiene que unir dos terminales distintos." });
        return null;
      }
      if (!existeTerminal(circuito, desde) || !existeTerminal(circuito, hasta)) {
        set({ aviso: "Ese terminal ya no existe." });
        return null;
      }
      if (yaConectados(circuito, desde, hasta)) {
        set({ aviso: "Esos dos terminales ya estan unidos." });
        return null;
      }

      const id = siguienteIdCable(circuito);
      const cable = crearCable(id, refDesdeClave(desde), refDesdeClave(hasta));
      aplicar((c) => ({ ...c, cables: [...c.cables, cable] }));
      set({ cableDesde: null, aviso: null });
      return id;
    },

    desconectar(cableId) {
      aplicar((c) => ({
        ...c,
        cables: c.cables.filter((cable) => cable.id !== cableId),
      }));
    },

    reemplazar(id) {
      aplicar((c) => reemplazarComponente(c, id));
    },

    seleccionar(id) {
      set({ seleccion: id });
    },

    /* ------------------------------------------------------- multimetro */

    activarInstrumento(modo) {
      set({
        instrumento: { activo: true, modo, sondaA: null, sondaB: null, lectura: null },
        cableDesde: null,
      });
    },

    cambiarModoInstrumento(modo) {
      // Cambiar de modo obliga a volver a poner las puntas: en un multimetro
      // real tambien hay que cambiarlas de borne.
      set({
        instrumento: { activo: true, modo, sondaA: null, sondaB: null, lectura: null },
      });
    },

    desactivarInstrumento() {
      set({ instrumento: INSTRUMENTO_APAGADO });
    },

    ponerSonda(clave) {
      const { instrumento, circuito } = get();
      if (!instrumento.activo) return;

      // Primera punta: se apoya y se espera a la segunda.
      if (!instrumento.sondaA || instrumento.sondaB) {
        set({
          instrumento: {
            ...instrumento,
            sondaA: clave,
            sondaB: null,
            lectura: null,
          },
        });
        return;
      }

      if (clave === instrumento.sondaA) return;

      const lectura = medir(circuito, instrumento.modo, instrumento.sondaA, clave);
      set({
        instrumento: { ...instrumento, sondaB: clave, lectura },
      });
      anotarMedicion(lectura);
    },

    medirEnCable(cableId) {
      const { instrumento, circuito } = get();
      if (!instrumento.activo || instrumento.modo !== "corriente") return;

      const lectura = medirCorrienteEnSerie(circuito, cableId);
      set({
        instrumento: {
          ...instrumento,
          sondaA: lectura.puntos[0] ?? null,
          sondaB: lectura.puntos[1] ?? null,
          lectura,
        },
      });
      anotarMedicion(lectura);
    },

    empezarCable(clave) {
      set({ cableDesde: clave, aviso: null });
    },

    cambiarVista(vista) {
      set({ vista: vista ?? (get().vista === "esquematica" ? "fisica" : "esquematica") });
    },

    limpiarAviso() {
      set({ aviso: null });
    },

    cargar(circuito) {
      set({
        circuito,
        solucion: calcular(circuito),
        seleccion: null,
        cableDesde: null,
        aviso: null,
        quemadurasRecientes: [],
        instrumento: INSTRUMENTO_APAGADO,
        contadores: contadoresACero(),
      });
    },

    limpiar() {
      set({
        circuito: CIRCUITO_VACIO,
        solucion: null,
        seleccion: null,
        cableDesde: null,
        aviso: null,
        quemadurasRecientes: [],
        instrumento: INSTRUMENTO_APAGADO,
        contadores: contadoresACero(),
      });
    },

    recalcular() {
      set({ solucion: calcular(get().circuito) });
    },

    reiniciarContadores() {
      set({ contadores: contadoresACero() });
    },
  };
});

/** Atajo: el componente seleccionado, o null. */
export function componenteSeleccionado(estado: EstadoCircuito): Componente | null {
  if (!estado.seleccion) return null;
  return estado.circuito.componentes.find((c) => c.id === estado.seleccion) ?? null;
}

/** Clave de terminal a partir de sus dos partes. Reexportado por comodidad. */
export { claveTerminal };
