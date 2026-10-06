# Contributing

Most of this repo is content, not code, so most contributions are JSON. The rules below
exist because a study app with a wrong dose is worse than no study app.

## Four rules that do not bend

1. **National first, RI second.** Every answer leads with the NREMT / national method
   (textbook + AHA). Where Rhode Island differs, the RI version follows in the gold callout
   with its protocol number. Never the other way round, and never RI alone on a card that
   also has a national answer.
2. **Never invent a dose.** A national dose comes from the textbook or an AHA guideline.
   An RI dose cites a protocol number from the RI Statewide EMS Protocols, like `3.06A`.
   If you cannot source it, add a `verify` string saying what is unresolved and let the
   validator surface it.
3. **Rewrite, never copy.** Concepts get restated in original wording. No textbook
   sentences, no slide text, no figures, and never a recalled NREMT item — those are secure
   test content and using them puts a candidate's certification at risk.
4. **`npm run check` passes before you commit.** That runs the typecheck and the validator.

## Setup

```powershell
npm install
npm run check
npx expo start
```

## The schema

`src/types.ts` is the source of truth. The validator enforces it at runtime, since JSON
does not typecheck itself. A summary:

### Shared by every card

| Field | Notes |
| --- | --- |
| `id` | unique across **all three** files |
| `domain` | `airway` · `cardiology` · `trauma` · `medical` · `operations` |
| `scope` | array of `nremt-aemt` · `ri-aemt` · `ri-aemt-c` · `reference` |
| `source` | `{ doc, driveId?, url? }` — where the card came from |
| `verify` | optional string: something unresolved. Shows as a warning, and as a badge in the app |

`reference` means carried at no level you practice under. It is kept for recognition only
and cannot be combined with a practice-level scope.

### Conflicts

Any drug or topic card can carry a `conflicts` array. This is what renders the side-by-side
comparison:

```json
"conflicts": [
  {
    "topic": "Dosing",
    "nremt": "AHA: 6 mg rapid IV push, then 12 mg",
    "ri": "RI 3.06A: 12 mg first, may repeat x 1"
  }
]
```

All three strings are required. The `ri` side should name its protocol number.

### Drug cards (`drugs.json`)

```json
{
  "id": "adenosine",
  "kind": "drug",
  "name": "Adenosine",
  "brand": [],
  "class": "Antiarrhythmic (AV nodal blocker)",
  "domain": "cardiology",
  "mechanism": "Briefly blocks conduction through the AV node...",
  "indications": ["Regular narrow complex tachycardia (SVT)"],
  "contraindications": [],
  "pearls": ["general / national points"],
  "riPearls": ["RI 3.06A: 12 mg rapid IV push, may repeat x 1"],
  "supply": "6 mg / 2 mL (3 mg/mL)",
  "formulary": { "E": "X", "A": "X", "AC": "R" },
  "scope": ["ri-aemt-c"],
  "scopeVerified": true,
  "nremtScope": "out"
}
```

`formulary` codes come from protocol appendix 09.00: `R` required, `O` optional, `C` choice,
`O/C`, `R/C`, `P` patient's own supply, `X` not in scope.

**`scope` must agree with `formulary`.** A drug carried at AEMT-C (`AC` is anything but `X`
or `P`) has `ri-aemt-c` in its scope; one carried at AEMT has `ri-aemt`. The validator fails
the build when they disagree, because the "My AEMT-C scope" filter depends on it.

`pearls` are general or national. `riPearls` are RI protocol detail and render inside the
gold callout. Keep them separate.

### Topic cards (`topics.json`)

```json
{
  "id": "ecg-blocks",
  "kind": "topic",
  "deck": "ecg",
  "deckTitle": "ECG & dysrhythmias",
  "chapter": 18,
  "title": "AV blocks",
  "domain": "cardiology",
  "body": ["one short line per bullet"],
  "tags": ["high-yield"],
  "scope": ["nremt-aemt", "ri-aemt-c"],
  "source": { "doc": "..." }
}
```

A `deck` id must always map to the same `deckTitle`. The Topics screen builds its chip row
from the order cards first appear in the file, so group a deck's cards together.

### Questions (`questions.json`)

The file is `{ decks, standards, formulas, questions }`. Every question's `deck` must appear
in `decks`.

```json
{
  "id": "eh-103",
  "kind": "recall",
  "number": 103,
  "deck": "endo-heme",
  "deckTitle": "Endocrine & hematologic emergencies",
  "stem": "Peds hypoglycemia, no IV access. National glucagon dose?",
  "answer": "0.5 mg IM under 20 kg, 1 mg IM at 20 kg or more",
  "work": "Textbook two-tier pediatric glucagon dosing",
  "domain": "medical",
  "trap": null,
  "protocolRef": "2.10P",
  "ri": {
    "answer": "0.1 mg/kg IM, max 1 mg",
    "work": "RI dosing is weight-based, not the flat two-tier textbook dose",
    "ref": "2.10P"
  }
}
```

- `kind` is `calc` (med math, needs a `formula`) or `recall` (flip card).
- **Add an `ri` block only when the RI answer actually differs.** If the two agree, use
  `protocolRef` alone — that renders as "Matches RI protocol 2.10P" instead of a second answer.
- `trap` marks a question that punishes arithmetic without judgment: `ceiling` (dose exceeds a
  max), `floor` (below a minimum), `threshold` (a weight or age changes the track), `age`,
  `equipment`.
- `ri.ref` is a warning when missing, not an error, but add it. An RI answer no one can check
  is not much better than a guess.

### Rhythm strips

A rhythm-ID question can carry a `strip`, which `RhythmStrip.tsx` synthesizes into an SVG at
render time. It draws from parameters, so nothing is traced from a textbook:

```json
"strip": { "rate": 190, "regularity": "regular", "pWaves": "absent", "prInterval": null, "qrsWidth": 0.08 }
```

`regularity`: `regular` · `irregular` · `irregularly-irregular`.
`pWaves`: `normal` · `inverted` · `absent` · `sawtooth` · `fibrillatory` · `dissociated`.
Optional: `droppedBeats` (`wenckebach` · `fixed-ratio` · `bigeminy`), `atrialRate`,
`conductionRatio`, `polymorphic`, `flatline`, `seconds`, `seed`.

## Adding a deck

1. Put the source material in `/docs`. It is gitignored and stays out of the repo.
2. Add topic cards to `topics.json` with a new `deck` id and a consistent `deckTitle`.
3. Add the deck to the `decks` array in `questions.json`, then add its questions.
4. Check every RI dose against the protocol PDF and record the protocol number.
5. Run `npm run check`.
6. Open the app and read a few cards. The validator checks shape, not whether a card teaches
   anything.

## Reporting a content error

Open a [content error issue](../../issues/new?template=content-error.yml). It asks for the
protocol number or guideline citation, because a correction without a source cannot be acted on.

If you are unsure which of two conflicting RI protocols governs, that is still worth filing —
there are already open `verify` flags for exactly that situation.
