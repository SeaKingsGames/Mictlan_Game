// Avisos de Mercado Pago (Webhooks). Mercado Pago llama aquí cuando un pago cambia.
// Se despliega SIN pedir sesión (verify_jwt = false en supabase/config.toml), porque quien llama es Mercado Pago.
// Es seguro: con el id del aviso se vuelve a consultar el pago en Mercado Pago con tu Access Token,
// así que un aviso inventado no entrega nada. Si pusiste MP_WEBHOOK_SECRET, además se revisa la firma.
import { admin, json } from '../_shared/http.ts';
import { getPayment, paymentsOfMerchantOrder, settlePayment, validSignature } from '../_shared/mp.ts';

Deno.serve(async req => {
  if (req.method !== 'POST') return json({ ok: true });
  const url = new URL(req.url);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* algunos avisos viejos vienen sin cuerpo */ }

  const type = String(body.type ?? url.searchParams.get('type') ?? url.searchParams.get('topic') ?? '');
  const data = (body.data ?? {}) as { id?: string | number };
  const id = String(url.searchParams.get('data.id') ?? data.id ?? url.searchParams.get('id') ?? '');
  if (!id || !/^[0-9A-Za-z-]+$/.test(id)) return json({ ok: true, ignored: 'sin id' });

  const secret = Deno.env.get('MP_WEBHOOK_SECRET');
  if (secret && req.headers.get('x-signature') && !(await validSignature(req, url.searchParams.get('data.id') ?? id, secret))) {
    console.warn('firma inválida', id);
    return json({ error: 'firma inválida' }, 401);
  }

  try {
    const db = admin();
    if (type === 'payment') {
      await settlePayment(db, await getPayment(id));
    } else if (type === 'merchant_order') {
      for (const p of await paymentsOfMerchantOrder(id)) await settlePayment(db, await getPayment(p));
    }
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    // 500 → Mercado Pago lo vuelve a intentar más tarde
    return json({ error: 'Error del servidor' }, 500);
  }
});
