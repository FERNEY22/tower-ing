/* =========================================================================
   firebaseApp.ts — Una sola instancia de la app de Firebase.

   La usan el almacén (Realtime Database) y la autenticación del panel
   docente. initializeApp() lanza si se llama dos veces con el mismo nombre,
   así que la inicialización vive aquí y en ningún otro sitio.
   ========================================================================= */

import { initializeApp, type FirebaseApp } from "firebase/app";

export const CONFIG_FIREBASE = {
  apiKey: import.meta.env?.VITE_FB_API_KEY ?? "",
  authDomain: import.meta.env?.VITE_FB_AUTH_DOMAIN ?? "",
  databaseURL: import.meta.env?.VITE_FB_DATABASE_URL ?? "",
  projectId: import.meta.env?.VITE_FB_PROJECT_ID ?? "",
  storageBucket: import.meta.env?.VITE_FB_STORAGE_BUCKET ?? "",
  messagingSenderId: import.meta.env?.VITE_FB_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env?.VITE_FB_APP_ID ?? "",
};

/** True si hay configuración suficiente para hablar con Firebase. */
export function hayConfiguracion(): boolean {
  return Boolean(CONFIG_FIREBASE.databaseURL && CONFIG_FIREBASE.apiKey);
}

let app: FirebaseApp | null = null;

export function obtenerApp(): FirebaseApp {
  if (!hayConfiguracion()) {
    throw new Error(
      "Falta la configuración de Firebase. Copia .env.example a .env y " +
        "completa las variables VITE_FB_*, o usa VITE_ALMACEN=memoria.",
    );
  }
  app ??= initializeApp(CONFIG_FIREBASE);
  return app;
}
