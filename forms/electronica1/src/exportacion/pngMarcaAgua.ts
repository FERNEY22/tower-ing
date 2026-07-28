/* =========================================================================
   pngMarcaAgua.ts — Exportar el lienzo a PNG con marca de agua.

   La marca de agua lleva nombre, cédula enmascarada, lección o "práctica
   libre", fecha y hora, y la huella corta del circuito. Con eso el docente
   puede comprobar que la captura de un informe corresponde a un trabajo
   registrado, y detectar dos entregas del mismo montaje.

   UN DETALLE QUE NO ES OBVIO: al serializar un SVG para meterlo en un canvas,
   las hojas de estilo externas NO viajan con él. Sin inlinar los estilos
   calculados, el PNG sale en negro plano, sin trazos ni colores. Por eso se
   clona el SVG y se le copian los estilos antes de exportar.
   ========================================================================= */

import { EXPORTACION } from "@/config";

export interface DatosMarcaAgua {
  nombre: string;
  /** Cédula enmascarada. Nunca la completa. */
  ccMask: string;
  /** Título de la lección, o "Práctica libre". */
  contexto: string;
  /** Epoch ms del servidor. */
  ts: number;
  /** Huella corta del circuito. */
  hash: string;
}

/** Las dos líneas de la marca de agua, ya formateadas. */
export function textoMarcaAgua(datos: DatosMarcaAgua): [string, string] {
  const fecha = new Date(datos.ts).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return [
    `${datos.nombre} · C.C. ${datos.ccMask} · ${datos.contexto}`,
    `${fecha} · circuito ${datos.hash}`,
  ];
}

/** Rango de marcas diacríticas combinantes, para quitar tildes. */
const DIACRITICOS = /[̀-ͯ]/g;

/** Nombre de archivo sugerido, sin caracteres que molesten al sistema. */
export function nombreDeArchivo(datos: DatosMarcaAgua): string {
  const limpio = datos.contexto
    .normalize("NFD")
    .replace(DIACRITICOS, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `circuito-${limpio}-${datos.hash}.png`;
}

/* ------------------------------------------------------- estilos inline */

const PROPIEDADES = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "text-anchor",
  "letter-spacing",
  "display",
  "visibility",
];

/**
 * Clona el SVG con los estilos calculados ya escritos en cada elemento.
 * Sin esto el PNG sale sin estilos: las hojas externas no viajan.
 */
export function clonarConEstilos(svg: SVGSVGElement): SVGSVGElement {
  const copia = svg.cloneNode(true) as SVGSVGElement;

  const originales = [svg, ...Array.from(svg.querySelectorAll("*"))];
  const copias = [copia, ...Array.from(copia.querySelectorAll("*"))];

  originales.forEach((elemento, i) => {
    const destino = copias[i] as SVGElement | undefined;
    if (!destino) return;

    const calculado = globalThis.getComputedStyle?.(elemento);
    if (!calculado) return;

    const trozos: string[] = [];
    for (const prop of PROPIEDADES) {
      const valor = calculado.getPropertyValue(prop);
      if (valor && valor !== "none" && valor !== "normal") {
        trozos.push(`${prop}:${valor}`);
      }
    }
    if (trozos.length) destino.setAttribute("style", trozos.join(";"));
  });

  copia.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return copia;
}

/* ---------------------------------------------------------- exportacion */

const ALTO_MARCA = 46;

/**
 * Convierte el SVG del lienzo en un PNG con la marca de agua abajo y lo
 * descarga. Devuelve el nombre del archivo generado.
 */
export async function exportarPng(
  svg: SVGSVGElement,
  datos: DatosMarcaAgua,
): Promise<string> {
  const escala = EXPORTACION.escalaPng;
  const caja = svg.viewBox.baseVal;
  const ancho = caja?.width || svg.clientWidth || 900;
  const alto = caja?.height || svg.clientHeight || 560;

  const cadena = new XMLSerializer().serializeToString(clonarConEstilos(svg));
  const url =
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(cadena);

  const imagen = await cargarImagen(url);

  const lienzo = document.createElement("canvas");
  lienzo.width = ancho * escala;
  lienzo.height = (alto + ALTO_MARCA) * escala;

  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("Este navegador no permite exportar a PNG.");

  ctx.scale(escala, escala);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ancho, alto + ALTO_MARCA);
  ctx.drawImage(imagen, 0, 0, ancho, alto);

  // --- marca de agua
  ctx.fillStyle = "#f4f5f7";
  ctx.fillRect(0, alto, ancho, ALTO_MARCA);
  ctx.strokeStyle = "#e1e4e9";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, alto + 0.5);
  ctx.lineTo(ancho, alto + 0.5);
  ctx.stroke();

  const [linea1, linea2] = textoMarcaAgua(datos);
  ctx.fillStyle = "#23272e";
  ctx.font = "600 13px Inter, system-ui, sans-serif";
  ctx.fillText(linea1, 14, alto + 20);
  ctx.fillStyle = "#5a626e";
  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.fillText(linea2, 14, alto + 37);

  const nombre = nombreDeArchivo(datos);
  await descargar(lienzo, nombre);
  return nombre;
}

function cargarImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = () =>
      rechazar(new Error("No se pudo convertir el lienzo a imagen."));
    img.src = url;
  });
}

function descargar(lienzo: HTMLCanvasElement, nombre: string): Promise<void> {
  return new Promise((resolver) => {
    lienzo.toBlob((blob) => {
      if (!blob) return resolver();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      a.click();
      URL.revokeObjectURL(url);
      resolver();
    }, "image/png");
  });
}
