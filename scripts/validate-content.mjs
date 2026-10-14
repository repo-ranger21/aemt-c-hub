#!/usr/bin/env node
// Checks src/data/*.json against the shapes declared in src/types.ts.
//
// Errors fail the run (exit 1). Warnings are reported but do not fail, because
// an unresolved `verify` flag is a to-do, not a broken file.
//
// Run: npm run validate

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (file) => JSON.parse(readFileSync(join(root, 'src/data', file), 'utf8'));

const SCOPES = new Set(['nremt-aemt', 'ri-aemt', 'ri-aemt-c', 'reference']);
const DOMAINS = new Set(['airway', 'cardiology', 'trauma', 'medical', 'operations']);
const TRAPS = new Set(['ceiling', 'floor', 'threshold', 'age', 'equipment']);
const FORMULARY = new Set(['R', 'O', 'C', 'O/C', 'R/C', 'P', 'X']);
const FORMULAS = new Set(['conversion', 'volume', 'weight', 'percent', 'drip', 'parkland']);
const NATIONAL_STATUS = new Set(['in', 'out']);
const NATIONAL_BASIS = new Set(['sop-guidelines', 'curriculum-condition', 'common-formulary', 'beyond-aemt']);
// A basis that rests on a federal document must quote one; a basis that rests on
// convention must not, because no federal source enumerates AEMT medications.
const BASIS_NEEDS_CITATION = new Set(['sop-guidelines', 'curriculum-condition']);
const AUTHORITY = new Set(['standing-order', 'medical-control', 'both']);
const REGULARITY = new Set(['regular', 'irregular', 'irregularly-irregular']);
const P_WAVES = new Set(['normal', 'inverted', 'absent', 'sawtooth', 'fibrillatory', 'dissociated']);
const DROPPED = new Set(['wenckebach', 'fixed-ratio', 'bigeminy']);

const errors = [];
const warnings = [];
const fail = (where, msg) => errors.push(`${where} — ${msg}`);
const warn = (where, msg) => warnings.push(`${where} — ${msg}`);

const isText = (v) => typeof v === 'string' && v.trim().length > 0;
const isTextList = (v) => Array.isArray(v) && v.length > 0 && v.every(isText);

const drugs = load('drugs.json');
const topics = load('topics.json');
const questionFile = load('questions.json');
const questions = questionFile.questions ?? [];

// --- shared checks ---------------------------------------------------------

const seenIds = new Map();

function checkCommon(item, where) {
  if (!isText(item.id)) return fail(where, 'missing id');
  if (seenIds.has(item.id)) fail(where, `duplicate id, also used by ${seenIds.get(item.id)}`);
  else seenIds.set(item.id, where);

  if (!DOMAINS.has(item.domain)) fail(where, `domain "${item.domain}" is not a known domain`);

  if (!Array.isArray(item.scope) || item.scope.length === 0) fail(where, 'scope must be a non-empty array');
  else item.scope.filter((s) => !SCOPES.has(s)).forEach((s) => fail(where, `unknown scope "${s}"`));

  if (!item.source || !isText(item.source.doc)) fail(where, 'source.doc is required so a card can be traced back');
}

function checkConflicts(item, where) {
  if (item.conflicts === undefined) return;
  if (!Array.isArray(item.conflicts) || item.conflicts.length === 0) return fail(where, 'conflicts must be a non-empty array when present');
  item.conflicts.forEach((c, i) => {
    const at = `${where} conflicts[${i}]`;
    if (!isText(c.topic)) fail(at, 'missing topic');
    if (!isText(c.nremt)) fail(at, 'missing the NREMT/national side');
    if (!isText(c.ri)) fail(at, 'missing the RI side');
  });
}

// --- deck naming -----------------------------------------------------------

const deckTitles = new Map();

function checkDeck(item, where) {
  if (!isText(item.deck)) return fail(where, 'missing deck id');
  if (!isText(item.deckTitle)) return fail(where, 'missing deckTitle');
  const known = deckTitles.get(item.deck);
  if (known === undefined) deckTitles.set(item.deck, item.deckTitle);
  else if (known !== item.deckTitle) fail(where, `deck "${item.deck}" is titled "${item.deckTitle}" here but "${known}" elsewhere`);
}

// --- drugs -----------------------------------------------------------------

for (const d of drugs) {
  const where = `drug ${d.id ?? '(no id)'}`;
  checkCommon(d, where);
  checkConflicts(d, where);

  if (d.kind !== 'drug') fail(where, `kind should be "drug", found "${d.kind}"`);
  for (const field of ['name', 'class', 'mechanism']) {
    if (!isText(d[field])) fail(where, `missing ${field}`);
  }
  for (const field of ['brand', 'indications', 'contraindications', 'pearls', 'riPearls']) {
    if (!Array.isArray(d[field])) fail(where, `${field} must be an array`);
  }
  if (!isTextList(d.indications)) fail(where, 'needs at least one indication');
  const n = d.national;
  if (!n || typeof n !== 'object') {
    fail(where, 'missing national');
  } else {
    if (!NATIONAL_STATUS.has(n.status)) fail(where, `national.status "${n.status}" must be in or out`);
    if (!NATIONAL_BASIS.has(n.basis)) fail(where, `national.basis "${n.basis}" is not a valid basis`);
    if (BASIS_NEEDS_CITATION.has(n.basis) && !isText(n.citation)) {
      fail(where, `basis "${n.basis}" rests on a federal document but citation is missing`);
    }
    // The rule that makes a fabricated citation a build failure rather than a
    // judgement call: if the claim rests on convention, it cannot carry a source.
    if (!BASIS_NEEDS_CITATION.has(n.basis) && isText(n.citation)) {
      fail(where, `basis "${n.basis}" has no federal source — citation must be null`);
    }
    if (n.basis === 'beyond-aemt' && n.status === 'in') {
      fail(where, 'basis "beyond-aemt" cannot have status "in"');
    }
  }

  // Formulary and scope have to agree, or the "My AEMT-C scope" filter lies.
  const f = d.formulary;
  if (!f || typeof f !== 'object') {
    fail(where, 'missing formulary');
  } else {
    for (const level of ['E', 'A', 'AC']) {
      if (!FORMULARY.has(f[level])) fail(where, `formulary.${level} = "${f[level]}" is not a valid code`);
    }
    const carried = (code) => code !== undefined && code !== 'X' && code !== 'P';
    const expected = [];
    if (carried(f.A)) expected.push('ri-aemt');
    if (carried(f.AC)) expected.push('ri-aemt-c');
    const declared = d.scope.filter((s) => s.startsWith('ri-'));
    if (expected.sort().join() !== declared.slice().sort().join()) {
      fail(where, `scope [${declared}] does not match formulary A=${f.A} AC=${f.AC}, which implies [${expected}]`);
    }
    if (d.national?.status === 'in' && !d.scope.includes('nremt-aemt')) {
      fail(where, 'national.status is "in" but scope omits nremt-aemt');
    }
    if (d.national?.status === 'out' && d.scope.includes('nremt-aemt')) {
      fail(where, 'scope claims nremt-aemt but national.status is "out"');
    }

    // riAuthority is optional, but when present it has to be answerable against
    // a numbered protocol and can only be set for a level that actually carries.
    if (d.riAuthority) {
      const a = d.riAuthority;
      for (const lvl of ['A', 'AC']) {
        if (a[lvl] !== null && a[lvl] !== undefined && !AUTHORITY.has(a[lvl])) {
          fail(where, `riAuthority.${lvl} = "${a[lvl]}" is not a valid authority`);
        }
        if (a[lvl] && !carried(f[lvl])) {
          fail(where, `riAuthority.${lvl} is set but formulary.${lvl}="${f[lvl]}" is not carried`);
        }
      }
      if ((a.A || a.AC) && !isText(a.protocolRef)) {
        fail(where, 'riAuthority sets a level but has no protocolRef to check it against');
      }
    }
    // A drug nobody carries is reference-only, and has to say so rather than
    // sitting on an empty array that reads as missing data.
    const isReference = d.scope.includes('reference');
    const carriedSomewhere = expected.length > 0 || d.scope.includes('nremt-aemt');
    if (carriedSomewhere && isReference) fail(where, 'scope cannot be "reference" and a practice level at the same time');
    if (!carriedSomewhere && !isReference) fail(where, 'carried at no level — scope should be ["reference"]');
  }

  if (d.scopeVerified !== true) warn(where, 'scopeVerified is not true — scope has not been checked against the protocol');
  if (isText(d.verify)) warn(where, `unresolved: ${d.verify}`);
}

// --- topics ----------------------------------------------------------------

for (const t of topics) {
  const where = `topic ${t.id ?? '(no id)'}`;
  checkCommon(t, where);
  checkConflicts(t, where);
  checkDeck(t, where);

  if (t.kind !== 'topic') fail(where, `kind should be "topic", found "${t.kind}"`);
  if (!isText(t.title)) fail(where, 'missing title');
  if (!isTextList(t.body)) fail(where, 'body must be a non-empty array of lines');
  if (t.tags !== undefined && !Array.isArray(t.tags)) fail(where, 'tags must be an array');
  if (t.chapter !== undefined && !Number.isInteger(t.chapter)) fail(where, 'chapter must be a whole number');
  if (isText(t.verify)) warn(where, `unresolved: ${t.verify}`);
}

// --- questions -------------------------------------------------------------

const deckIds = new Set((questionFile.decks ?? []).map((d) => d.id));
if (deckIds.size === 0) fail('questions.json', 'decks list is missing or empty');
if (!questionFile.standards?.primary) fail('questions.json', 'standards.primary is required — it names the default standard');

for (const q of questions) {
  const where = `question ${q.id ?? '(no id)'}`;
  checkCommon(q, where);
  checkDeck(q, where);

  if (q.kind !== 'calc' && q.kind !== 'recall') fail(where, `kind should be "calc" or "recall", found "${q.kind}"`);
  if (!deckIds.has(q.deck)) fail(where, `deck "${q.deck}" is not listed in questions.json decks`);
  for (const field of ['stem', 'answer', 'work']) {
    if (!isText(q[field])) fail(where, `missing ${field}`);
  }
  if (!Number.isInteger(q.number)) fail(where, 'number must be a whole number');
  if (q.trap !== null && q.trap !== undefined && !TRAPS.has(q.trap)) fail(where, `trap "${q.trap}" is not a known trap type`);
  if (q.kind === 'calc' && !FORMULAS.has(q.formula)) fail(where, 'calc questions need a valid formula');
  if (q.formula !== undefined && !FORMULAS.has(q.formula)) fail(where, `formula "${q.formula}" is not known`);

  // The display rule: an RI alternate must be answerable and traceable.
  if (q.ri) {
    if (!isText(q.ri.answer)) fail(where, 'ri block is missing an answer');
    if (!isText(q.ri.work)) fail(where, 'ri block is missing work');
    if (q.ri.trap !== null && q.ri.trap !== undefined && !TRAPS.has(q.ri.trap)) fail(where, `ri.trap "${q.ri.trap}" is not a known trap type`);
    if (!isText(q.ri.ref)) warn(where, 'ri block has no protocol number — add ref so the RI answer can be checked');
  }
  if (isText(q.verify)) warn(where, `unresolved: ${q.verify}`);

  // Rhythm strips must be renderable by RhythmStrip.tsx.
  if (q.strip) {
    const s = q.strip;
    const at = `${where} strip`;
    if (s.chaotic !== undefined && s.chaotic !== 'coarse' && s.chaotic !== 'fine') {
      fail(at, `chaotic "${s.chaotic}" must be "coarse" or "fine"`);
    }
    if (s.ventricularStandstill !== undefined && typeof s.ventricularStandstill !== 'boolean') {
      fail(at, 'ventricularStandstill must be a boolean');
    }
    // flatline, chaotic and standstill each ignore the beat-by-beat fields.
    if (s.flatline !== true && !s.chaotic && s.ventricularStandstill !== true) {
      if (!(typeof s.rate === 'number' && s.rate > 0)) fail(at, 'rate must be a positive number');
      if (!REGULARITY.has(s.regularity)) fail(at, `regularity "${s.regularity}" is not valid`);
      if (!P_WAVES.has(s.pWaves)) fail(at, `pWaves "${s.pWaves}" is not valid`);
      if (!(typeof s.qrsWidth === 'number' && s.qrsWidth > 0)) fail(at, 'qrsWidth must be a positive number of seconds');
      if (s.prInterval !== null && typeof s.prInterval !== 'number') fail(at, 'prInterval must be a number or null');
    }
    if (s.droppedBeats !== undefined && !DROPPED.has(s.droppedBeats)) fail(at, `droppedBeats "${s.droppedBeats}" is not valid`);
  }
}

// --- report ----------------------------------------------------------------

const tally = (items, key) => items.reduce((acc, i) => acc.set(i[key], (acc.get(i[key]) ?? 0) + 1), new Map());
const pad = (n) => String(n).padStart(4);

console.log('\nContent summary');
console.log('  drugs            ', pad(drugs.length), `(${drugs.filter((d) => d.scope.includes('ri-aemt-c')).length} in AEMT-C scope, ${drugs.filter((d) => d.conflicts?.length).length} with NREMT/RI conflicts)`);
console.log('  topic cards      ', pad(topics.length), `(${topics.filter((t) => t.conflicts?.length).length} with NREMT/RI conflicts)`);
console.log('  questions        ', pad(questions.length), `(${questions.filter((q) => q.ri).length} with an RI alternate, ${questions.filter((q) => q.trap || q.ri?.trap).length} traps, ${questions.filter((q) => q.strip).length} with rhythm strips)`);

console.log('\nTopic decks');
for (const [title, n] of tally(topics, 'deckTitle')) console.log(' ', pad(n), title);
console.log('\nQuestion decks');
for (const [title, n] of tally(questions, 'deckTitle')) console.log(' ', pad(n), title);

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  warnings.forEach((w) => console.log('  !', w));
}

if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  errors.forEach((e) => console.error('  x', e));
  console.error('\nContent is invalid.\n');
  process.exit(1);
}

console.log(`\nContent is valid.${warnings.length ? ` ${warnings.length} warning(s) above are to-dos, not failures.` : ''}\n`);
