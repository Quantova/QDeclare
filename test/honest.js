'use strict';

const q = require('..');
const { network, stamper, iso } = require('./chain');

async function honest() {
  const now = Math.floor(Date.now() / 1000);
  const net = network(now - 86400);
  const at = stamper(q, net);
  const K = {};
  for (const r of q.ROLES) K[r] = q.generateKey();
  const t0 = now - 80000;
  const registration = await at(q.registration({ key: K.ethics, declarantKeyId: q.keyId(K.declarant), office: 'Minister of Finance', legalBasis: 'Act 12', registeredAt: iso(t0) }), t0 + 5);
  const declaration = await at(q.declaration({ ledger: false, key: K.declarant, registration, period: '2025', content: Buffer.from('assets'), first: true, filedAt: iso(t0 + 100) }), t0 + 110);
  const acknowledgement = await at(q.acknowledgement({ key: K.ethics, declaration, deadline: iso(t0 + 1000), acknowledgedAt: iso(t0 + 1100) }), t0 + 1110);
  const review = await at(q.review({ key: K.reviewer, declaration, outcome: Buffer.from('no conflict found'), reviewedAt: iso(t0 + 2000) }), t0 + 2010);
  net.chain.block(now);
  const roles = Object.fromEntries(Object.entries(K).map(([r, k]) => [r + 'Keys', [q.keyId(k)]]));
  return { q, net, now, K, roles, at, all: { registration, declaration, acknowledgement, review } };
}

module.exports = { honest };
