// Lo genera vite.config.ts: número de carta → archivo en public/cards/
declare module 'virtual:card-arts' {
  const arts: Record<number, string>;
  export default arts;
}
