const { authed, missingConfig, clean, readJson } = require('./_lib');

const isBlobUrl = (u) => {
  try {
    const x = new URL(u);
    return x.hostname.endsWith('.blob.vercel-storage.com') && x.pathname.startsWith('/leads/');
  } catch (e) {
    return false;
  }
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const isPublicPost = req.method === 'POST';
    const missing = missingConfig(!isPublicPost);
    if (missing.length) return res.status(503).json({ error: 'not_configured', missing });

    const blob = await import('@vercel/blob');

    if (isPublicPost) {
      const b = req.body && typeof req.body === 'object' ? req.body : {};
      if (b.web) return res.status(200).json({ ok: true }); // honeypot
      const lead = {
        createdAt: new Date().toISOString(),
        nombre: clean(b.nombre, 120),
        email: clean(b.email, 160),
        telefono: clean(b.telefono, 40),
        tipo: clean(b.tipo, 80),
        fecha: clean(b.fecha, 40),
        ciudad: clean(b.ciudad, 100),
        asistentes: clean(b.asistentes, 30),
        mensaje: clean(b.mensaje, 2000),
      };
      const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email);
      if (lead.nombre.length < 2 || (!okEmail && lead.telefono.length < 6)) {
        return res.status(400).json({ error: 'invalid' });
      }
      const key = `leads/${Date.now()}.json`;
      await blob.put(key, JSON.stringify(lead), {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: true,
      });
      return res.status(200).json({ ok: true });
    }

    if (!authed(req)) {
      await new Promise((r) => setTimeout(r, 600));
      return res.status(401).json({ error: 'unauthorized' });
    }

    if (req.method === 'GET') {
      const { blobs } = await blob.list({ prefix: 'leads/', limit: 500 });
      const rows = await Promise.all(
        blobs.map(async (x) => {
          try {
            const j = await readJson(blob, x.pathname);
            return j ? { ...j, _url: x.url } : null;
          } catch (e) {
            return null;
          }
        })
      );
      const leads = rows.filter(Boolean).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      return res.status(200).json({ leads });
    }

    if (req.method === 'DELETE') {
      const url = req.query && req.query.url;
      if (!isBlobUrl(url)) return res.status(400).json({ error: 'invalid_url' });
      await blob.del(url);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'method' });
  } catch (e) {
    return res.status(500).json({ error: 'server' });
  }
};
