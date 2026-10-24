// Los genera vite.config.ts a partir de los archivos en public/cards/ y public/duelists/
declare module 'virtual:card-arts' {
  const arts: Record<number, string>;
  export default arts;
}
declare module 'virtual:duelist-arts' {
  const arts: Record<string, string>;
  export default arts;
}
