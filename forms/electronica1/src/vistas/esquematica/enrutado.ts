/* =========================================================================
   enrutado.ts — Trazado ortogonal de los cables y puntos de union.

   Un esquematico no lleva cables en diagonal. Cada cable se descompone en
   tramos horizontales y verticales, y donde confluyen tres o mas conexiones
   se dibuja un punto: sin el, un cruce de cables no se distingue de una
   union, que es una de las confusiones clasicas al leer un esquema.
   ========================================================================= */

import type { Circuito, Punto } from "@/motor/circuito";
import { claveDeRef } from "@/motor/circuito";
import { puntoDeClave, todosLosAnclajes } from "@/vistas/compartido/geometria";

/**
 * Ruta ortogonal entre dos puntos.
 *
 * Alineados: un solo tramo. Si no, tres tramos con el codo a media altura
 * horizontal, que es como se dibujan los esquemas de izquierda a derecha.
 */
export function rutaOrtogonal(desde: Punto, hasta: Punto): Punto[] {
  if (desde.x === hasta.x || desde.y === hasta.y) return [desde, hasta];

  const medioX = Math.round((desde.x + hasta.x) / 2);
  return [
    desde,
    { x: medioX, y: desde.y },
    { x: medioX, y: hasta.y },
    hasta,
  ];
}

/** La ruta convertida en atributo `d` de un <path> de SVG. */
export function rutaComoPath(puntos: Punto[]): string {
  if (!puntos.length) return "";
  const [primero, ...resto] = puntos;
  return (
    `M ${primero!.x} ${primero!.y}` +
    resto.map((p) => ` L ${p.x} ${p.y}`).join("")
  );
}

/** Ruta de un cable del circuito, respetando su trazado manual si lo tiene. */
export function rutaDeCable(
  circuito: Circuito,
  cableId: string,
): Punto[] | null {
  const cable = circuito.cables.find((c) => c.id === cableId);
  if (!cable) return null;

  const desde = puntoDeClave(circuito, claveDeRef(cable.desde));
  const hasta = puntoDeClave(circuito, claveDeRef(cable.hasta));
  if (!desde || !hasta) return null;

  if (cable.trazado?.length) return [desde, ...cable.trazado, hasta];
  return rutaOrtogonal(desde, hasta);
}

/**
 * Puntos donde hay que dibujar el nodo relleno: terminales a los que llegan
 * dos o mas cables (es decir, tres o mas conexiones contando el componente).
 */
export function puntosDeUnion(circuito: Circuito): Punto[] {
  const cablesPorClave = new Map<string, number>();

  for (const cable of circuito.cables) {
    for (const ref of [cable.desde, cable.hasta]) {
      const clave = claveDeRef(ref);
      cablesPorClave.set(clave, (cablesPorClave.get(clave) ?? 0) + 1);
    }
  }

  return todosLosAnclajes(circuito)
    .filter((a) => (cablesPorClave.get(a.clave) ?? 0) >= 2)
    .map((a) => a.punto);
}

/** Longitud total de una ruta. Se usa para colocar etiquetas. */
export function longitudDeRuta(puntos: Punto[]): number {
  let total = 0;
  for (let i = 1; i < puntos.length; i++) {
    total += Math.hypot(
      puntos[i]!.x - puntos[i - 1]!.x,
      puntos[i]!.y - puntos[i - 1]!.y,
    );
  }
  return total;
}

/** Punto medio de una ruta, medido a lo largo del recorrido. */
export function puntoMedioDeRuta(puntos: Punto[]): Punto {
  if (!puntos.length) return { x: 0, y: 0 };
  if (puntos.length === 1) return puntos[0]!;

  const mitad = longitudDeRuta(puntos) / 2;
  let recorrido = 0;

  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1]!;
    const b = puntos[i]!;
    const tramo = Math.hypot(b.x - a.x, b.y - a.y);

    if (recorrido + tramo >= mitad) {
      const t = tramo === 0 ? 0 : (mitad - recorrido) / tramo;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    recorrido += tramo;
  }

  return puntos[puntos.length - 1]!;
}
