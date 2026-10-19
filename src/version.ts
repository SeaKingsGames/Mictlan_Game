declare const __APP_VERSION__: string;
declare const __APP_BUILD__: string;

/** Versión del juego (de package.json) y cuándo/qué commit se construyó. */
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const APP_BUILD: string = typeof __APP_BUILD__ === 'string' ? __APP_BUILD__ : '';
export const versionLabel = (): string => `v${APP_VERSION}${APP_BUILD ? ` · ${APP_BUILD}` : ''}`;
