/* =========================================================================
   circuito.ts — El modelo. Fuente de verdad unica de todo el proyecto.

   DECISION IMPORTANTE sobre la especificacion
   -------------------------------------------
   El prompt describe los terminales como { nombre, nodoId }. Guardar el
   nodoId DENTRO del terminal crea dos fuentes de verdad: la lista de cables
   y la asignacion de nodos, que hay que mantener sincronizadas a mano. Es
   exactamente el fallo que la especificacion prohibe en el apartado de las
   dos vistas.

   Aqui la conectividad la definen SOLO los cables. La asignacion de nodos se
   deriva con union-find cada vez que hace falta (`construirRed`). El campo
   nodoId existe, pero como resultado de esa derivacion, nunca como dato que
   alguien pueda editar por su cuenta.

   La polaridad de cada terminal, en cambio, SI vive en el modelo: identificar
   anodo y catodo es objetivo de aprendizaje, no un detalle de dibujo.
   ========================================================================= */

import { LIMITES } from "@/config";

/* ------------------------------------------------------------------ tipos */

export type TipoComponente =
  | "resistencia"
  | "potenciometro"
  | "fuenteDC"
  | "interruptor"
  | "diodo"
  | "led"
  | "zener"
  | "tierra";

/**
 * La polaridad dice que papel juega el terminal, no solo como se llama.
 * "ninguna" es una afirmacion: la resistencia no tiene sentido de montaje.
 */
export type Polaridad =
  | "ninguna"
  | "positivo"
  | "negativo"
  | "anodo"
  | "catodo"
  | "cursor"
  | "referencia";

export interface Terminal {
  nombre: string;
  polaridad: Polaridad;
}

export type ColorLed = "rojo" | "verde" | "azul" | "blanco";

export interface ParamsPorTipo {
  resistencia: { valorOhm: number; toleranciaPct: number; potenciaW: number };
  potenciometro: { totalOhm: number; cursor: number };
  fuenteDC: { tensionV: number };
  interruptor: { cerrado: boolean };
  diodo: { modelo: string };
  led: { color: ColorLed };
  zener: { tensionRupturaV: number; potenciaW: number };
  tierra: Record<string, never>;
}

export interface EstadoComponente {
  /** Un componente quemado se comporta como circuito abierto. */
  quemado: boolean;
  /** Por que se quemo, para el mensaje y para el registro de eventos. */
  motivoQuemado?: string;
}

export interface Punto {
  x: number;
  y: number;
}

export interface Componente<T extends TipoComponente = TipoComponente> {
  id: string;
  tipo: T;
  params: ParamsPorTipo[T];
  terminales: Terminal[];
  posicion: Punto;
  /** Grados. La geometria concreta la resuelven las vistas. */
  rotacion: number;
  estado: EstadoComponente;
}

export interface RefTerminal {
  componenteId: string;
  terminal: string;
}

export interface Cable {
  id: string;
  desde: RefTerminal;
  hasta: RefTerminal;
  /** Trazado para la vista esquematica. Irrelevante para el motor. */
  trazado?: Punto[];
}

export interface Circuito {
  componentes: Componente[];
  cables: Cable[];
}

/* --------------------------------------------------- plantillas por tipo */

interface Plantilla {
  terminales: Terminal[];
  /** Nombre sin articulo, para poder componer frases correctas. */
  etiqueta: string;
  genero: "m" | "f";
  params: unknown;
}

export const PLANTILLAS: Record<TipoComponente, Plantilla> = {
  resistencia: {
    etiqueta: "resistencia",
    genero: "f",
    terminales: [
      { nombre: "a", polaridad: "ninguna" },
      { nombre: "b", polaridad: "ninguna" },
    ],
    params: {
      valorOhm: 1000,
      toleranciaPct: 5,
      potenciaW: LIMITES.resistenciaPotenciaWDefecto,
    },
  },
  potenciometro: {
    etiqueta: "potenciómetro",
    genero: "m",
    terminales: [
      { nombre: "a", polaridad: "ninguna" },
      { nombre: "cursor", polaridad: "cursor" },
      { nombre: "b", polaridad: "ninguna" },
    ],
    params: { totalOhm: 10000, cursor: 0.5 },
  },
  fuenteDC: {
    etiqueta: "fuente DC",
    genero: "f",
    terminales: [
      { nombre: "positivo", polaridad: "positivo" },
      { nombre: "negativo", polaridad: "negativo" },
    ],
    params: { tensionV: 9 },
  },
  interruptor: {
    etiqueta: "interruptor",
    genero: "m",
    terminales: [
      { nombre: "a", polaridad: "ninguna" },
      { nombre: "b", polaridad: "ninguna" },
    ],
    params: { cerrado: false },
  },
  diodo: {
    etiqueta: "diodo",
    genero: "m",
    terminales: [
      { nombre: "anodo", polaridad: "anodo" },
      { nombre: "catodo", polaridad: "catodo" },
    ],
    params: { modelo: "1N4148" },
  },
  led: {
    etiqueta: "LED",
    genero: "m",
    terminales: [
      { nombre: "anodo", polaridad: "anodo" },
      { nombre: "catodo", polaridad: "catodo" },
    ],
    params: { color: "rojo" },
  },
  zener: {
    etiqueta: "zener",
    genero: "m",
    terminales: [
      { nombre: "anodo", polaridad: "anodo" },
      { nombre: "catodo", polaridad: "catodo" },
    ],
    params: { tensionRupturaV: 5.1, potenciaW: LIMITES.zenerPotenciaWDefecto },
  },
  tierra: {
    etiqueta: "tierra",
    genero: "f",
    terminales: [{ nombre: "ref", polaridad: "referencia" }],
    params: {},
  },
};

/* --------------------------------------------------- lenguaje de los avisos

   Los mensajes de diagnostico se componen a partir de estas piezas. Sin
   ellas salen frases como "el terminal catodo de el LED", que le restan
   credibilidad a todo lo demas que dice el simulador.                       */

/** Nombre sin articulo: "LED", "resistencia". */
export function etiquetaDe(tipo: TipoComponente): string {
  return PLANTILLAS[tipo].etiqueta;
}

/** "el" o "la", segun el genero del componente. */
export function articuloDe(tipo: TipoComponente): "el" | "la" {
  return PLANTILLAS[tipo].genero === "m" ? "el" : "la";
}

/** "el LED", "la resistencia". */
export function conArticulo(tipo: TipoComponente): string {
  return `${articuloDe(tipo)} ${etiquetaDe(tipo)}`;
}

/** "del LED", "de la resistencia". */
export function frasePosesiva(tipo: TipoComponente): string {
  return PLANTILLAS[tipo].genero === "m"
    ? `del ${etiquetaDe(tipo)}`
    : `de la ${etiquetaDe(tipo)}`;
}

/** Pone en mayuscula la primera letra, para arrancar una frase. */
export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Como se escribe un terminal en pantalla. El nombre interno se queda en
 * ASCII porque forma parte de las claves ("d1:catodo"); lo que lee el
 * estudiante lleva su tilde y su mayuscula.
 */
const NOMBRES_VISIBLES: Record<string, string> = {
  anodo: "ánodo",
  catodo: "cátodo",
  positivo: "positivo",
  negativo: "negativo",
  cursor: "cursor",
  ref: "referencia",
  a: "A",
  b: "B",
};

export function terminalVisible(nombre: string): string {
  return NOMBRES_VISIBLES[nombre] ?? nombre;
}

/* ------------------------------------------------------------ constructor */

export function crearComponente<T extends TipoComponente>(
  tipo: T,
  id: string,
  params: Partial<ParamsPorTipo[T]> = {},
  posicion: Punto = { x: 0, y: 0 },
  rotacion = 0,
): Componente<T> {
  const plantilla = PLANTILLAS[tipo];
  return {
    id,
    tipo,
    params: { ...(plantilla.params as ParamsPorTipo[T]), ...params },
    terminales: plantilla.terminales.map((t) => ({ ...t })),
    posicion,
    rotacion,
    estado: { quemado: false },
  };
}

export function crearCable(
  id: string,
  desde: RefTerminal,
  hasta: RefTerminal,
  trazado?: Punto[],
): Cable {
  return trazado ? { id, desde, hasta, trazado } : { id, desde, hasta };
}

/** Atajo para armar circuitos en pruebas y en los datos de las lecciones. */
export function cable(id: string, desde: string, hasta: string): Cable {
  return crearCable(id, refDesdeClave(desde), refDesdeClave(hasta));
}

export function circuitoVacio(): Circuito {
  return { componentes: [], cables: [] };
}

/* ------------------------------------------------------ claves y consultas */

/** Clave canonica de un terminal: "r1:a". */
export function claveTerminal(componenteId: string, terminal: string): string {
  return `${componenteId}:${terminal}`;
}

export function claveDeRef(ref: RefTerminal): string {
  return claveTerminal(ref.componenteId, ref.terminal);
}

export function refDesdeClave(clave: string): RefTerminal {
  const corte = clave.indexOf(":");
  if (corte < 0) {
    throw new Error(`Clave de terminal invalida: "${clave}". Se espera "id:terminal".`);
  }
  return {
    componenteId: clave.slice(0, corte),
    terminal: clave.slice(corte + 1),
  };
}

export function componentePorId(
  circuito: Circuito,
  id: string,
): Componente | undefined {
  return circuito.componentes.find((c) => c.id === id);
}

/** Todas las claves de terminal de un componente. */
export function terminalesDe(componente: Componente): string[] {
  return componente.terminales.map((t) => claveTerminal(componente.id, t.nombre));
}

/** Todas las claves de terminal del circuito. */
export function todosLosTerminales(circuito: Circuito): string[] {
  return circuito.componentes.flatMap(terminalesDe);
}

/**
 * Comprueba que los cables apunten a terminales que existen.
 * Es un error de programa, no del estudiante: la interfaz no permite crear
 * un cable hacia la nada. Por eso aqui si se lanza.
 */
export function verificarIntegridad(circuito: Circuito): void {
  const existentes = new Set(todosLosTerminales(circuito));
  for (const c of circuito.cables) {
    for (const ref of [c.desde, c.hasta]) {
      const clave = claveDeRef(ref);
      if (!existentes.has(clave)) {
        throw new Error(
          `El cable ${c.id} apunta a "${clave}", que no existe en el circuito.`,
        );
      }
    }
  }
  const ids = new Set<string>();
  for (const comp of circuito.componentes) {
    if (ids.has(comp.id)) {
      throw new Error(`Hay dos componentes con el id "${comp.id}".`);
    }
    ids.add(comp.id);
  }
}

/* ------------------------------------------------------------- union-find */

class UnionFind {
  private padre = new Map<string, string>();

  agregar(x: string): void {
    if (!this.padre.has(x)) this.padre.set(x, x);
  }

  buscar(x: string): string {
    let raiz = this.padre.get(x) ?? x;
    if (raiz === x) return x;
    raiz = this.buscar(raiz);
    this.padre.set(x, raiz); // compresion de camino
    return raiz;
  }

  unir(a: string, b: string): void {
    this.agregar(a);
    this.agregar(b);
    const ra = this.buscar(a);
    const rb = this.buscar(b);
    if (ra !== rb) this.padre.set(ra, rb);
  }
}

/* ------------------------------------------------------------------- red */

/**
 * Netlist derivada del circuito. Es lo que consume el estampado de la matriz.
 * Se recalcula desde cero: nunca se guarda ni se sincroniza.
 */
export interface Red {
  /** Ids de nodo en orden estable: "n0", "n1", ... */
  nodos: string[];
  /** claveTerminal -> nodoId */
  nodoDe: Map<string, string>;
  /** nodoId -> claves de terminal que caen en el */
  terminalesEn: Map<string, string[]>;
}

/**
 * Reparte los terminales en nodos electricos.
 *
 * Dos reglas de union:
 *   1. Cada cable une los dos terminales que conecta.
 *   2. TODOS los simbolos de tierra son el mismo nodo, aunque no haya un
 *      cable entre ellos. Es la convencion del esquematico, y no aplicarla
 *      seria una trampa para el estudiante.
 */
export function construirRed(circuito: Circuito): Red {
  verificarIntegridad(circuito);

  const uf = new UnionFind();
  const terminales = todosLosTerminales(circuito);
  for (const t of terminales) uf.agregar(t);

  for (const c of circuito.cables) {
    uf.unir(claveDeRef(c.desde), claveDeRef(c.hasta));
  }

  const tierras = circuito.componentes
    .filter((c) => c.tipo === "tierra")
    .flatMap(terminalesDe);
  for (let i = 1; i < tierras.length; i++) {
    uf.unir(tierras[0]!, tierras[i]!);
  }

  // Numeracion estable: por el orden en que aparecen los terminales.
  const idPorRaiz = new Map<string, string>();
  const nodoDe = new Map<string, string>();
  const terminalesEn = new Map<string, string[]>();

  for (const t of terminales) {
    const raiz = uf.buscar(t);
    let nodoId = idPorRaiz.get(raiz);
    if (!nodoId) {
      nodoId = `n${idPorRaiz.size}`;
      idPorRaiz.set(raiz, nodoId);
      terminalesEn.set(nodoId, []);
    }
    nodoDe.set(t, nodoId);
    terminalesEn.get(nodoId)!.push(t);
  }

  return { nodos: [...terminalesEn.keys()], nodoDe, terminalesEn };
}

/** Nodo en el que cae un terminal. Lanza si el terminal no existe. */
export function nodoDeTerminal(
  red: Red,
  componenteId: string,
  terminal: string,
): string {
  const nodo = red.nodoDe.get(claveTerminal(componenteId, terminal));
  if (!nodo) {
    throw new Error(
      `El terminal "${claveTerminal(componenteId, terminal)}" no esta en la red.`,
    );
  }
  return nodo;
}

/**
 * Cuantos cables llegan a un terminal. Cero significa que quedo al aire.
 */
export function gradoDeTerminal(circuito: Circuito, clave: string): number {
  let n = 0;
  for (const c of circuito.cables) {
    if (claveDeRef(c.desde) === clave) n++;
    if (claveDeRef(c.hasta) === clave) n++;
  }
  return n;
}
