/* =========================================================================
   topologia.ts — Las cinco comprobaciones previas al solver.

   Se ejecutan ANTES de estampar la matriz y producen diagnosticos, no
   excepciones. Su proposito no es proteger al solver: es decirle al
   estudiante que le falto conectar.

   Criterio de conduccion
   ----------------------
   Para la topologia, todo componente de dos o mas terminales une sus
   terminales, SIN MIRAR su estado. Un interruptor abierto y un componente
   quemado siguen contando como camino.

   Es deliberado: un interruptor abierto es un circuito perfectamente valido,
   y si lo tratasemos como corte, cada circuito con un interruptor abierto
   dispararia cinco avisos de nodo flotante. El corte real lo resuelve el
   solver con gmin, que para eso esta.
   ========================================================================= */

import {
  claveDeRef,
  claveTerminal,
  construirRed,
  gradoDeTerminal,
  refDesdeClave,
  terminalesDe,
  type Circuito,
  type Componente,
  type Red,
} from "./circuito";
import {
  Diagnosticos,
  hayErrores,
  type Diagnostico,
} from "./diagnostico";

export interface Referencia {
  nodoId: string;
  /** De donde salio: un simbolo de tierra o el negativo de una fuente. */
  origen: "tierra" | "fuente";
  componenteId: string;
}

export interface ResultadoTopologia {
  /** True si el circuito se puede intentar resolver. */
  ok: boolean;
  red: Red;
  referencia: Referencia | null;
  diagnosticos: Diagnostico[];
}

/* ------------------------------------------------------------ referencia */

/**
 * Elige el nodo de 0 V.
 *   1. Si hay tierra, esa manda.
 *   2. Si no, el negativo de la fuente DC de menor tension, y se avisa.
 */
function elegirReferencia(
  circuito: Circuito,
  red: Red,
  diagnosticos: Diagnostico[],
): Referencia | null {
  const tierra = circuito.componentes.find((c) => c.tipo === "tierra");
  if (tierra) {
    return {
      nodoId: red.nodoDe.get(claveTerminal(tierra.id, "ref"))!,
      origen: "tierra",
      componenteId: tierra.id,
    };
  }

  const fuentes = circuito.componentes.filter(
    (c): c is Componente<"fuenteDC"> => c.tipo === "fuenteDC",
  );
  if (!fuentes.length) {
    diagnosticos.push(Diagnosticos.sinReferenciaPosible());
    return null;
  }

  // "De menor potencial": la fuente de menor tension. Empate: la primera.
  const elegida = fuentes.reduce((menor, f) =>
    f.params.tensionV < menor.params.tensionV ? f : menor,
  );

  diagnosticos.push(Diagnosticos.referenciaAsignada(elegida.id, "negativo"));

  return {
    nodoId: red.nodoDe.get(claveTerminal(elegida.id, "negativo"))!,
    origen: "fuente",
    componenteId: elegida.id,
  };
}

/* ------------------------------------------------------- grafo de nodos */

/**
 * Adyacencia entre nodos: dos nodos son vecinos si un componente los une.
 *
 * Solo cuentan los terminales que tienen algun cable. Un terminal al aire es
 * un callejon sin salida y no puede propagar conectividad: si contase, una
 * resistencia colgada de un solo extremo haria "alcanzable" su propio
 * terminal suelto y jamas detectariamos un nodo flotante.
 */
function grafoDeNodos(
  componentes: Componente[],
  red: Red,
  cableados: Set<string>,
): Map<string, Set<string>> {
  const vecinos = new Map<string, Set<string>>();
  for (const nodo of red.nodos) vecinos.set(nodo, new Set());

  for (const comp of componentes) {
    const nodos = terminalesDe(comp)
      .filter((t) => cableados.has(t))
      .map((t) => red.nodoDe.get(t)!);

    // Los terminales conectados de un componente se consideran unidos entre si.
    for (let i = 0; i < nodos.length; i++) {
      for (let j = i + 1; j < nodos.length; j++) {
        const a = nodos[i]!;
        const b = nodos[j]!;
        if (a === b) continue;
        vecinos.get(a)!.add(b);
        vecinos.get(b)!.add(a);
      }
    }
  }
  return vecinos;
}

/** Terminales que tienen al menos un cable. Se calcula una sola vez. */
function terminalesCableados(circuito: Circuito): Set<string> {
  const cableados = new Set<string>();
  for (const c of circuito.cables) {
    cableados.add(claveDeRef(c.desde));
    cableados.add(claveDeRef(c.hasta));
  }
  return cableados;
}

function alcanzablesDesde(
  origen: string,
  vecinos: Map<string, Set<string>>,
): Set<string> {
  const vistos = new Set<string>([origen]);
  const pila = [origen];
  while (pila.length) {
    const actual = pila.pop()!;
    for (const v of vecinos.get(actual) ?? []) {
      if (!vistos.has(v)) {
        vistos.add(v);
        pila.push(v);
      }
    }
  }
  return vistos;
}

/* ------------------------------------------------- caminos de resistencia 0 */

/**
 * Grafo de conductores ideales: solo cables (ya fusionados en nodos) e
 * interruptores cerrados. Si los dos bornes de una fuente caen en la misma
 * componente de este grafo, hay cortocircuito.
 */
function grafoIdeal(
  componentes: Componente[],
  red: Red,
): Map<string, Set<string>> {
  const vecinos = new Map<string, Set<string>>();
  for (const nodo of red.nodos) vecinos.set(nodo, new Set());

  for (const comp of componentes) {
    if (comp.tipo !== "interruptor") continue;
    const params = comp.params as { cerrado: boolean };
    if (!params.cerrado || comp.estado.quemado) continue;

    const nodos = terminalesDe(comp).map((t) => red.nodoDe.get(t)!);
    const a = nodos[0]!;
    const b = nodos[1]!;
    if (a === b) continue;
    vecinos.get(a)!.add(b);
    vecinos.get(b)!.add(a);
  }
  return vecinos;
}

/* --------------------------------------------------------- comprobaciones */

/** 1. Componentes en el lienzo sin un solo cable. */
function detectarComponentesSueltos(
  circuito: Circuito,
  diagnosticos: Diagnostico[],
): Componente[] {
  const sueltos: Componente[] = [];
  for (const comp of circuito.componentes) {
    const grados = terminalesDe(comp).map((t) => gradoDeTerminal(circuito, t));
    if (grados.every((g) => g === 0)) {
      sueltos.push(comp);
      diagnosticos.push(Diagnosticos.componenteSuelto(comp.id, comp.tipo));
    }
  }
  return sueltos;
}

/** 2. Terminales cableados a nada, sin camino a la referencia. */
function detectarNodosFlotantes(
  circuito: Circuito,
  componentesActivos: Componente[],
  red: Red,
  alcanzables: Set<string>,
  diagnosticos: Diagnostico[],
): void {
  for (const comp of componentesActivos) {
    // La tierra de un solo terminal no puede "quedar al aire": ella es el 0 V.
    if (comp.tipo === "tierra") continue;

    for (const terminal of comp.terminales) {
      const clave = claveTerminal(comp.id, terminal.nombre);
      const nodoId = red.nodoDe.get(clave)!;
      const sinCable = gradoDeTerminal(circuito, clave) === 0;

      if (sinCable && !alcanzables.has(nodoId)) {
        diagnosticos.push(
          Diagnosticos.nodoFlotante(comp.id, comp.tipo, terminal.nombre, nodoId),
        );
      }
    }
  }
}

/** 3. Bornes de una fuente unidos por un camino sin resistencia. */
function detectarCortocircuitos(
  componentesActivos: Componente[],
  red: Red,
  diagnosticos: Diagnostico[],
): void {
  const ideal = grafoIdeal(componentesActivos, red);

  for (const comp of componentesActivos) {
    if (comp.tipo !== "fuenteDC") continue;

    const positivo = red.nodoDe.get(claveTerminal(comp.id, "positivo"))!;
    const negativo = red.nodoDe.get(claveTerminal(comp.id, "negativo"))!;

    if (positivo === negativo) {
      diagnosticos.push(Diagnosticos.cortocircuitoFuente(comp.id, positivo, true));
      continue;
    }
    if (alcanzablesDesde(positivo, ideal).has(negativo)) {
      diagnosticos.push(
        Diagnosticos.cortocircuitoFuente(comp.id, positivo, false),
      );
    }
  }
}

/** 4. Islas de circuito que no tocan la referencia. */
function detectarSubcircuitosAislados(
  componentesActivos: Componente[],
  red: Red,
  alcanzables: Set<string>,
  cableados: Set<string>,
  diagnosticos: Diagnostico[],
): void {
  // Un componente esta aislado si NINGUNO de sus nodos alcanza la referencia.
  const aislados = componentesActivos.filter((comp) => {
    const nodos = terminalesDe(comp).map((t) => red.nodoDe.get(t)!);
    return nodos.every((n) => !alcanzables.has(n));
  });
  if (!aislados.length) return;

  // Se agrupan en islas para dar un aviso por isla, no uno por componente.
  const vecinos = grafoDeNodos(aislados, red, cableados);
  const visitados = new Set<string>();

  for (const comp of aislados) {
    const primerNodo = red.nodoDe.get(terminalesDe(comp)[0]!)!;
    if (visitados.has(primerNodo)) continue;

    const isla = alcanzablesDesde(primerNodo, vecinos);
    for (const n of isla) visitados.add(n);

    const enLaIsla = aislados.filter((c) =>
      terminalesDe(c).some((t) => isla.has(red.nodoDe.get(t)!)),
    );
    diagnosticos.push(
      Diagnosticos.grafoDesconectado(
        enLaIsla.map((c) => c.id),
        [...isla],
      ),
    );
  }
}

/* ------------------------------------------------------------- fachada */

export function validarTopologia(circuito: Circuito): ResultadoTopologia {
  const diagnosticos: Diagnostico[] = [];
  const red = construirRed(circuito);

  // 1. Los componentes sin ningun cable se apartan: todavia no son circuito.
  const sueltos = detectarComponentesSueltos(circuito, diagnosticos);
  const sueltosIds = new Set(sueltos.map((c) => c.id));
  const activos = circuito.componentes.filter((c) => !sueltosIds.has(c.id));

  // 2. Referencia: tierra explicita, o negativo de la fuente menor.
  const referencia = elegirReferencia(circuito, red, diagnosticos);

  if (referencia) {
    const cableados = terminalesCableados(circuito);
    const vecinos = grafoDeNodos(activos, red, cableados);
    const alcanzables = alcanzablesDesde(referencia.nodoId, vecinos);

    detectarNodosFlotantes(circuito, activos, red, alcanzables, diagnosticos);
    detectarCortocircuitos(activos, red, diagnosticos);
    detectarSubcircuitosAislados(
      activos,
      red,
      alcanzables,
      cableados,
      diagnosticos,
    );
  }

  return {
    ok: !hayErrores(diagnosticos),
    red,
    referencia,
    diagnosticos,
  };
}

/** Atajo para la interfaz: solo los diagnosticos de un codigo. */
export function diagnosticosDe(
  resultado: ResultadoTopologia,
  codigo: Diagnostico["codigo"],
): Diagnostico[] {
  return resultado.diagnosticos.filter((d) => d.codigo === codigo);
}

/** Terminales implicados en los diagnosticos, para resaltarlos en el lienzo. */
export function terminalesSeñalados(resultado: ResultadoTopologia): string[] {
  const claves = new Set<string>();
  for (const d of resultado.diagnosticos) {
    for (const t of d.terminales) claves.add(t);
  }
  return [...claves].filter((c) => {
    try {
      refDesdeClave(c);
      return true;
    } catch {
      return false;
    }
  });
}
