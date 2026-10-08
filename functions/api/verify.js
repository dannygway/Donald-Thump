// Cloudflare Pages Function: GET /api/verify
// Confirms a Stripe payment so the game can unlock the drinking game.
//   ?session=cs_...   the Checkout Session id Stripe adds to the success redirect
//   ?ref=abc123       the device reference passed as client_reference_id
// Environment variables (Cloudflare Pages > Settings > Environment variables):
//   STRIPE_SECRET_KEY  a restricted key with read access to Checkout Sessions
//   PAYMENT_LINKS      optional, comma-separated plink_... ids to accept
// Never put the key in index.html: it only lives here, on the server.

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
});

export async function onRequestGet({ request, env }) {
  if (!env.STRIPE_SECRET_KEY) return json({ paid: false, error: 'not configured' }, 500);
  const url = new URL(request.url);
  const session = url.searchParams.get('session');
  const ref = url.searchParams.get('ref');
  const headers = { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` };
  const links = (env.PAYMENT_LINKS || '').split(',').map(s => s.trim()).filter(Boolean);
  const good = s => !!s && s.payment_status === 'paid' && (!links.length || links.includes(s.payment_link));

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
