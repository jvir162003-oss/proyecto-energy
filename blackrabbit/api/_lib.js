const crypto = require('crypto');

function safeEq(a, b) {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

function authed(req) {
  const pass = process.env.ADMIN_PASSWORD || process.env.AdminPassword || process.env.ADMINPASSWORD;
  const sent = req.headers['x-admin-password'];
  return Boolean(pass) && Boolean(sent) && safeEq(sent, pass);
}

const hasBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

// Lee un archivo JSON de un almacenamiento Blob privado.
async function readJson(blob, pathname) {
  try {
    const r = await blob.get(pathname, { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200 || !r.stream) return null;
    return JSON.parse(await new Response(r.stream).text());
  } catch (e) {
    return null;
  }
}

function missingConfig(needAdmin) {
  const m = [];
  if (!hasBlob()) m.push('BLOB_STORE_ID');
  if (needAdmin && !(process.env.ADMIN_PASSWORD || process.env.AdminPassword || process.env.ADMINPASSWORD)) m.push('ADMIN_PASSWORD');
  return m;
}

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);

module.exports = { authed, missingConfig, clean, hasBlob, readJson };
