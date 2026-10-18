# Guía: cuentas en la nube con Supabase

Con esto cada jugador tiene cuenta (correo o invitado), y su colección, mazo, cacao, jade y campaña viven en la nube.
**Los premios los decide el servidor**: el navegador manda tus jugadas, el servidor repite el duelo con la misma semilla y solo si ganaste de verdad te da cartas y cacao. Así nadie se regala cartas editando el navegador.

Sin configurar nada, el juego sigue funcionando en **modo local** (como hasta ahora).

---

## 1. Crear el proyecto

1. Entra a <https://supabase.com> → **New project**.
2. Ponle nombre (ej. `cartas-quinto-sol`), una contraseña de base de datos (guárdala) y la región más cercana a tus jugadores.
3. Espera 1–2 minutos a que termine.

## 2. Crear las tablas

1. En el menú de la izquierda: **SQL Editor** → **New query**.
2. Abre el archivo `supabase/migrations/20261012000000_init.sql`, copia **todo** y pégalo.
3. Botón **Run**. Debe decir *Success. No rows returned*.

Esto crea: `profiles` (nombre, cacao, jade, victorias), `collection`, `decks`, `campaign_progress`, `duels`, las reglas de seguridad y el alta automática (cada cuenta nueva recibe las cartas y el mazo inicial).

> Si algún día cambias `starter.json`, avísame y genero una migración nueva; el SQL tiene esas cartas escritas.

## 3. Configurar el inicio de sesión

En **Authentication → Sign In / Providers**:

- **Allow anonymous sign-ins**: actívalo (es el botón "Jugar como invitado").
- **Email → Confirm email**: mientras pruebas, **apágalo** para entrar sin confirmar el correo. Cuando publiques, puedes encenderlo.

En **Authentication → URL Configuration**:

- **Site URL**: la dirección de tu juego en Vercel (ej. `https://tu-juego.vercel.app`). Ahí llevan los correos de confirmación.

## 4. Subir las funciones del servidor

Son dos: `duel-start` (da la semilla) y `duel-finish` (repite el duelo y paga). Se suben desde la terminal, en la carpeta del proyecto:

```bash
npx supabase login
npx supabase link --project-ref TU_REF
npm run build:server
npx supabase functions deploy duel-start --use-api
npx supabase functions deploy duel-finish --use-api
```

- `TU_REF` es el código de tu proyecto: lo ves en la URL del panel (`supabase.com/dashboard/project/TU_REF`) o en **Project Settings → General**.
- `--use-api` sube sin necesitar Docker.
- No tienes que configurar llaves en las funciones: Supabase les pone `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` solo.

## 5. Conectar el juego

1. En Supabase: **Project Settings → API Keys** (o **Data API**). Copia la **Project URL** y la llave **anon** / **publishable** (la pública).
   ⚠️ **Nunca** uses la llave `service_role` / `secret` en el juego: esa da control total.
2. **En tu compu**: copia `.env.example` como `.env.local` y pega los dos valores. `npm run dev` ya pedirá iniciar sesión.
3. **En Vercel**: tu proyecto → **Settings → Environment Variables**, agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` → luego **Deployments → Redeploy**.

## 6. Probar

1. Abre el juego → **Jugar como invitado** (o crea cuenta).
2. Arriba a la derecha ves 🫘 cacao y ◆ jade.
3. Gana un duelo: aparece "Guardando resultado…" y luego tus premios.
4. En Supabase → **Table Editor → duels** ves cada duelo con `status = finished` y sus premios. Si alguna vez ves `rejected`, la columna `rewards` dice por qué.

---

## Cuando cambies cartas, fusiones o duelistas

El servidor tiene su **propia copia** de las reglas y los datos. Si cambias `cards.json`, `fusions.json` o `duelists.json`:

```bash
npm run build:server
npx supabase functions deploy duel-start --use-api
npx supabase functions deploy duel-finish --use-api
```

y sube el juego a Vercel como siempre. Si se te olvida, el juego avisa *"El juego se actualizó. Recarga la página."* en vez de pagar premios con reglas distintas. (`npm test` también falla si olvidaste `build:server`.)

## Cosas a saber

- **El progreso del modo local no se pasa a la nube.** Si se pudiera importar, cualquiera podría inventarse una colección. Todos empiezan con el mazo inicial.
- **Invitado**: su cuenta vive en ese navegador. Con **Guardar mi cuenta** (en el menú) le pone correo y contraseña sin perder nada.
- **Rendirse o salir** cuenta como derrota en la nube.
- Los duelos que se dejan a medias quedan como `active` y no dan nada.

## Qué hay en cada archivo

| Archivo | Para qué |
| --- | --- |
| `supabase/migrations/…_init.sql` | Tablas, seguridad, alta de jugador y `settle_duel` (paga una sola vez por duelo) |
| `supabase/functions/duel-start` | Revisa rival desbloqueado y mazo válido; da semilla |
| `supabase/functions/duel-finish` | Repite el duelo; si ganaste, premia |
| `supabase/functions/_shared/game.js` | Reglas del juego empaquetadas (**generado**, no editar) |
| `src/server/rules.ts` | Lo que corre el servidor, en TypeScript con pruebas |
| `src/net/cloud.ts` | Todo lo que el juego le pide a Supabase |
| `src/html/LoginView.ts` | Pantalla de entrar / crear cuenta / invitado |

---

## Fase B: niveles y ascensión (actualización)

Esta actualización agrega **una migración nueva** y **una función nueva**.

1. **SQL nuevo**: en Supabase → **SQL Editor** → **New query**, pega TODO `supabase/migrations/20261017000000_progresion.sql` y dale **Run**. (No vuelvas a correr el primer archivo `_init.sql`.)
2. **Funciones** (en la terminal):
   ```bash
   npm run build:server
   npx supabase functions deploy duel-start --use-api
   npx supabase functions deploy duel-finish --use-api
   npx supabase functions deploy card-upgrade --use-api
   ```
3. `npm test` y sube todo a GitHub.

| Archivo nuevo | Para qué |
| --- | --- |
| `supabase/migrations/…_progresion.sql` | Columna `level` en la colección, niveles guardados en cada duelo, `level_up_card` y `ascend_card` |
| `supabase/functions/card-upgrade` | Sube de nivel (cobra cacao) o asciende (gasta 3 copias) |
| `src/core/progression.ts` | Las reglas: costos por rareza, +100 por nivel, efectos +25% desde nivel 3 |

---

## Multijugador (salas con código)

1. **SQL nuevo**: SQL Editor → pega TODO `supabase/migrations/20261018000000_multijugador.sql` → **Run**. Crea la tabla de salas, su seguridad y activa Realtime para ella.
2. **Funciones**:
   ```bash
   npm run build:server
   npx supabase functions deploy pvp --use-api
   npx supabase functions deploy duel-start --use-api
   npx supabase functions deploy duel-finish --use-api
   npx supabase functions deploy card-upgrade --use-api
   ```
3. `npm test` y sube a GitHub.

**Cómo funciona**: uno crea sala y comparte el código de 5 letras; el otro entra con él. Cada jugada pasa por la función `pvp`, que repite la partida y rechaza lo inválido. Ganar da 30 de cacao (máximo 5 victorias con premio al día y 2 contra el mismo rival). Si alguien no juega en 2 minutos, el otro puede reclamar la victoria.

**Límite conocido**: el duelo se calcula en cada navegador, así que alguien con conocimientos técnicos podría ver la mano del rival. Para jugar entre amigos está bien; antes de emparejamiento con desconocidos o ranking, el servidor deberá mandar a cada uno solo su información.

**Probarlo solo**: abre el juego en dos navegadores distintos (o uno normal y otro en modo incógnito) con dos cuentas diferentes, por ejemplo una con correo y otra de invitado.
