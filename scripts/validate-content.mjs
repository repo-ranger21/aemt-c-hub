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
const FORMULARY = new Set(['R', 'O', 'C', 'O/C', 'R/C', 'P', 'TM', 'X']);
const FORMULAS = new Set(['conversion', 'volume', 'weight', 'percent', 'drip', 'parkland']);
const NATIONAL_STATUS = new Set(['in', 'out']);
const NATIONAL_BASIS = new Set(['sop-guidelines', 'curriculum-condition', 'common-formulary', 'beyond-aemt']);
// A basis that rests on a federal document must quote one; a basis that rests on
// convention must not, because no federal source enumerates AEMT medications.
const BASIS_NEEDS_CITATION = new Set(['sop-guidelines', 'curriculum-condition']);
const AUTHORITY = new Set(['standing-order', 'medical-control', 'both']);
// Mirrors ErrorMode in src/types.ts. Every distractor names the mistake that
// produces it, which is what lets the app explain a wrong answer instead of
// just marking it.
const ERROR_MODES = new Set([
  'no-conversion', 'inverted', 'wrong-magnitude', 'ignored-ceiling', 'ignored-floor',
  'single-vs-total', 'wrong-concentration', 'adult-peds', 'ri-answer', 'adjacent-fact',
  'common-confusion',
]);
const POPULATIONS = new Set(['adult', 'pediatric']);
const BODY_SYSTEMS = new Set(['CNS', 'Respiratory', 'CV', 'GI/GU', 'Musculoskeletal', 'Endocrine', 'Other']);
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

  // Dosage, adverse effects, interactions and onset/duration come from the ASPT
  // guide. They are optional per-drug because the guide genuinely has holes —
  // adenosine carries no dosing, ondansetron no indications — but where a block
  // exists it has to be well formed, so a parser regression shows up here rather
  // than as a blank section on a phone in the back of a truck.
  if (d.dosing !== undefined) {
    if (!Array.isArray(d.dosing)) fail(where, 'dosing must be an array');
    else d.dosing.forEach((b, i) => {
      const at = `${where} dosing[${i}]`;
      if (!POPULATIONS.has(b?.population)) fail(at, `population "${b?.population}" must be adult or pediatric`);
      if (b?.indication !== null && !isText(b?.indication)) fail(at, 'indication must be a string or null');
      if (!isTextList(b?.doses)) fail(at, 'needs at least one dose line');
    });
  }
  if (d.adverse !== undefined) {
    if (!Array.isArray(d.adverse)) fail(where, 'adverse must be an array');
    else d.adverse.forEach((a, i) => {
      const at = `${where} adverse[${i}]`;
      if (!BODY_SYSTEMS.has(a?.system)) fail(at, `system "${a?.system}" is not a body system`);
      if (!isText(a?.effects)) fail(at, 'missing effects');
    });
  }
  if (d.interactions !== undefined && !Array.isArray(d.interactions)) {
    fail(where, 'interactions must be an array');
  }
  if (d.pharmacokinetics) {
    const pk = d.pharmacokinetics;
    for (const k of ['onset', 'peak', 'duration']) {
      if (pk[k] !== null && !isText(pk[k])) fail(where, `pharmacokinetics.${k} must be a string or null`);
    }
    if (!pk.onset && !pk.peak && !pk.duration) fail(where, 'pharmacokinetics is present but entirely empty');
  }
  // Protocol-first indications displace the label's wording rather than deleting
  // it. If labelIndications is present it must carry content, and a card may not
  // claim a guide source without having taken indications from it.
  if (d.labelIndications !== undefined && !isTextList(d.labelIndications)) {
    fail(where, 'labelIndications must be a non-empty array when present');
  }
  if (d.guideSource && !isText(d.guideSource.doc)) fail(where, 'guideSource needs a doc');

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
  // One entry per appendix 09.00 row; carriage at a level means ANY formulation
  // is carried there, since oral acetaminophen counts even though IV is out.
  const f = d.formulary;
  const carried = (code) => code !== undefined && code !== 'X' && code !== 'P';
  const carriedAt = (lvl) => Array.isArray(f) && f.some((e) => carried(e?.codes?.[lvl]));
  if (!Array.isArray(f)) {
    fail(where, 'formulary must be an array of appendix 09.00 entries');
  } else {
    f.forEach((e, i) => {
      const at = `${where} formulary[${i}]`;
      if (!e || typeof e !== 'object') return fail(at, 'entry must be an object');
      if (!isText(e.formulation)) fail(at, 'missing formulation');
      if (e.minimumQuantity !== null && !isText(e.minimumQuantity)) fail(at, 'minimumQuantity must be a string or null');
      if (!e.codes || typeof e.codes !== 'object') return fail(at, 'missing codes');
      for (const level of ['EMR', 'E', 'A', 'AC', 'P']) {
        if (!FORMULARY.has(e.codes[level])) fail(at, `codes.${level} = "${e.codes[level]}" is not a valid code`);
      }
    });
    // The appendix reuses a label across strengths — aspirin is "(oral)" twice,
    // 81 mg Required and 325 mg Optional — so the row is identified by the pair.
    const keys = f.map((e) => `${e?.formulation}\u0000${e?.minimumQuantity}`);
    if (new Set(keys).size !== keys.length) fail(where, 'two formulary entries share a formulation AND minimum quantity');

    const expected = [];
    if (carriedAt('A')) expected.push('ri-aemt');
    if (carriedAt('AC')) expected.push('ri-aemt-c');
    const declared = d.scope.filter((s) => s.startsWith('ri-'));
    if (expected.sort().join() !== declared.slice().sort().join()) {
      fail(where, `scope [${declared}] does not match the formulary, which implies [${expected}]`);
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
        if (a[lvl] && !carriedAt(lvl)) {
          fail(where, `riAuthority.${lvl} is set but no formulation is carried at ${lvl}`);
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

  // Four options, one right, and a reason attached to every one of them. The
  // rules are strict on purpose: a distractor with no error mode is a guess
  // dressed as a question, and that is exactly the criticism this schema exists
  // to answer. A correct choice carries no error mode; a wrong one must.
  //
  // Required, not optional: every question in the bank carries a full set, and
  // a new one that does not is a flip card smuggled into a graded drill.
  if (q.choices === undefined) {
    fail(where, 'needs 4 choices — every question is answered and graded, not self-scored');
  } else {
    const at = `${where} choices`;
    if (!Array.isArray(q.choices) || q.choices.length !== 4) {
      fail(at, `must be exactly 4 options, found ${Array.isArray(q.choices) ? q.choices.length : 'none'}`);
    } else {
      const ids = q.choices.map((c) => c?.id);
      if (ids.join(',') !== 'a,b,c,d') fail(at, `ids must be a,b,c,d in order — found ${ids.join(',')}`);
      const correct = q.choices.filter((c) => c?.correct === true);
      if (correct.length !== 1) fail(at, `exactly one option must be correct, found ${correct.length}`);
      const texts = q.choices.map((c) => String(c?.text ?? '').trim().toLowerCase());
      if (new Set(texts).size !== texts.length) fail(at, 'two options have the same text');
      for (const c of q.choices) {
        const ca = `${at}[${c?.id}]`;
        if (!isText(c?.text)) fail(ca, 'missing text');
        if (!isText(c?.rationale)) fail(ca, 'every option needs a rationale, including the correct one');
        if (c?.correct === true) {
          if (c.error !== undefined) fail(ca, 'the correct option must not carry an error mode');
        } else {
          if (!ERROR_MODES.has(c?.error)) fail(ca, `distractor error "${c?.error}" is not a known error mode`);
        }
      }
      // The whole point of a computed distractor is that it is the number a real
      // mistake produces. If the correct answer text shows up in a distractor,
      // the generator has leaked.
      const right = q.choices.find((c) => c.correct)?.text?.trim().toLowerCase();
      for (const c of q.choices) {
        if (!c.correct && right && c.text?.trim().toLowerCase() === right) {
          fail(`${at}[${c.id}]`, 'distractor is identical to the correct answer');
        }
      }
    }
  }

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
