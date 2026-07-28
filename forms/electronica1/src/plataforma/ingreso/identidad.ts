/* =========================================================================
   identidad.ts — Validacion, hash y enmascarado de la cedula.

   Decision de diseño: la cedula completa no se persiste NUNCA, ni siquiera
   como clave. Se guarda su hash SHA-256 truncado y una mascara legible.
   El estudiante escribe su cedula, se hashea en el navegador y con ese hash
   se busca su registro. El docente solo ve ••••678.
   ========================================================================= */

import { IDENTIDAD } from "@/config";

export interface Identidad {
  nombre: string;
  /** Clave de todos los nodos. Hex, IDENTIDAD.hashLongitud caracteres. */
  ccHash: string;
  /** Unica forma legible que se persiste. Ej: "••••678" */
  ccMask: string;
}

export interface ResultadoValidacion {
  ok: boolean;
  /** Mensaje para mostrar bajo el formulario. Vacio si ok. */
  mensaje: string;
}

/** Deja solo digitos. */
export function soloDigitos(entrada: string): string {
  return (entrada ?? "").replace(/\D/g, "");
}

/** Colapsa espacios y recorta. */
export function normalizarNombre(entrada: string): string {
  return (entrada ?? "").replace(/\s+/g, " ").trim();
}

export function validarNombre(entrada: string): ResultadoValidacion {
  const n = normalizarNombre(entrada);
  if (n.length < IDENTIDAD.nombreMinCaracteres) {
    return { ok: false, mensaje: "Escribe tu nombre completo." };
  }
  if (!n.includes(" ")) {
    return { ok: false, mensaje: "Escribe nombre y apellido." };
  }
  return { ok: true, mensaje: "" };
}

export function validarCedula(entrada: string): ResultadoValidacion {
  const d = soloDigitos(entrada);
  if (d.length < IDENTIDAD.cedulaMinDigitos) {
    return {
      ok: false,
      mensaje: `La cédula debe tener al menos ${IDENTIDAD.cedulaMinDigitos} dígitos.`,
    };
  }
  if (d.length > IDENTIDAD.cedulaMaxDigitos) {
    return { ok: false, mensaje: "Esa cédula tiene demasiados dígitos." };
  }
  return { ok: true, mensaje: "" };
}

/** Ej: 1012345678 -> "••••678" */
export function enmascarar(cedula: string): string {
  const d = soloDigitos(cedula);
  const visibles = d.slice(-IDENTIDAD.mascaraDigitosVisibles);
  return "••••" + visibles;
}

/**
 * SHA-256 truncado, en hex. Usa Web Crypto: disponible en el navegador
 * (contexto seguro: localhost y https) y en Node 19+ para las pruebas.
 */
export async function hashCedula(cedula: string): Promise<string> {
  const d = soloDigitos(cedula);
  if (!d) throw new Error("Cédula vacía: no se puede derivar la clave.");

  const cripto = globalThis.crypto;
  if (!cripto?.subtle) {
    throw new Error(
      "Este navegador no expone Web Crypto. Abre la aplicación por http(s), " +
        "no con doble clic sobre el archivo.",
    );
  }

  const datos = new TextEncoder().encode(`${CURSO_SAL}:${d}`);
  const buffer = await cripto.subtle.digest("SHA-256", datos);
  const hex = Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, IDENTIDAD.hashLongitud);
}

/**
 * Sal fija del proyecto. No es un secreto —el bundle es publico— pero evita
 * que un hash de este juego sea comparable con el de cualquier otro sistema
 * que hashee cedulas sin sal.
 */
const CURSO_SAL = "electronica1-ean-2026";

/** Valida, hashea y arma la identidad completa. Lanza si algo no valida. */
export async function construirIdentidad(
  nombreEntrada: string,
  cedulaEntrada: string,
): Promise<Identidad> {
  const vn = validarNombre(nombreEntrada);
  if (!vn.ok) throw new Error(vn.mensaje);
  const vc = validarCedula(cedulaEntrada);
  if (!vc.ok) throw new Error(vc.mensaje);

  return {
    nombre: normalizarNombre(nombreEntrada),
    ccHash: await hashCedula(cedulaEntrada),
    ccMask: enmascarar(cedulaEntrada),
  };
}
