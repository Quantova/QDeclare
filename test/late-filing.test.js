// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

'use strict';

const crypto = require('crypto');
const test = require('node:test');
const assert = require('node:assert');
const qstamp = require('@quantovainc/qstamp');
const q = require('..');
const { network, stamper, iso, bech32m } = require('./chain');

function receiptFor(env, time, height) {
  const digest = q.anchorDigest(env);
  const salt = crypto.randomBytes(32);
  const leaf = qstamp.leafHash('sha3-256', Buffer.from(digest, 'hex'), salt);
  const tn = qstamp.NETWORKS.testnet;
  return {
    format: qstamp.RECEIPT_FORMAT, chain: { id: tn.chainId, genesis: tn.genesis }, contract: tn.contract, kind: String(q.KIND),
    record: { alg: 'sha3-256', digest, salt: salt.toString('hex') }, proof: { index: 0, size: 1, path: [] }, root: leaf.toString('hex'),
    anchor: { tx: bech32m('QTX', crypto.randomBytes(32)), height, block: bech32m('QBK', crypto.randomBytes(32)), time, sender: bech32m('Q', crypto.randomBytes(32)) },
  };
}

function unanswered(txs) {
  const real = qstamp.verify;
  qstamp.verify = async (receipt, options) => (txs.has(receipt.anchor.tx)
    ? { valid: false, status: 'indeterminate', endpoints: [], checks: [{ name: 'transport', ok: false, detail: 'the endpoints did not answer', transport: true }] }
    : real(receipt, options));
  return () => {
    qstamp.verify = real;
  };
}

test('anchors the chain cannot answer never turn a filing proven late into an unknown one', async () => {
  const now = Math.floor(Date.now() / 1000);
  const net = network(now - 8000);
  const at = stamper(q, net);
  const K = { ethics: q.generateKey(), declarant: q.generateKey() };
  const roles = { ethicsKeys: [q.keyId(K.ethics)], declarantKeys: [q.keyId(K.declarant)] };
  const registration = await at(q.registration({ key: K.ethics, declarantKeyId: q.keyId(K.declarant), office: 'Office', legalBasis: 'Act 12', registeredAt: iso(now - 7000) }), now - 6990);
  const deadline = now - 4000;
  const decl = await at(q.declaration({ ledger: false, key: K.declarant, registration, period: '2001', content: Buffer.from('assets'), first: true, filedAt: iso(deadline - 100) }), deadline + 600);
  const ack = await at(q.acknowledgement({ key: K.ethics, declaration: decl, deadline: iso(deadline), acknowledgedAt: iso(deadline + 700) }), deadline + 710);
  net.chain.block(now);
  const run = (records) => q.verify(ack, Object.assign({ type: 'acknowledgement', at: iso(now), allSupplied: true, records: [registration].concat(records) }, roles, net.opts));
  const plain = await run([decl]);
  assert.strictEqual(plain.facts.onTime, false);
  const bare = Object.assign({}, decl);
  delete bare.anchor;
  const t = decl.anchor.anchor.time;
  const above = Array.from({ length: 8 }, (_, i) => Object.assign({}, bare, { anchor: receiptFor(bare, deadline - 50 - i, net.chain.height + 500 + i) }));
  const below = Object.assign({}, bare, { anchor: receiptFor(bare, deadline - 30, decl.anchor.anchor.height - 3) });
  const restore = unanswered(new Set(above.concat([below]).map((r) => r.anchor.anchor.tx)));
  try {
    const hidden = await run([decl].concat(above));
    assert.strictEqual(hidden.facts.onTime, false, JSON.stringify(hidden.checks.filter((c) => !c.ok)));
    const open = await run([decl, below]);
    assert.strictEqual(open.facts.onTime, false);
    assert.strictEqual(open.status, 'indeterminate');
    assert.ok(open.checks.some((c) => /earlier copies/.test(c.name) && !c.ok && c.indeterminate));
  } finally {
    restore();
  }
  assert.ok(t > deadline);
});
