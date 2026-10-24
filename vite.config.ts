import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

/**
 * Arte por nombre de archivo, sin tocar los JSON:
 *   public/cards/101.jpg            → la carta 101   (virtual:card-arts)     · si la carta tiene "art", gana ese
 *   public/duelists/tianguis.webp   → el duelista "tianguis" (virtual:duelist-arts)
 * Acepta .webp, .png, .jpg; si hay varias, usa la .webp.
 */
function artFolder(name: string, folder: string, key: RegExp): Plugin {
  const id = `virtual:${name}`;
  const dir = new URL(`./public/${folder}/`, import.meta.url);
  const order = ['webp', 'png', 'jpg', 'jpeg'];
  const scan = () => {
    const map: Record<string, string> = {};
    if (!existsSync(dir)) return map;
    for (const f of readdirSync(dir)) {
      const m = /^(.+)\.(webp|png|jpe?g)$/i.exec(f);
      if (!m || !key.test(m[1])) continue;
      const prev = map[m[1]];
      if (!prev || order.indexOf(m[2].toLowerCase()) < order.indexOf(prev.split('.').pop()!.toLowerCase())) map[m[1]] = `/${folder}/${f}`;
    }
    return map;
  };
  const inFolder = new RegExp(`[\\\\/]public[\\\\/]${folder}[\\\\/]`);
  return {
    name,
    resolveId: x => (x === id ? '\0' + id : null),
    load: x => (x === '\0' + id ? `export default ${JSON.stringify(scan())};` : null),
    configureServer(server) {
      const reload = (file: string) => {
        if (!inFolder.test(file)) return;
        const mod = server.moduleGraph.getModuleById('\0' + id);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', reload);
      server.watcher.on('unlink', reload);
    },
  };
}

// Versión que se ve en el juego: la de package.json (súbela tú al sacar una versión: 1.0.0 → 1.1.0)
// + el commit de GitHub que construyó Vercel, para saber exactamente qué está publicado.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
const commit = (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7);
const built = new Date().toISOString().slice(0, 10);
// Huella única de cada build (el commit en Vercel; en tu compu, la hora). El juego la compara con /version.json.
const buildId = commit || new Date().toISOString();

/** Escribe dist/version.json: el botón "Buscar actualización" lo consulta para saber si hay versión nueva. */
function versionFile(): Plugin {
  return {
    name: 'version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: pkg.version, build: buildId }) });
    },
  };
}

// Páginas: el juego (index.html), la galería de cartas (cartas.html) el editor de fusiones (fusiones.html) y el de cartas (editor-cartas.html).
export default defineConfig({
  plugins: [versionFile(), artFolder('card-arts', 'cards', /^\d+$/), artFolder('duelist-arts', 'duelists', /^[a-z0-9-]+$/)],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD__: JSON.stringify(commit ? `${built} · ${commit}` : built),
    __APP_BUILD_ID__: JSON.stringify(buildId),
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
