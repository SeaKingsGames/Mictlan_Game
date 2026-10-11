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
