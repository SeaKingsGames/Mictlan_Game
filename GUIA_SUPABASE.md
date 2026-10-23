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

## Tienda de sobres (jade)

1. **SQL nuevo**: SQL Editor → pega TODO `supabase/migrations/20261019000000_sobres.sql` → **Run**. Córrelo **una sola vez**: además de crear la tabla y la función, regala 300 de jade a las cuentas que ya existen (las nuevas empiezan con 300).
2. **Funciones** (todas, porque cambió la huella de datos):
   ```bash
   npm run build:server
   npx supabase functions deploy pack-open --use-api
   npx supabase functions deploy duel-start --use-api
   npx supabase functions deploy duel-finish --use-api
   npx supabase functions deploy card-upgrade --use-api
   npx supabase functions deploy pvp --use-api
   ```
3. `npm test` y sube a GitHub.

**Cómo funciona**: 3 sobres temáticos de 100 de jade con 5 cartas cada uno. Cada carta sale N 60% · R 28% · SR 10% · UR 2%. Si abres 10 sobres seguidos sin UR, el décimo trae una UR segura (el contador es por cuenta, para todos los sobres). Las repetidas (ya tenías 3) se vuelven cacao y jade como en los duelos. Qué sale lo decide el servidor (`pack-open`) y el cobro se hace en una sola transacción (`open_packs`).

**Editar los sobres**: `src/data/packs.json`. Cada sobre usa filtros en vez de una lista fija, así tus cartas nuevas entran solas:
- `monsters.tags` / `monsters.attributes`: monstruos con alguna de esas etiquetas o atributos.
- `support`: mágicas, equipos y trampas de esos atributos.
- `include` / `exclude`: ids que quieres meter o sacar a mano.
- Las cartas que solo salen por ascensión nunca vienen en sobres.

Si cambias `packs.json` o los precios, vuelve a correr `npm run build:server` y desplegar las funciones (como con las cartas).

| Archivo | Para qué |
|---|---|
| `supabase/migrations/…_sobres.sql` | Contador de garantía, jade inicial, historial `pack_opens` y `open_packs` |
| `supabase/functions/pack-open/` | Abre 1 o 10 sobres: tira las cartas y cobra |
| `src/game/packs.ts` | Reglas de los sobres (probabilidades, garantía, qué cartas entran) |

## Fusiones dentro de cada carta (editor de cartas)

En el editor de cartas, cada monstruo tiene la sección **⚗ Cómo surge esta carta**:
- **Sale por combinación genérica**: si está prendido, la carta puede salir por las reglas de etiquetas (ej. guerrero + jaguar). Apagado = `"noFusion": true`.
- **Por cartas específicas**: parejas exactas (carta A + carta B) que siempre dan esta carta. Se guardan en la misma carta: `"recipes": [[51, 15], [54, 5]]`.

Las recetas viejas de `fusions.json` siguen funcionando; si una pareja está en los dos lados, gana la de la carta. Como cambia `cards.json`, después de editar recetas haz lo de siempre: `npm run build:server`, desplegar funciones y `npm test`.

## Ruleta, mercado de cartas y multijugador seguro (actualización)

1. **SQL nuevo**: SQL Editor → pega TODO `supabase/migrations/20261020000000_ruleta_mercado_pvp.sql` → **Run** (una sola vez).
2. **Funciones** (todas; hay una nueva, `market`):
   ```bash
   npm run build:server
   npx supabase functions deploy market --use-api
   npx supabase functions deploy pvp --use-api
   npx supabase functions deploy duel-start --use-api
   npx supabase functions deploy duel-finish --use-api
   npx supabase functions deploy card-upgrade --use-api
   npx supabase functions deploy pack-open --use-api
   ```
3. `npm test` y sube a GitHub.

**Economía**: ganar un duelo da 10 de cacao + 1 ticket estándar (+ lo de las repetidas). Subir de nivel cuesta 3 veces más que antes. Los sobres cuestan 150 de jade.

**Ruleta** (`#/ruleta`): 1 ticket oro = 1 giro; el ticket oro cuesta 3000 de cacao. Premios: 1000 cacao 26% · 50 jade 18% · 25 tickets 16% · 1500 cacao 14% · 100 jade 8% · 50 tickets 8% · ticket oro 6% · la carta a la vista 4% (una R o SR que se ve antes de girar y cambia en cada giro). Se cambian en `src/game/roulette.ts`.

**Mercado de cartas** (`#/mercado`): 6 cartas al azar que se compran con cacao (N 300 · R 800 · SR 2000 · UR 10000), cada una una sola vez. Cada lugar tiene 3% de ser UR, así que no siempre hay. Se renueva gratis cada día (medianoche de México) o cuando quieras por 25 tickets. Se cambia en `src/game/cardShop.ts`.

**Multijugador seguro**: el navegador ya no recibe la semilla, el mazo del rival ni la lista de jugadas. La función `pvp` repite la partida y le manda a cada jugador solo lo que vería en la mesa. Los números de las cartas van disfrazados. Ahora sí se puede pensar en emparejamiento con desconocidos o ranking.

## Tienda de Jade con dinero real (Mercado Pago)

Los jugadores pagan en Mercado Pago (tarjeta, saldo o efectivo en OXXO) y el servidor entrega el jade **solo cuando Mercado Pago confirma el pago**. Los paquetes y precios están en `src/data/jade.json` (precio en pesos). La primera compra de cada paquete da doble jade. Las UR de regalo son al azar entre las que salen en sobres (nunca las cimas 96–100), primero las que el jugador no tiene.

### 1. Base de datos
SQL Editor → pega TODO `supabase/migrations/20261021000000_tienda_jade.sql` → **Run** (una sola vez).

### 2. Aplicación en Mercado Pago
1. [Mercado Pago Developers](https://www.mercadopago.com.mx/developers) → **Tus integraciones → Crear aplicación** (una solo para el juego). Elige **Pagos online → Checkout Pro**, sin plataforma de e‑commerce.
2. En la aplicación, copia el **Access Token de prueba** (empieza con `TEST-`).
3. Ponlo como secreto de Supabase (en la carpeta del juego). **Nunca** en Vercel, en el código ni en un chat:
   ```bash
   npx supabase secrets set MP_ACCESS_TOKEN=TEST-tu-token
   npx supabase secrets set SITE_URL=https://cartas.seakingsstudios.com
   ```

### 3. Funciones
```bash
npm run build:server
npx supabase functions deploy payments --use-api
npx supabase functions deploy mp-webhook --use-api --no-verify-jwt
npx supabase functions deploy duel-start --use-api
npx supabase functions deploy duel-finish --use-api
npx supabase functions deploy pvp --use-api
npx supabase functions deploy card-upgrade --use-api
npx supabase functions deploy pack-open --use-api
npx supabase functions deploy market --use-api
npm test
```
`mp-webhook` va con `--no-verify-jwt` porque quien la llama es Mercado Pago, no un jugador. Es seguro: con el aviso, la función vuelve a preguntar a Mercado Pago por el pago usando tu token, así que un aviso falso no entrega nada.

### 4. Webhooks (avisos de pago)
En tu aplicación de Mercado Pago → **Webhooks → Configurar notificaciones**:
- URL (modo prueba y modo productivo): `https://TU_REF.supabase.co/functions/v1/mp-webhook`
- Evento: **Pagos**.
- Guarda y copia la **clave secreta** que te da. Ponla en Supabase:
  ```bash
  npx supabase secrets set MP_WEBHOOK_SECRET=la-clave-secreta
  ```

### 5. Probar sin dinero real
1. Mercado Pago Developers → **Cuentas de prueba**: crea una de **vendedor** y una de **comprador**.
2. Entra al juego con una cuenta con correo → Tienda de Jade → compra cualquier paquete.
3. En Mercado Pago inicia sesión con la cuenta de **comprador de prueba** y paga con una [tarjeta de prueba](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards) (titular `APRO` = aprobado, `OTHE` = rechazado).
4. Al regresar, el juego dice "Confirmando tu pago…" y te muestra lo que llegó. En Supabase → Table Editor → `jade_orders` ves el pedido como `paid`.
5. Si algo no llega: Supabase → Edge Functions → `mp-webhook` / `payments` → **Logs**.

### 6. Cobrar de verdad
Cuando todo funcione: cambia el secreto por el **Access Token de producción** (empieza con `APP_USR-`) y activa las credenciales de producción en Mercado Pago:
```bash
npx supabase secrets set MP_ACCESS_TOKEN=APP_USR-tu-token
```
No hay que volver a subir funciones: leen el secreto en cada pago.

### Códigos de promoción (TikTok, sorteos)
SQL Editor:
```sql
-- 500 jade + 1 ticket oro, para las primeras 100 cuentas, durante 7 días
select public.create_promo_code('QUINTOSOL50', 500, 0, 1, 100, now() + interval '7 days', 'Live de TikTok');
-- 1 UR para una sola persona (premio de sorteo)
select public.create_promo_code('SORTEO-UR-01', 0, 1, 0, 1, null, 'Sorteo');
```
Cada cuenta puede canjear un código una sola vez. Para desactivar uno: `update public.redeem_codes set active = false where code = 'QUINTOSOL50';`

### Reembolsos
Si devuelves un pago desde Mercado Pago (o el banco lo desconoce), el aviso llega solo: se quita el jade y los tickets oro de esa compra que el jugador todavía tenga, y si era un regalo sin canjear, el código deja de servir.

### Qué hay en cada archivo
- `src/data/jade.json` — paquetes, precios (MXN), jade, UR, tickets oro.
- `src/game/jadeStore.ts` — reglas: doble primera compra, qué UR se regalan, formato de códigos.
- `src/html/JadeStoreView.ts` — la pantalla `#/jade`.
- `supabase/functions/payments` — crear cobro, revisar pedido, mis compras, canjear código.
- `supabase/functions/mp-webhook` — avisos de Mercado Pago.
- `supabase/functions/_shared/mp.ts` — habla con la API de Mercado Pago.
- `public/terminos.html` — términos de compra (borrador; revísalo).

## Expansiones (capítulos nuevos)

Cada expansión vive en `src/data/sets/<nombre>.json` con sus cartas, duelistas, sobres y reglas de fusión. No toca tu `cards.json`, `duelists.json` ni `fusions.json`: el juego los junta solo.

**Expansión 1 — La Guerra Florida** (`guerra-florida.json`, cartas 101–220):
- 3 sobres de 40 cartas (14 N · 13 R · 9 SR · 4 UR): Guerreros Jaguar (101–140), Guerreros Águila (141–180), Templo Mayor (181–220).
- 3 duelistas = Capítulo 2 de la campaña, después de Mictlantecuhtli: Ocelotl, Cuauhtli y Tlamacazqui. Cada uno suelta 34 cartas de su sobre; las 4 UR y 2 SR de cada sobre solo salen en sobres.
- Etiqueta nueva `sacerdote` con fusiones sacerdote + fuego / serpiente / muerte, y 18 recetas exactas entre cartas de la expansión.
- Las cartas nuevas no empeoran ninguna fusión de las cartas base (lo revisa `npm test`).

**Arte**: abre el editor de cartas, busca el número (101–220), sube la imagen y descarga `cards.json` + la imagen como siempre. Cuando una carta de la expansión ya está en tu `cards.json`, gana la de `cards.json` (así se guarda tu arte).

**Al subir una expansión**: `npm run build:server`, sube todas las funciones (cambia la huella de datos), `npm test` y push.
