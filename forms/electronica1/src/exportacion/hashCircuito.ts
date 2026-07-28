/* =========================================================================
   hashCircuito.ts — Huella corta de un circuito.

   Cumple dos funciones, las dos de la especificación:
     · identificar circuitos idénticos entregados por equipos distintos;
     · permitir al docente comprobar que una captura corresponde al trabajo
       registrado.

   Por eso la huella se calcula sobre lo ELÉCTRICO, no sobre el dibujo: dos
   estudiantes que monten el mismo circuito con los componentes en otro sitio
   y con otros identificadores obtienen la misma huella. Mover una resistencia
   por el lienzo no cambia el trabajo entregado.

   LÍMITE CONOCIDO: la canonicalización ordena los nodos por su contenido, no
   resuelve isomorfismo de grafos. Dos circuitos distintos con exactamente la
   misma composición por nodo podrían colisionar. Para un curso es de sobra;
   no es una función criptográfica de identidad.
   ========================================================================= */

import { EXPORTACION } from "@/config";
import {
  claveTerminal,
  construirRed,
  type Circuito,
  type Componente,
} from "@/motor/circuito";

/** JSON con las claves ordenadas, para que el orden no altere la huella. */
function paramsCanonicos(comp: Componente): string {
  const params = comp.params as Record<string, unknown>;
  const claves = Object.keys(params).sort();
  return claves
    .map((k) => {
      const v = params[k];
      // Los números se normalizan: 680 y 680.0 son el mismo componente.
      return `${k}=${typeof v === "number" ? Number(v.toPrecision(12)) : String(v)}`;
    })
    .join(",");
}

/**
 * Forma canónica del circuito: sin posiciones, sin rotaciones y sin los
 * identificadores que haya puesto cada quien.
 */
export function formaCanonica(circuito: Circuito): string {
  if (!circuito.componentes.length) return "vacio";

  const red = construirRed(circuito);

  // Cada nodo se describe por lo que hay conectado a él, usando el TIPO de
  // componente y no su id. Así R1 y R7 no distinguen dos montajes iguales.
  const descripcionDeNodo = new Map<string, string>();
  for (const [nodoId, terminales] of red.terminalesEn) {
    const partes = terminales
      .map((clave) => {
        const id = clave.slice(0, clave.indexOf(":"));
        const terminal = clave.slice(clave.indexOf(":") + 1);
        const comp = circuito.componentes.find((c) => c.id === id)!;
        return `${comp.tipo}:${terminal}`;
      })
      .sort();
    descripcionDeNodo.set(nodoId, partes.join("+"));
  }

  // Numeración canónica: por descripción, con desempate estable.
  const ordenados = [...descripcionDeNodo.entries()].sort((a, b) =>
    a[1] === b[1] ? a[0].localeCompare(b[0]) : a[1].localeCompare(b[1]),
  );
  const indiceDeNodo = new Map<string, number>();
  ordenados.forEach(([nodoId], i) => indiceDeNodo.set(nodoId, i));

  const lineas = circuito.componentes
    .map((comp) => {
      const conexiones = comp.terminales
        .map((t) => {
          const nodo = red.nodoDe.get(claveTerminal(comp.id, t.nombre))!;
          return `${t.nombre}@${indiceDeNodo.get(nodo)}`;
        })
        .join(",");
      const quemado = comp.estado.quemado ? "|quemado" : "";
      return `${comp.tipo}[${paramsCanonicos(comp)}]{${conexiones}}${quemado}`;
    })
    .sort();

  return lineas.join(";");
}

/**
 * Huella corta en mayúsculas, del largo que diga config. Se imprime en la
 * marca de agua del PNG y se guarda con el circuito.
 */
export async function hashCircuito(circuito: Circuito): Promise<string> {
  const canonica = formaCanonica(circuito);

  const cripto = globalThis.crypto;
  if (!cripto?.subtle) {
    throw new Error(
      "Este navegador no expone Web Crypto. Abre la aplicación por http(s).",
    );
  }

  const datos = new TextEncoder().encode(canonica);
  const buffer = await cripto.subtle.digest("SHA-256", datos);
  const hex = Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hex.slice(0, EXPORTACION.hashLongitud).toUpperCase();
}
