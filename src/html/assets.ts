import VERSIONS from 'virtual:asset-versions';

/**
 * Dirección de un recurso (carta, retrato, imagen del menú, sonido) con su huella: "/cards/12.webp?v=1a2b3c4d".
 * Si cambias el archivo, cambia la huella y el juego baja el nuevo en vez de usar el guardado.
 * Lo que no está en la lista (imágenes en data:, rutas raras) se usa tal cual.
 */
export function assetUrl(path: string): string {
  const v = VERSIONS[path];
  return v ? `${path}?v=${v[0]}` : path;
}

/** Todos los recursos del juego: [dirección con huella, bytes]. Es lo que baja "Descargar recursos". */
export function allAssets(): [string, number][] {
  return Object.entries(VERSIONS).map(([path, [v, size]]) => [`${path}?v=${v}`, size]);
}
