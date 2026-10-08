// GET /api/checkout?v=p99|p199&ref=<device ref>
// Creates a Stripe Checkout Session for the chosen price and redirects to it.
// Environment: STRIPE_SECRET_KEY (restricted key: Checkout Sessions read + write).
// Optional overrides: PRICE_P99, PRICE_P199. Price ids are not secret.

const PRICES = {
  p99: 'price_1UOLeB21oscoy67zXOcwCMra',   // 99p
  p199: 'price_1UOLeX21oscoy67z6URiBj2l'   // £1.99
};

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const v = url.searchParams.get('v') === 'p199' ? 'p199' : 'p99';
  const ref = url.searchParams.get('ref') || '';
  if (!env.STRIPE_SECRET_KEY) return new Response('Payments are not set up yet.', { status: 503 });
  if (!/^[a-z0-9]{8,40}$/.test(ref)) return new Response('Bad request', { status: 400 });
  const price = (v === 'p199' ? env.PRICE_P199 : env.PRICE_P99) || PRICES[v];
  // behind a proxy (Railway) trust the forwarded host/proto for the return address
  const host = request.headers.get('x-forwarded-host') || url.host;
  const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
  const origin = `${proto}://${host}`;
  const body = new URLSearchParams({
    mode: 'payment',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    client_reference_id: ref,
    'metadata[app]': 'donald-thump',
    'metadata[variant]': v,
    success_url: `${origin}/?paid={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/`
  });
  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' },
      body
    });
    const s = await r.json();
    if (!r.ok || !s.url) return new Response('Checkout is unavailable right now. Please try again.', { status: 502 });
    return new Response(null, { status: 303, headers: { location: s.url, 'cache-control': 'no-store' } });
  } catch (e) {
    return new Response('Checkout is unavailable right now. Please try again.', { status: 502 });
  }
}
