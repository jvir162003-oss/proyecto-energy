const crypto = require('crypto');

function safeEq(a, b) {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

function authed(req) {
  const pass = process.env.ADMIN_PASSWORD;
  const sent = req.headers['x-admin-password'];
  return Boolean(pass) && Boolean(sent) && safeEq(sent, pass);
}

function missingConfig(needAdmin) {
  const m = [];
  if (!process.env.BLOB_READ_WRITE_TOKEN) m.push('BLOB_READ_WRITE_TOKEN');
  if (needAdmin && !process.env.ADMIN_PASSWORD) m.push('ADMIN_PASSWORD');
  return m;
}

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);

module.exports = { authed, missingConfig, clean };
