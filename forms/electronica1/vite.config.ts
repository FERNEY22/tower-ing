import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  /**
   * El juego se publica dentro del sitio principal, en
   * tower-ing.com/forms/electronica1/ — no en la raiz de un dominio.
   *
   * Sin esto, el index.html construido pide /assets/index-xxx.js contra la raiz
   * del dominio, recibe un 404 y la pagina sale en blanco. Con base, los pide
   * en /forms/electronica1/assets/, que es donde estan.
   *
   * Si algun dia cambia la direccion, se cambia AQUI: el basename del router
   * sale de este mismo valor (App.tsx) y las reglas de _redirects de la raiz
   * del repositorio tienen que apuntar al mismo prefijo.
   */
  base: "/forms/electronica1/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: { outDir: "dist" },
  test: {
    // El motor es codigo puro: no necesita DOM. Si mas adelante se prueban
    // componentes de React, aqui se cambia a "jsdom".
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
