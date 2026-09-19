const { authed, missingConfig, clean } = require('./_lib');

const KEYS = [
  'hero_a', 'hero_b', 'hero_lead', 'marca_lead',
  'prod_zero', 'prod_recover', 'prod_hydrate', 'prod_awake',
  'cta_title', 'cta_text', 'email', 'whatsapp', 'instagram',
];

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');
      if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(200).json({});
      const blob = await import('@vercel/blob');
      const { blobs } = await blob.list({ prefix: 'content.json', limit: 1 });
      if (!blobs.length) return res.status(200).json({});
      const r = await fetch(blobs[0].url + '?t=' + Date.now());
      return res.status(200).json(await r.json());
    }

    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'PUT') {
      const missing = missingConfig(true);
      if (missing.length) return res.status(503).json({ error: 'not_configured', missing });
      if (!authed(req)) {
        await new Promise((r) => setTimeout(r, 600));
        return res.status(401).json({ error: 'unauthorized' });
      }
      const b = req.body && typeof req.body === 'object' ? req.body : {};
      const out = {};
      for (const k of KEYS) if (typeof b[k] === 'string') out[k] = clean(b[k], 1500);
      const blob = await import('@vercel/blob');
      await blob.put('content.json', JSON.stringify(out), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 60,
      });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'method' });
  } catch (e) {
    return res.status(500).json({ error: 'server' });
  }
};
