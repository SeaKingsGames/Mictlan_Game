import { defineConfig } from 'vite';

// Páginas: el juego (index.html), la galería de cartas (cartas.html) el editor de fusiones (fusiones.html) y el de cartas (editor-cartas.html).
export default defineConfig({
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
