'use strict';

const crypto = require('crypto');
const test = require('node:test');
const assert = require('node:assert');
const q = require('..');
const qstamp = require('@quantovainc/qstamp');
const { network, stamper, forged, iso, failing, bech32m } = require('./chain');
const { mulberry32, mutator, iterations } = require('./fuzz');

function bogus(env, time, rng) {
  const digest = q.anchorDigest(env);
  const salt = crypto.createHash('sha256').update('salt ' + rng()).digest();
  const leaf = qstamp.leafHash('sha3-256', Buffer.from(digest, 'hex'), salt);
  const tag = (s) => crypto.createHash('sha256').update(s + rng()).digest();
  return {
    format: qstamp.RECEIPT_FORMAT,
    chain: { id: qstamp.NETWORKS.testnet.chainId, genesis: qstamp.NETWORKS.testnet.genesis },
    contract: qstamp.NETWORKS.testnet.contract,
    kind: String(q.KIND),
    record: { alg: 'sha3-256', digest, salt: salt.toString('hex') },
    proof: { index: 0, size: 1, path: [] },
    root: leaf.toString('hex'),
    anchor: { tx: bech32m('QTX', tag('tx')), height: 1000 + Math.floor(rng() * 1e6), block: bech32m('QBK', tag('block')), time, sender: bech32m('Q', tag('sender')) },
  };
}

const ROUNDS = iterations(200);

test('facts.onTime is true only when filing by the deadline is proven by an anchor', async (t) => {
  const rng = mulberry32(0xd0e);
  const m = mutator(0xd0f);
  const int = (n) => Math.floor(rng() * n);
  const now = Math.floor(Date.now() / 1000);
  const net = network(now - 86400);
  const at = stamper(q, net);
  const K = { ethics: q.generateKey(), declarant: q.generateKey(), reviewer: q.generateKey() };
  const roles = { ethicsKeys: [q.keyId(K.ethics)], declarantKeys: [q.keyId(K.declarant)], reviewerKeys: [q.keyId(K.reviewer)] };
  const t0 = now - 86000;
  const counts = { provenOnTime: 0, provenLate: 0, unanchored: 0, withForgeries: 0 };
  for (let round = 0; round < ROUNDS; round += 1) {
    const base = t0 + (round % 200) * 400;
    const registration = await at(q.registration({ key: K.ethics, declarantKeyId: q.keyId(K.declarant), office: 'Office ' + round, legalBasis: 'Act 12', registeredAt: iso(base) }), base + 1);
    const deadline = base + 300 + int(300);
    const claimed = deadline - 250 + int(400);
    const decl = q.declaration({ ledger: false, key: K.declarant, registration, period: String(2000 + round), content: Buffer.from('assets ' + round), first: true, filedAt: iso(claimed) });
    const genuine = [];
    const n = int(4);
    for (let i = 0; i < n; i += 1) genuine.push(await at(decl, claimed - 60 + int(600)));
    const copies = genuine.slice();
    const fakes = rng() < 0.5 ? int(12) : 0;
    for (let i = 0; i < fakes; i += 1) {
      const kind = int(3);
      if (kind === 0 && genuine.length) copies.push(Object.assign({}, decl, { anchor: forged(genuine[0].anchor, 1 + int(900), round * 100 + i) }));
      else if (kind === 1) copies.push(Object.assign({}, decl, { anchor: bogus(decl, claimed - int(300), rng) }));
      else copies.push(Object.assign({}, decl, { anchor: m.mutate(genuine.length ? genuine[0].anchor : bogus(decl, claimed, rng)).value }));
    }
    if (rng() < 0.3) copies.push(decl);
    for (let i = copies.length - 1; i > 0; i -= 1) {
      const j = int(i + 1);
      [copies[i], copies[j]] = [copies[j], copies[i]];
    }
    const ackAt = Math.max(claimed, deadline) + 5 + int(100);
    const ack = await at(q.acknowledgement({ key: K.ethics, declaration: decl, deadline: iso(deadline), acknowledgedAt: iso(ackAt) }), ackAt + 5);
    net.chain.block(now);
    const r = await q.verify(ack, Object.assign({ type: 'acknowledgement', at: iso(now), allSupplied: true, records: [registration].concat(copies) }, roles, net.opts));
    const earliest = genuine.length ? Math.min(...genuine.map((g) => g.anchor.anchor.time)) : null;
    const proven = earliest !== null && Math.max(earliest, claimed) <= deadline;
    const shown = 'round ' + round + ' claimed ' + iso(claimed) + ' deadline ' + iso(deadline) + ' earliest anchor ' + (earliest === null ? 'none' : iso(earliest)) + ' copies ' + copies.length + ' fakes ' + fakes + ' facts ' + JSON.stringify(r.facts) + '\n' + failing(r).join('\n');
    if (r.facts.onTime === true) assert.ok(proven, 'onTime was true without proof of filing by the deadline, ' + shown);
    if (proven && fakes === 0) assert.strictEqual(r.facts.onTime, true, shown);
    if (earliest !== null && Math.max(earliest, claimed) > deadline) assert.notStrictEqual(r.facts.onTime, true, shown);
    if (earliest === null) assert.notStrictEqual(r.facts.onTime, true, shown);
    if (proven) counts.provenOnTime += 1;
    else if (earliest !== null) counts.provenLate += 1;
    else counts.unanchored += 1;
    if (fakes) counts.withForgeries += 1;
  }
  assert.ok(counts.provenOnTime > 0 && counts.provenLate > 0 && counts.unanchored > 0, JSON.stringify(counts));
  t.diagnostic(JSON.stringify(Object.assign({ rounds: ROUNDS }, counts)));
});
