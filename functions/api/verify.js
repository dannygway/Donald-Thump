// Cloudflare Pages Function: GET /api/verify
// Confirms a Stripe payment so the game can unlock the drinking game.
//   ?session=cs_...   the Checkout Session id Stripe adds to the success redirect
//   ?ref=abc123       the device reference passed as client_reference_id
// Environment variables (Cloudflare Pages > Settings > Environment variables):
//   STRIPE_SECRET_KEY  restricted key (Checkout Sessions read + write; write is for /api/checkout)
//   PAYMENT_LINKS      optional, comma-separated plink_... ids also accepted
// ?ping=1 reports whether payments are configured, so the game knows to show the paywall.
// Never put the key in index.html: it only lives here, on the server.

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
});

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (url.searchParams.has('ping')) return json({ configured: !!env.STRIPE_SECRET_KEY });
  if (!env.STRIPE_SECRET_KEY) return json({ paid: false, error: 'not configured' }, 500);
  const session = url.searchParams.get('session');
  const ref = url.searchParams.get('ref');
  const headers = { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` };
  const links = (env.PAYMENT_LINKS || '').split(',').map(s => s.trim()).filter(Boolean);
  // sessions made by /api/checkout carry metadata.app; payment-link sessions can be allow-listed
  const good = s => !!s && s.payment_status === 'paid' &&
    ((s.metadata && s.metadata.app === 'donald-thump') || links.includes(s.payment_link));

  try {
    if (session && /^cs_(test|live)_[A-Za-z0-9]+$/.test(session)) {
      const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${session}`, { headers });
      if (!r.ok) return json({ paid: false });
      return json({ paid: good(await r.json()) });
    }
    if (ref && /^[a-z0-9]{8,40}$/.test(ref)) {
      // recent completed sessions; fine at launch volumes (newest 100)
      const r = await fetch('https://api.stripe.com/v1/checkout/sessions?status=complete&limit=100', { headers });
      if (!r.ok) return json({ paid: false });
      const { data = [] } = await r.json();
      return json({ paid: data.some(s => s.client_reference_id === ref && good(s)) });
    }
  } catch (e) {
    return json({ paid: false }, 502);
  }
  return json({ paid: false }, 400);
}
