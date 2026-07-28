/* =========================================================================
   auth.ts — Autenticación del panel docente.

   En producción es Firebase Auth: el correo del docente se autoriza en la
   consola y las reglas de la base hacen el resto. Sin configuración de
   Firebase no hay autenticación posible, así que en desarrollo se usa una
   simulada — y la interfaz LO DICE, en grande. Una puerta falsa silenciosa
   es peor que no tener puerta.
   ========================================================================= */

import { hayConfiguracion, obtenerApp } from "@/plataforma/almacen/firebaseApp";

export interface Docente {
  email: string;
}

export interface Autenticacion {
  /** True si esta autenticación no protege nada de verdad. */
  readonly esSimulada: boolean;
  iniciar(email: string, contrasena: string): Promise<void>;
  cerrar(): Promise<void>;
  /** Avisa de los cambios de sesión. Devuelve la función para dejar de oír. */
  observar(alCambiar: (docente: Docente | null) => void): () => void;
}

/* --------------------------------------------------------------- firebase */

class AutenticacionFirebase implements Autenticacion {
  readonly esSimulada = false;

  private async auth() {
    const { getAuth } = await import("firebase/auth");
    return getAuth(obtenerApp());
  }

  async iniciar(email: string, contrasena: string): Promise<void> {
    const { signInWithEmailAndPassword } = await import("firebase/auth");
    try {
      await signInWithEmailAndPassword(await this.auth(), email, contrasena);
    } catch (e) {
      throw new Error(traducirError(e));
    }
  }

  async cerrar(): Promise<void> {
    const { signOut } = await import("firebase/auth");
    await signOut(await this.auth());
  }

  observar(alCambiar: (docente: Docente | null) => void): () => void {
    let cancelar: (() => void) | null = null;
    let cancelado = false;

    void (async () => {
      const { onAuthStateChanged } = await import("firebase/auth");
      const desuscribir = onAuthStateChanged(await this.auth(), (u) => {
        alCambiar(u?.email ? { email: u.email } : null);
      });
      if (cancelado) desuscribir();
      else cancelar = desuscribir;
    })();

    return () => {
      cancelado = true;
      cancelar?.();
    };
  }
}

/** Traduce los códigos de Firebase a algo que se pueda leer. */
function traducirError(e: unknown): string {
  const codigo =
    typeof e === "object" && e && "code" in e ? String((e as { code: string }).code) : "";

  switch (codigo) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera un momento antes de reintentar.";
    case "auth/network-request-failed":
      return "No hay conexión con el servidor de autenticación.";
    default:
      return e instanceof Error ? e.message : "No se pudo iniciar sesión.";
  }
}

/* ---------------------------------------------------------------- memoria */

/** Contraseña de la autenticación simulada. No protege nada; es de juguete. */
export const CONTRASENA_SIMULADA = "docente";

class AutenticacionSimulada implements Autenticacion {
  readonly esSimulada = true;
  private actual: Docente | null = null;
  private oyentes = new Set<(d: Docente | null) => void>();

  async iniciar(email: string, contrasena: string): Promise<void> {
    if (!email.includes("@")) throw new Error("Escribe un correo válido.");
    if (contrasena !== CONTRASENA_SIMULADA) {
      throw new Error("Correo o contraseña incorrectos.");
    }
    this.actual = { email };
    this.avisar();
  }

  async cerrar(): Promise<void> {
    this.actual = null;
    this.avisar();
  }

  observar(alCambiar: (docente: Docente | null) => void): () => void {
    this.oyentes.add(alCambiar);
    alCambiar(this.actual);
    return () => this.oyentes.delete(alCambiar);
  }

  private avisar(): void {
    for (const o of this.oyentes) o(this.actual);
  }
}

/* --------------------------------------------------------------- fachada */

export const autenticacion: Autenticacion = hayConfiguracion()
  ? new AutenticacionFirebase()
  : new AutenticacionSimulada();
