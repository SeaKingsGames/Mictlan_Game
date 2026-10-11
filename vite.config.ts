import { defineConfig } from 'vite';

// Dos páginas: el juego (index.html) y el prototipo de cartas en HTML/CSS (cartas.html).
export default defineConfig({
  build: {
    rolldownOptions: {
      input: {
        main: 'index.html',
        cartas: 'cartas.html',
      },
    },
  },
});
