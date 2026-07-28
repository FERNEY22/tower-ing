/* =========================================================================
   newton.ts — Iteracion de Newton-Raphson para los elementos no lineales.

   El bucle es corto; lo que importa son las cuatro defensas que lo rodean, y
   ninguna es opcional:

   1. Limitacion del paso de tension (en modelos/union.ts). Sin ella, el
      primer salto mete un exponente de 200 en la exponencial y no se vuelve.
   2. Saturacion del exponente, con continuacion lineal (idem).
   3. gmin, y su escalonamiento cuando la iteracion directa no converge.
   4. Criterio DOBLE de convergencia: tension Y corriente. Solo con el de
      tension hay falsos positivos —dos iteraciones seguidas pueden quedar
      cerca sin que el circuito cumpla las leyes de Kirchhoff— y el
      estudiante se llevaria un resultado que no es solucion de nada.

   El residuo de corriente sale gratis: como el sistema lineal se resuelve
   exactamente, lo unico que separa la solucion de la verdad es la diferencia
   entre la corriente real del dispositivo y la de su modelo compañero.
   ========================================================================= */

import { MOTOR } from "@/config";
import {
  claveTerminal,
  type Circuito,
  type Componente,
  type Red,
} from "./circuito";
import { Diagnosticos, type Diagnostico } from "./diagnostico";
import { resolverSistema, SistemaSingular, type Vector } from "./matriz";
import {
  companionDe,
  dispositivoDe,
  type DispositivoNoLineal,
  type ModeloCompanion,
} from "./modelos";
import {
  conduce,
  construirSistema,
  tensionDeNodo,
  terminalesCableados,
} from "./mna";
import {
  construirSolucion,
  type PuntoUnion,
  type Solucion,
} from "./solverLineal";
import { validarTopologia, type Referencia } from "./topologia";

/** Dispositivo no lineal ya situado en la red. */
interface UnionEnRed {
  dispositivo: DispositivoNoLineal;
  nodoAnodo: string;
  nodoCatodo: string;
}

function recogerUniones(circuito: Circuito, red: Red): UnionEnRed[] {
  const cableados = terminalesCableados(circuito);
  const uniones: UnionEnRed[] = [];

  for (const comp of circuito.componentes) {
    if (!conduce(comp, cableados)) continue;
    const dispositivo = dispositivoDe(comp);
    if (!dispositivo) continue;

    uniones.push({
      dispositivo,
      nodoAnodo: red.nodoDe.get(claveTerminal(comp.id, "anodo"))!,
      nodoCatodo: red.nodoDe.get(claveTerminal(comp.id, "catodo"))!,
    });
  }

  return uniones;
}

/** True si el circuito tiene algun elemento que exija iterar. */
export function tieneNoLineales(circuito: Circuito): boolean {
  const cableados = terminalesCableados(circuito);
  return circuito.componentes.some(
    (c: Componente) => conduce(c, cableados) && dispositivoDe(c) !== null,
  );
}

/* -------------------------------------------------------- criterios */

/**
 * Criterio de tension: |Δv| < reltol·|v| + vntol en TODOS los nodos.
 * Necesario, pero por si solo insuficiente.
 */
function convergioEnTension(anterior: Vector, actual: Vector): boolean {
  for (let i = 0; i < actual.length; i++) {
    const v = actual[i]!;
    const delta = Math.abs(v - anterior[i]!);
    if (delta >= MOTOR.reltol * Math.abs(v) + MOTOR.vntol) return false;
  }
  return true;
}

/* ------------------------------------------------------------- resultado */

export interface ResultadoNewton extends Solucion {
  /** True si se necesito escalonar gmin para llegar a la solucion. */
  uso_escalonamiento: boolean;
  /** Residuo de corriente alcanzado, en amperios. */
  residuoCorrienteA: number;
}

function fallo(diagnosticos: Diagnostico[], referencia: Referencia | null): ResultadoNewton {
  return {
    ok: false,
    tensiones: new Map(),
    componentes: new Map(),
    referencia,
    diagnosticos,
    iteraciones: 0,
    uso_escalonamiento: false,
    residuoCorrienteA: Infinity,
  };
}

/* ------------------------------------------------------------- iteracion */

/** Modelo compañero de cada union en su punto de operacion actual. */
function linealizar(
  uniones: UnionEnRed[],
  tensiones: ReadonlyMap<string, number>,
): Map<string, ModeloCompanion> {
  const companions = new Map<string, ModeloCompanion>();
  for (const u of uniones) {
    const v = tensiones.get(u.dispositivo.id) ?? 0;
    companions.set(u.dispositivo.id, companionDe(u.dispositivo.evaluar(v), v));
  }
  return companions;
}

interface Intento {
  convergio: boolean;
  x: Vector;
  iteraciones: number;
  residuoCorrienteA: number;
  tensionesUnion: Map<string, number>;
  sistema: ReturnType<typeof construirSistema>;
}

/**
 * Una tanda completa de Newton con un gmin fijo, partiendo de las tensiones
 * de union que se le pasen. Devuelve el mejor punto alcanzado, converja o no,
 * para poder encadenar el escalonamiento de gmin.
 */
function iterar(
  circuito: Circuito,
  red: Red,
  referencia: Referencia,
  uniones: UnionEnRed[],
  gmin: number,
  tensionesIniciales: Map<string, number>,
): Intento {
  const tensionesUnion = new Map(tensionesIniciales);
  let xAnterior: Vector | null = null;
  let x: Vector = [];
  // Se arranca con las uniones ya linealizadas: construir el sistema sin
  // modelos compañeros seria pedirle al solver lineal que estampe un diodo.
  let sistema = construirSistema(circuito, red, referencia.nodoId, {
    gmin,
    companions: linealizar(uniones, tensionesUnion),
  });
  let residuoCorrienteA = Infinity;
  let iteraciones = 0;

  for (let k = 1; k <= MOTOR.maxIteraciones; k++) {
    iteraciones = k;

    // --- linealizar cada union en su punto de operacion actual
    const companions = linealizar(uniones, tensionesUnion);

    sistema = construirSistema(circuito, red, referencia.nodoId, {
      gmin,
      companions,
    });

    try {
      x = resolverSistema(sistema.A, sistema.b);
    } catch (e) {
      if (e instanceof SistemaSingular) {
        return {
          convergio: false,
          x: xAnterior ?? [],
          iteraciones: k,
          residuoCorrienteA: Infinity,
          tensionesUnion,
          sistema,
        };
      }
      throw e;
    }

    if (!x.every(Number.isFinite)) {
      return {
        convergio: false,
        x: xAnterior ?? [],
        iteraciones: k,
        residuoCorrienteA: Infinity,
        tensionesUnion,
        sistema,
      };
    }

    // --- nuevo punto de operacion de cada union, con el paso limitado
    residuoCorrienteA = 0;
    let escalaCorrienteA = 0;
    const siguientes = new Map<string, number>();

    for (const u of uniones) {
      const vViejo = tensionesUnion.get(u.dispositivo.id) ?? 0;
      const vCrudo =
        tensionDeNodo(sistema, x, u.nodoAnodo) -
        tensionDeNodo(sistema, x, u.nodoCatodo);
      const vLimitado = u.dispositivo.limitar(vCrudo, vViejo);
      siguientes.set(u.dispositivo.id, vLimitado);

      // Residuo de corriente: lo que separa al dispositivo real de su modelo
      // compañero en el punto recien resuelto.
      const companion = companions.get(u.dispositivo.id)!;
      const real = u.dispositivo.evaluar(vCrudo).i;
      const modelo = companion.Geq * vCrudo + companion.Ieq;
      residuoCorrienteA = Math.max(residuoCorrienteA, Math.abs(real - modelo));
      escalaCorrienteA = Math.max(escalaCorrienteA, Math.abs(real));
    }

    const estableEnTension = xAnterior !== null && convergioEnTension(xAnterior, x);
    const estableEnCorriente =
      residuoCorrienteA <
      MOTOR.abstol + MOTOR.epsilonCorriente * escalaCorrienteA;

    for (const [id, v] of siguientes) tensionesUnion.set(id, v);
    xAnterior = x;

    // Las dos condiciones a la vez. Nunca una sola.
    if (estableEnTension && estableEnCorriente) {
      return {
        convergio: true,
        x,
        iteraciones: k,
        residuoCorrienteA,
        tensionesUnion,
        sistema,
      };
    }
  }

  return {
    convergio: false,
    x,
    iteraciones,
    residuoCorrienteA,
    tensionesUnion,
    sistema,
  };
}

/* --------------------------------------------------------------- fachada */

export interface OpcionesNewton {
  gmin?: number;
  /** Permite desactivar el escalonamiento para probar la convergencia cruda. */
  permitirEscalonamiento?: boolean;
}

export function resolverNoLineal(
  circuito: Circuito,
  opciones: OpcionesNewton = {},
): ResultadoNewton {
  const topologia = validarTopologia(circuito);
  if (!topologia.ok || !topologia.referencia) {
    return fallo(topologia.diagnosticos, topologia.referencia);
  }

  const { red, referencia } = topologia;
  const uniones = recogerUniones(circuito, red);
  const gminBase = opciones.gmin ?? MOTOR.gmin;
  const permitirEscalonamiento = opciones.permitirEscalonamiento ?? true;

  // --- intento directo
  let intento = iterar(circuito, red, referencia, uniones, gminBase, new Map());
  let usoEscalonamiento = false;
  let iteracionesTotales = intento.iteraciones;

  // --- escalonamiento de gmin: se arranca con una fuga grande, que hace el
  //     circuito facil de resolver, y se va reduciendo por decadas usando
  //     cada solucion como punto de partida de la siguiente.
  if (!intento.convergio && permitirEscalonamiento) {
    usoEscalonamiento = true;
    let tensiones = new Map<string, number>();

    for (let gmin = MOTOR.gminInicial; gmin > gminBase; gmin /= 10) {
      const paso = iterar(circuito, red, referencia, uniones, gmin, tensiones);
      iteracionesTotales += paso.iteraciones;
      tensiones = paso.tensionesUnion;
      if (!paso.convergio) break;
    }

    intento = iterar(circuito, red, referencia, uniones, gminBase, tensiones);
    iteracionesTotales += intento.iteraciones;
  }

  if (!intento.convergio) {
    return {
      ...fallo(
        [...topologia.diagnosticos, Diagnosticos.noConverge()],
        referencia,
      ),
      iteraciones: iteracionesTotales,
      uso_escalonamiento: usoEscalonamiento,
      residuoCorrienteA: intento.residuoCorrienteA,
    };
  }

  // --- punto de operacion final de cada union, para el resultado
  const puntos = new Map<string, PuntoUnion>();
  for (const u of uniones) {
    const v =
      tensionDeNodo(intento.sistema, intento.x, u.nodoAnodo) -
      tensionDeNodo(intento.sistema, intento.x, u.nodoCatodo);
    puntos.set(u.dispositivo.id, {
      tensionV: v,
      corrienteA: u.dispositivo.evaluar(v).i,
    });
  }

  const solucion = construirSolucion(
    circuito,
    red,
    referencia,
    intento.sistema,
    intento.x,
    topologia.diagnosticos,
    iteracionesTotales,
    puntos,
  );

  return {
    ...solucion,
    uso_escalonamiento: usoEscalonamiento,
    residuoCorrienteA: intento.residuoCorrienteA,
  };
}
