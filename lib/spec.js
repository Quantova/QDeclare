// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

'use strict';

function samePeriod(a, b) {
  return require('./format').sameLabel(a, b);
}

function periodKey(text) {
  try {
    return 'k ' + require('./format').labelKey(text);
  } catch (e) {
    return 'r ' + text;
  }
}

function placeOf(p, h) {
  const idx = h.index('declaration chains', () => new Map());
  const ref = h.F.refOf(p);
  if (idx.has(ref)) return idx.get(ref);
  const walked = [p];
  let base = null;
  let cur = p.statement.seq > 1 ? h.pool.get(p.statement.prevDeclarationRef) : null;
  while (cur && cur.type === 'declaration') {
    const known = idx.get(h.F.refOf(cur));
    if (known) {
      base = known;
      break;
    }
    walked.push(cur);
    cur = cur.statement.seq > 1 ? h.pool.get(cur.statement.prevDeclarationRef) : null;
  }
  const chain = base ? { refs: base.chain.refs.slice(0, base.pos + 1), first: new Map([...base.chain.first].filter(([, at]) => at <= base.pos)) } : { refs: [], first: new Map() };
  let place = null;
  for (const d of walked.reverse()) {
    const pos = chain.refs.length;
    chain.refs.push(h.F.refOf(d));
    const k = periodKey(d.statement.period);
    if (!chain.first.has(k)) chain.first.set(k, pos);
    place = { chain, pos };
    idx.set(h.F.refOf(d), place);
  }
  return place;
}

function earlierSamePeriod(p, h) {
  const { chain, pos } = placeOf(p, h);
  const at = chain.first.get(periodKey(p.statement.period));
  return at !== undefined && at < pos;
}

function inSeries(p, ref, h) {
  const { chain, pos } = placeOf(p, h);
  const at = chain.refs.indexOf(ref);
  return at >= 0 && at < pos;
}

module.exports = Object.freeze({
  name: 'qdeclare',
  wasm: () => require('../wasm/qdeclare_native.js'),
  title: 'QDeclare',
  kind: 1104,
  magic: 'QDCL',
  summary: 'post quantum asset and interest declarations for public officials',
  roles: {
    ethics: 'ethics body key',
    declarant: 'declarant key',
    reviewer: 'reviewing officer key',
  },
  types: {
    registration: {
      role: 'ethics', id: 'registrationId', signer: 'ethicsKeyId', time: 'registeredAt',
      fields: { declarantKeyId: ['key'], office: ['text', 128, true], legalBasis: ['text', 128, true] },
    },
    declaration: {
      role: 'declarant', id: 'declarationId', signer: 'declarantKeyId', time: 'filedAt',
      links: { registration: { field: 'registrationRef', type: 'registration' } },
      fields: { period: ['text', 64, true], contentDigest: ['digest', 0, false, 'content'], contentSize: ['size', 0, false, 'content'], corrects: ['optref'], reason: ['text', 512, false] },
      chain: { scope: 'registrationRef', prev: 'prevDeclarationRef', unique: (st, F) => (st.corrects === '' ? F.labelKey(st.period) : null), uniqueName: 'period' },
      shape: (st) => ((st.corrects === '') !== (st.reason === '') ? 'a correction names the version it corrects and states the reason, and only a correction does' : null),
      signCheck: (st, links) => {
        if (st.declarantKeyId !== links.registration.statement.declarantKeyId) return 'only the official named in the registration can file this declaration';
        return null;
      },
      signCheckPrevious: (st, prev) => (prev && samePeriod(prev.statement.period, st.period) && st.corrects === '' ? 'a second declaration for the same period must be a correction naming the version it corrects' : null),
      verifyCheck: (p, links, h) => {
        const out = [];
        if (links.registration) {
          const same = p.signerId === links.registration.statement.declarantKeyId;
          out.push(['declarant', same, same ? 'filed by the official named in the registration' : 'filed by a key other than the official named in the registration']);
        }
        if (p.statement.corrects === '' && earlierSamePeriod(p, h)) {
          out.push(['period', false, 'an earlier declaration of this series covers the same period, so this declaration must be a correction naming it']);
        }
        if (p.statement.corrects !== '') {
          const target = h.pool.get(p.statement.corrects);
          if (!target) {
            out.push(['correction', false, 'the version this declaration corrects was not supplied', h.ctx.opts.allSupplied !== true]);
          } else {
            const found = inSeries(p, p.statement.corrects, h);
            const period = target.type === 'declaration' && samePeriod(target.statement.period, p.statement.period);
            out.push(['correction', found && period, found && period ? 'it corrects an earlier version for the same period in the same series' : 'it names a version that is not an earlier declaration for the same period in this series']);
          }
        }
        return out;
      },
    },
    acknowledgement: {
      role: 'ethics', id: 'acknowledgementId', signer: 'ethicsKeyId', time: 'acknowledgedAt',
      links: { declaration: { field: 'declarationRef', type: 'declaration' } },
      fields: { deadline: ['time'] },
      verifyCheck: (p, links, h) => {
        const d = links.declaration;
        if (!d) return [];
        const anchor = h.anchorOf(d);
        const deadline = Date.parse(p.statement.deadline);
        const filed = anchor ? Math.max(anchor.ms, h.claimedMs(d)) : h.claimedMs(d);
        const onTime = filed <= deadline;
        h.fact('onTime', onTime && !anchor ? null : onTime);
        if (onTime && !anchor) return [['timeliness', false, 'the declaration is dated by the deadline, but it is not anchored, so filing in time is only the claim of the declarant', true]];
        const unsure = !onTime && h.ctx.checks.some((c) => /earlier copies$/.test(c.name) && !c.ok);
        return [['timeliness', onTime, onTime ? 'the declaration was filed by the deadline' : 'the declaration was filed after the deadline stated in the acknowledgement' + (unsure ? ', unless an earlier anchor that could not be checked proves otherwise' : ''), unsure]];
      },
    },
    review: {
      role: 'reviewer', id: 'reviewId', signer: 'reviewerKeyId', time: 'reviewedAt',
      links: { declaration: { field: 'declarationRef', type: 'declaration' } },
      fields: { outcomeDigest: ['digest', 0, false, 'outcome'] },
    },
  },
});
