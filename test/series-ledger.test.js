// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert');
const { honest } = require('./honest');
const { iso } = require('./chain');

const dirs = [];
test.after(() => {
  for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
});

const refused = (e) => e.code === 'QDECLARE_LEDGER';

test('with a ledger a declaration series is started once and continues only from its latest declaration', async () => {
  const w = await honest();
  const { q, K, all } = w;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qdeclare-series-'));
  dirs.push(dir);
  const declare = (period, more) => q.declaration(Object.assign({ key: K.declarant, registration: all.registration, period, content: Buffer.from('assets ' + period), filedAt: iso(w.now - 60), ledger: dir }, more));
  const d1 = await declare('2025', { first: true });
  await assert.rejects(declare('2025', { first: true }), refused);
  const d2 = await declare('2026', { previous: d1 });
  await assert.rejects(declare('2027', { previous: d1 }), refused);
  assert.deepStrictEqual(await q.ledgerLatest(dir, 'declaration', q.refOf(all.registration)), d2);
});
