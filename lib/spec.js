// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

'use strict';

function samePeriod(a, b) {
  return require('./format').sameIdentifier(a, b);
}

function earlierSamePeriod(p, pool) {
  let cur = p.statement.seq > 1 ? pool.get(p.statement.prevDeclarationRef) : null;
  while (cur && cur.type === 'declaration') {
    if (samePeriod(cur.statement.period, p.statement.period)) return true;
    cur = cur.statement.seq > 1 ? pool.get(cur.statement.prevDeclarationRef) : null;
  }
  return false;
}

function inSeries(p, ref, pool, F) {
  let cur = p.statement.seq > 1 ? pool.get(p.statement.prevDeclarationRef) : null;
  while (cur && cur.type === 'declaration') {
    if (F.refOf(cur) === ref) return true;
    cur = cur.statement.seq > 1 ? pool.get(cur.statement.prevDeclarationRef) : null;
  }
  return false;
}

module.exports = Object.freeze({
  name: 'qdeclare',
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
      chain: { scope: 'registrationRef', prev: 'prevDeclarationRef' },
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
        if (p.statement.corrects === '' && earlierSamePeriod(p, h.pool)) {
          out.push(['period', false, 'an earlier declaration of this series covers the same period, so this declaration must be a correction naming it']);
        }
        if (p.statement.corrects !== '') {
          const target = h.pool.get(p.statement.corrects);
          if (!target) {
            out.push(['correction', false, 'the version this declaration corrects was not supplied', h.ctx.opts.allSupplied !== true]);
          } else {
            const found = inSeries(p, p.statement.corrects, h.pool, h.F);
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
        if (onTime && !anchor) return [['timeliness', true, 'the declaration is dated by the deadline, but it is not anchored, so filing in time is only the claim of the declarant', false, 'the declaration is not anchored, so filing by the deadline stated in the acknowledgement is not proven']];
        return [['timeliness', true, onTime ? 'the declaration was filed by the deadline' : 'the declaration was filed after the deadline', false, onTime ? null : 'the declaration was filed after the deadline stated in the acknowledgement']];
      },
    },
    review: {
      role: 'reviewer', id: 'reviewId', signer: 'reviewerKeyId', time: 'reviewedAt',
      links: { declaration: { field: 'declarationRef', type: 'declaration' } },
      fields: { outcomeDigest: ['digest', 0, false, 'outcome'] },
    },
  },
});
