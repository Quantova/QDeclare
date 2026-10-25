// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const q = require('..');
const { network, stamper, iso, failing } = require('./chain');

async function filed() {
  const now = Math.floor(Date.now() / 1000);
  const net = network(now - 86400);
  const at = stamper(q, net);
  const K = { ethics: q.generateKey(), declarant: q.generateKey(), reviewer: q.generateKey() };
  const t0 = now - 80000;
  const reg = await at(q.registration({ key: K.ethics, declarantKeyId: q.keyId(K.declarant), office: 'Minister of Finance', legalBasis: 'Act 12', registeredAt: iso(t0) }), t0 + 5);
  const decl = q.declaration({ ledger: false, key: K.declarant, registration: reg, period: '2025', content: Buffer.from('assets'), first: true, filedAt: iso(t0 + 100) });
  const timely = await at(decl, t0 + 110);
  const late = await at(decl, t0 + 5000);
  const ack = await at(q.acknowledgement({ key: K.ethics, declaration: timely, deadline: iso(t0 + 1000), acknowledgedAt: iso(t0 + 1100) }), t0 + 1110);
  net.chain.block(now);
  const roles = { ethicsKeys: [q.keyId(K.ethics)], declarantKeys: [q.keyId(K.declarant)], reviewerKeys: [q.keyId(K.reviewer)] };
  return { net, K, reg, decl, timely, late, ack, roles, t0 };
}

test('a timely declaration stays timely when later re-anchors are supplied in any order', async () => {
  const f = await filed();
  for (const records of [[f.reg, f.timely], [f.reg, f.late, f.timely], [f.reg, f.timely, f.late]]) {
    const r = await q.verify(f.ack, Object.assign({ type: 'acknowledgement', allSupplied: true, records }, f.roles, f.net.opts));
    assert.strictEqual(r.status, 'valid', failing(r).join('\n'));
    assert.deepStrictEqual(r.notices, []);
    assert.strictEqual(r.facts.onTime, true);
  }
  const only = await q.verify(f.ack, Object.assign({ type: 'acknowledgement', allSupplied: true, records: [f.reg, f.late] }, f.roles, f.net.opts));
  assert.strictEqual(only.status, 'invalid');
  assert.ok(only.checks.some((c) => c.name === 'timeliness' && !c.ok && /after the deadline/.test(c.detail)));
  assert.strictEqual(only.facts.onTime, false);
});

test('an unanchored declaration leaves filing in time unproven', async () => {
  const f = await filed();
  const r = await q.verify(f.ack, Object.assign({ type: 'acknowledgement', allSupplied: true, requireAnchor: false, records: [f.reg, f.decl] }, f.roles, f.net.opts));
  assert.strictEqual(r.status, 'indeterminate');
  assert.ok(r.checks.some((c) => c.name === 'timeliness' && !c.ok && /not anchored/.test(c.detail)), JSON.stringify(r.checks));
  assert.strictEqual(r.facts.onTime, null);
});

test('a period is written only as YYYY, YYYY-MM or YYYY-Qn and a second declaration for the same period must be a correction', async () => {
  const f = await filed();
  for (const period of ['fy2025', 'FY 2025', 'FY‑2025', '2025-1', '202501', '01/2025', '2025-q1']) {
    assert.throws(() => q.declaration({ ledger: false, key: f.K.declarant, registration: f.reg, period, content: Buffer.from('more'), previous: f.timely, filedAt: iso(f.t0 + 200) }), /YYYY, YYYY-MM or YYYY-Qn/, period);
  }
  assert.throws(() => q.declaration({ ledger: false, key: f.K.declarant, registration: f.reg, period: '2025', content: Buffer.from('more'), previous: f.timely, filedAt: iso(f.t0 + 200) }), /correction/);
  const next = q.declaration({ ledger: false, key: f.K.declarant, registration: f.reg, period: '2026', content: Buffer.from('more'), previous: f.timely, filedAt: iso(f.t0 + 200) });
  assert.strictEqual(next.statement.seq, 2);
});
