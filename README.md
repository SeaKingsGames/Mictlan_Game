# Cartas — juego de cartas prehispánico

Juego de cartas estilo Yu-Gi-Oh! Forbidden Memories con mitología prehispánica.
Stack: TypeScript + Vite + HTML/CSS · Supabase (después) · Vercel.

## Comandos

```bash
npm install        # solo la primera vez
npm run dev        # juego en http://localhost:5173 · galería de cartas en /cartas.html
                   # (también en tu red local para probar en el celular)
npm test           # corre los tests del motor
npm run build      # build de producción en dist/ (lo que publica Vercel)
```

## Carpetas

```
src/
  data/     types.ts, cards.json, decks.json, cardDatabase.ts   ← datos de diseño (solo lectura)
  core/     CardInstance.ts, DuelState.ts, DuelEngine.ts, deck.ts, rng.ts, fusion.ts  ← motor en TypeScript puro
  ai/       aiPlayer.ts                                         ← IA sencilla
  html/     cardElement.ts, card.css                            ← dibujo de cartas en HTML/CSS
            DuelView.ts, duel.css                               ← tablero del duelo
            gallery.ts                                          ← página /cartas.html
tests/      data.test.ts, duel.test.ts                          ← Vitest
```

## Reglas del proyecto

- `src/core` y `src/data` no tocan el DOM ni Supabase.
- Las definiciones de carta no se modifican en partida; lo que cambia vive en `CardInstance`.
- Por red y en base de datos solo viajan IDs.

## Agregar una carta

Edita `src/data/cards.json` con un `id` nuevo (único, mayor que 0) y corre `npm test`.
Si algo está mal (ID repetido, etiqueta inexistente, más de 3 copias en un mazo), el test te lo dice.

## Arte de las cartas

1. Guarda la imagen en `public/cards/` con el ID de la carta, por ejemplo `public/cards/3.webp` (512 × 512 px, .webp o .jpg).
2. En `src/data/cards.json`, agrega a esa carta: `"art": "/cards/3.webp"`.
3. Si el archivo no existe, la carta sigue mostrando su inicial.

## Páginas

- `/` — el juego: menú (`#/`), mazo y colección (`#/mazo`), campaña (`#/campana`), duelo libre (`#/libre`)
- `/cartas.html` — galería de cartas
- `/fusiones.html` — editor de fusiones (descarga el `fusions.json`)
- `/editor-cartas.html` — editor de cartas y arte (descarga el `cards.json` y las imágenes)

## Campaña y progreso

- Rivales en `src/data/duelists.json` (mazo de 40, dificultad 1-3, botín y carta firma).
- Colección inicial en `src/data/starter.json`.
- Tu progreso (colección, mazo, rivales vencidos) se guarda en el navegador. Se reinicia desde Menú → Herramientas.
- El nombre del juego está en `src/game/config.ts`.
