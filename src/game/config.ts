/** Nombre del juego (provisional: cámbialo aquí y se actualiza en todo el menú). */
export const GAME_TITLE = 'Cartas del Quinto Sol';
export const GAME_SUBTITLE = 'Duelos de fusión de la mitología mexica';

/** Monedas del juego (la economía se implementa con Supabase). */
export const CURRENCY = {
  common: { name: 'Cacao', icon: '🫘' },   // moneda común: victorias, repetidas, vitrina, boleto de oro
  premium: { name: 'Jade', icon: '◆' },    // moneda valiosa: sobres
} as const;

/** Repetidas: cada copia arriba de 3 se convierte en esto. */
export const DUPLICATE_VALUE = {
  N: { cacao: 1, jade: 0 },
  R: { cacao: 2, jade: 1 },
  SR: { cacao: 3, jade: 2 },
  UR: { cacao: 5, jade: 5 },
} as const;
