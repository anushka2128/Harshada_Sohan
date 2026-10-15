import { createHash, timingSafeEqual } from 'node:crypto';

const VISIBLE = 10, KEEP = 100, MAX_NAME = 60, MAX_MSG = 400; // the wall shows the newest 10; at most 100 are kept, oldest dropped first
const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
const hash = (t) => createHash('sha256').update(String(t)).digest('hex');
const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

/* store: { list(), get(key,{type}), setJSON(key,value), delete(key) }  (a Netlify Blobs store, or an in-memory one in tests)
   Every note is its own record. Only a SHA-256 hash of the writer's private delete key is kept, never the key itself. */
export async function handle(req, store, env = {}) {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const { blobs } = await store.list();
    const rows = await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' })));
    const items = rows.filter(Boolean).map(({ h, ...pub }) => pub).sort((a, b) => b.ts - a.ts).slice(0, VISIBLE);
    return json(items);
  }

  if (req.method === 'POST') {
    let b;
    try { b = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
    if (b && b.website) return json({ ok: true }, 201); // hidden spam-trap field: bots fill it, people never see it
    const name = clean(b.name, MAX_NAME), msg = clean(b.msg, MAX_MSG);
    const type = b.type === 'Ukhana' ? 'Ukhana' : 'Blessing';
    const token = String(b.token || '');
    if (!name || msg.length < 3 || token.length < 16 || token.length > 128) return json({ error: 'invalid' }, 400);
    const { blobs } = await store.list();
    if (blobs.length >= KEEP) { // keep the stack bounded: drop the oldest notes (keys sort by time)
      const old = blobs.map((x) => x.key).sort().slice(0, blobs.length - KEEP + 1);
      await Promise.all(old.map((k) => store.delete(k)));
    }
    const ts = Date.now();
    const id = ts.toString(36) + Math.random().toString(36).slice(2, 8);
    const note = { id, name, type, msg, ts, h: hash(token) };
    await store.setJSON('n_' + id, note);
    const { h, ...pub } = note;
    return json(pub, 201);
  }

  if (req.method === 'DELETE') {
    const id = clean(url.searchParams.get('id'), 40).replace(/[^a-z0-9]/gi, '');
    const note = id ? await store.get('n_' + id, { type: 'json' }) : null;
    if (!note) return json({ error: 'not_found' }, 404);
    const tok = req.headers.get('x-delete-token') || '';
    const adm = req.headers.get('x-admin-key') || '';
    const okOwner = tok && same(hash(tok), note.h);
    const okAdmin = env.ADMIN_KEY && adm && same(hash(adm), hash(env.ADMIN_KEY));
    if (!okOwner && !okAdmin) return json({ error: 'forbidden' }, 403);
    await store.delete('n_' + id);
    return json({ ok: true });
  }

  return json({ error: 'method_not_allowed' }, 405);
}
