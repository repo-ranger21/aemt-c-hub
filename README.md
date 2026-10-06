# AEMT-C Hub

[![CI](https://github.com/repo-ranger21/aemt-c-hub/actions/workflows/ci.yml/badge.svg)](https://github.com/repo-ranger21/aemt-c-hub/actions/workflows/ci.yml)

An offline study app for two exams that disagree with each other: the **NREMT AEMT**
cognitive exam and **Rhode Island AEMT-Cardiac** practice.

Expo SDK 57, React Native, TypeScript. No backend, no network calls, no accounts.
Every card ships in `src/data/` as JSON, so the app works in a basement, in a rig,
or anywhere with no signal.

> [!WARNING]
> **Not for clinical use.** This is one student's exam-prep material, not a clinical
> reference and not a protocol. Doses here may be wrong or out of date. Treat patients
> from your agency's current protocols and your medical director's standing orders.
> See [CONTENT_LICENSE.md](CONTENT_LICENSE.md).

## The problem it solves

Studying for a national exam while practicing under a state protocol means learning two
answers to the same question and keeping them straight. Adenosine is the clean example:

| | Stable SVT, first dose |
| --- | --- |
| **NREMT / national** (AHA) | 6 mg rapid IV push, then 12 mg |
| **RI AEMT-C** (protocol 3.06A) | 12 mg first, may repeat once |

Get those backwards on exam day and you lose a question. Get them backwards on a call
and it matters more than a question.

So the app has one rule it never breaks:

**Every answer leads with the NREMT / national method, because that is what the national
exam tests. Where Rhode Island differs, the RI version follows in a gold callout with its
protocol number.** Cards where the two agree show one answer and no callout.

## What's in it

| | Count | Notes |
| --- | --- | --- |
| Drug cards | 36 | 31 in AEMT-C scope, 13 carry an NREMT/RI conflict |
| Topic cards | 79 across 10 decks | 17 carry a conflict |
| Questions | 175 | 44 have an RI alternate, 25 are dosing traps, 12 render a rhythm strip |

**Topic decks:** Shock · ECG & dysrhythmias · Pediatric resuscitation (AHA 2025) ·
Cardiovascular emergencies · Respiratory emergencies · Endocrine & hematologic emergencies ·
Vascular access & IV therapy · Principles of pharmacology · Pathophysiology ·
Medical overview & infectious disease

**Question decks:** Med math (100) · ECG · Pediatric resuscitation · Respiratory ·
Endocrine & hematologic · Cardiovascular · Vascular access

## Screens

- **Today** — what's due, progress, and which domain you miss most.
- **Drugs** — searchable, filterable by *My AEMT-C scope* or *NREMT vs RI differs*. Each card
  shows mechanism, indications, contraindications, the conflicts, RI protocol detail, and the
  RI formulary status at EMT / AEMT / AEMT-C.
- **Topics** — the ten decks as expandable cards. A gold dot marks a card where the standards differ.
- **Drill** — flip cards with Leitner spaced repetition saved on-device. Filter by deck, by
  **Traps only**, or by **NREMT vs RI** to drill just the 44 questions where the answers split.

Rhythm-ID questions draw an original ECG strip as SVG, synthesized at render time from rate,
regularity, P-wave type, PR interval, and QRS width. Nothing is traced or scanned from a textbook.

## Run it

```powershell
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone. Phone and computer need to be on the same Wi-Fi;
otherwise use `npx expo start --tunnel`.

Checks before you commit:

```powershell
npm run check      # typecheck + content validation
```

## Build an installable app

```powershell
npm install -g eas-cli
eas login
eas build -p android --profile preview   # APK you can sideload
eas build -p ios                         # needs an Apple Developer account
```

EAS builds in the cloud, so iOS builds work from Windows.

## Layout

```
App.tsx                      tab navigation
src/types.ts                 content schema — the source of truth for every JSON shape
src/theme.ts                 color and type tokens (blue = national, gold = RI)
src/data/
  drugs.json                 drug cards with RI formulary status per level
  topics.json                topic cards, grouped into decks
  questions.json             drill questions, with optional RI alternates and rhythm strips
  index.ts                   loads and sorts the above
src/lib/review.ts            Leitner spaced repetition, persisted with AsyncStorage
src/components/
  Standards.tsx              NationalLabel, RiCallout, ConflictList — the display rule in code
  RhythmStrip.tsx            procedural ECG strip renderer
  Ui.tsx                     buttons, chips, sections
src/screens/                 Today, Drugs, DrugDetail, Topics, Drill
scripts/validate-content.mjs content validator, run in CI
```

## Content pipeline

Content is written by hand with AI assistance, from the sources listed in
[CONTENT_LICENSE.md](CONTENT_LICENSE.md), then checked three ways:

1. **`npm run validate`** — required fields, duplicate IDs, scope that contradicts the RI
   formulary, RI alternates missing a protocol number, rhythm strips that would not render.
2. **`verify` flags** — any card whose source is ambiguous carries a `verify` string. The
   validator lists them as warnings. There are 4 open right now, mostly places where two RI
   protocols disagree with each other.
3. **CI** — GitHub Actions runs the typecheck and the validator on every push and PR.

Source material itself (textbook slide decks, the protocol PDF) is never committed.
`/docs` is gitignored for that reason.

Found a wrong dose? Open a
[content error report](https://github.com/repo-ranger21/aemt-c-hub/issues/new?template=content-error.yml).
Protocol numbers and sources are required, because a correction without a source is just
a second opinion.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the schema and how to add a deck.

## License

Code is [MIT](LICENSE). Study content in `src/data/` is covered separately by
[CONTENT_LICENSE.md](CONTENT_LICENSE.md) and is not licensed for clinical use.

Built by [Chris Peterson](https://github.com/repo-ranger21) while working through an
AEMT-Cardiac program in Rhode Island.
