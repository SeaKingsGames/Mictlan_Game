import { defineConfig } from 'vite';

// Páginas: el juego (index.html), la galería de cartas (cartas.html) y el editor de fusiones (fusiones.html).
export default defineConfig({
  build: {
    rolldownOptions: {
      input: {
        main: 'index.html',
        cartas: 'cartas.html',
        fusiones: 'fusiones.html',
      },
    },
  },
});
