import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// Versión que se ve en el juego: la de package.json (súbela tú al sacar una versión: 1.0.0 → 1.1.0)
// + el commit de GitHub que construyó Vercel, para saber exactamente qué está publicado.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
const commit = (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7);
const built = new Date().toISOString().slice(0, 10);

// Páginas: el juego (index.html), la galería de cartas (cartas.html) el editor de fusiones (fusiones.html) y el de cartas (editor-cartas.html).
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD__: JSON.stringify(commit ? `${built} · ${commit}` : built),
  },
  build: {
    rolldownOptions: {
      input: {
        main: 'index.html',
        cartas: 'cartas.html',
        fusiones: 'fusiones.html',
        editorCartas: 'editor-cartas.html',
        descargar: 'descargar.html',
      },
    },
  },
});
