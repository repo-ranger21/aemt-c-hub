// AEMT-C Hub content schema. Flat JSON, bundled in the app, fully offline.

// ri-aemt / ri-aemt-c come from the RI formulary (09.00). nremt-aemt marks textbook/national-only content.
// 'reference' = carried at no level you practice under; kept for recognition only.
export type Scope = 'nremt-aemt' | 'ri-aemt' | 'ri-aemt-c' | 'reference';
// Formulary codes, verbatim from the RIDOH appendix 09.00 legend:
//   X  Not within scope
//   R  Required
//   C  Choice (interchangeable with another agent; service selects agent of choice)
//   O  Optional (within scope if available)
//   P  Within scope from patient's prescriptive stock
//   TM Within scope to monitor and titrate a pre-existing infusion
// 'C' is a stocking choice, NOT online medical control — authority to give lives
// in RiAuthority, read off the numbered protocol. Appendix 09.01 lists the
// interchangeable pairs (lorazepam/diazepam, CaCl/Ca gluconate, DuoDote/Mark-1).
export type FormularyCode = 'R' | 'O' | 'C' | 'O/C' | 'R/C' | 'P' | 'TM' | 'X';

// RI codes each FORMULATION separately, and they disagree: acetaminophen is R at
// AEMT by mouth but X injectable, which is exactly the kind of thing an exam
// traps on. One entry per appendix 09.00 row.
export interface FormularyEntry {
  formulation: string;            // "Acetaminophen (injectable)" — the appendix's own wording
  minimumQuantity: string | null; // "Four (4) 500 mg tablets"
  codes: {
    EMR: FormularyCode;
    E: FormularyCode;
    A: FormularyCode;
    AC: FormularyCode;   // the A/C column
    P: FormularyCode;
  };
  note?: string;                  // only where the row needs explaining
}
export type Domain = 'airway' | 'cardiology' | 'trauma' | 'medical' | 'operations';
export type Trap = 'ceiling' | 'floor' | 'threshold' | 'age' | 'equipment';
export type Formula = 'conversion' | 'volume' | 'weight' | 'percent' | 'drip' | 'parkland';

export interface Source {
  doc: string;       // Drive doc or protocol title
  driveId?: string;  // Drive file, if from your notes
  url?: string;      // public source, e.g. the RI protocol PDF
}

// One line where the national method and RI protocol disagree.
// Display rule: NREMT/national first, RI AEMT-C second.
export interface Conflict {
  topic: string;
  nremt: string;
  ri: string;
}

// How a national-scope claim is supported. No federal document enumerates the
// AEMT formulary: the Education Standards name conditions and defer medications
// to local authority ("Specific medication classes to be determined locally",
// p. 34); the Scope of Practice Model's interpretive guidelines are "illustrative
// and NOT all-inclusive" (p. 32); the NREMT examination specifications contain no
// drug list. So a claim carries the kind of evidence behind it, not just in/out.
export type NationalBasis =
  | 'sop-guidelines'       // named in Scope of Practice Model §V, p. 36 — the strongest source
  | 'curriculum-condition' // Education Standards name the CONDITION at AEMT
  | 'common-formulary'     // convention across state formularies; no federal source
  | 'beyond-aemt';         // Paramedic-level

export interface NationalScope {
  status: 'in' | 'out';
  basis: NationalBasis;
  // Quotes a medication row or a CONDITION, never a drug the documents don't name.
  // Always null when basis is 'common-formulary' or 'beyond-aemt'.
  citation: string | null;
  note?: string;
}

// Standing order vs contact. Not derivable from a formulary code: appendix 09.00
// says what is stocked, the numbered protocol says who authorises giving it.
// 'both' means it varies by indication, not that it escalates at a threshold —
// sodium bicarbonate at AEMT-C needs Medical Control for toxicology, hyperkalemia
// and crush, but is a standing order in cardiac arrest. The note says which.
export type Authority = 'standing-order' | 'medical-control' | 'both';

export interface RiAuthority {
  A: Authority | null;
  AC: Authority | null;
  protocolRef: string | null;  // the primary protocol, e.g. "4.18"
  note?: string;               // required reading when authority is 'both'
}

interface Base {
  id: string;
  domain: Domain;
  scope: Scope[];
  source: Source;
  verify?: string;  // unresolved item to check against RI protocol
}

// One dosing instruction, kept in the shape a medic reads it: who the patient is,
// what you are treating, then the dose. Splitting population from indication is
// what lets the card show "peds, seizures" without the reader scanning an adult
// block first — and it is where most of the exam traps live.
export interface DoseBlock {
  population: 'adult' | 'pediatric';
  indication: string | null;   // null when the drug has a single indication
  doses: string[];
}

// Onset / peak / duration. Separate fields rather than prose because the three
// get compared across drugs constantly (why midazolam over diazepam, and so on).
export interface Pharmacokinetics {
  onset: string | null;
  peak: string | null;
  duration: string | null;
}

// Adverse effects grouped by body system, which is how both the guide and the
// exam organise them.
export type BodySystem = 'CNS' | 'Respiratory' | 'CV' | 'GI/GU' | 'Musculoskeletal' | 'Endocrine' | 'Other';
export interface AdverseEffect {
  system: BodySystem;
  effects: string;
}

export interface DrugCard extends Base {
  kind: 'drug';
  name: string;
  brand: string[];
  class: string;
  mechanism: string;
  // The field indication, protocol-referenced — what you are actually treating
  // when you reach for this. Leads the card.
  indications: string[];
  // The FDA label's own indication wording, kept underneath. It is the primary
  // source for the pharmacology but it is written for inpatient use, so it
  // reads wrong as a field indication: amiodarone's label calls it prophylaxis
  // of recurring VF refractory to other therapy, which is not what an arrest
  // looks like from the floor.
  labelIndications?: string[];
  contraindications: string[];
  adverse: AdverseEffect[];
  interactions: string[];
  dosing: DoseBlock[];
  pharmacokinetics: Pharmacokinetics | null;
  pearls: string[];      // general / national
  riPearls: string[];    // RI protocol detail, shown in the gold callout
  supply: string | null;
  // One entry per appendix 09.00 row. Empty only when the drug appears nowhere in
  // the RI protocols at all (terbutaline, activated charcoal).
  formulary: FormularyEntry[];
  scopeVerified: boolean;
  national: NationalScope;   // national AEMT scope, with the evidence behind it
  riAuthority?: RiAuthority; // standing order vs medical control, per level
  conflicts?: Conflict[];
  protocolSource?: Source; // RI protocol the doses were checked against
}

// Procedures rather than medications — manual defibrillation, synchronized
// cardioversion, TCP, 12-lead acquisition. Not in appendix 09.00, so there is no
// formulary code to derive a level from: the protocol authorises them by level.
export interface SkillCard extends Base {
  kind: 'skill';
  name: string;
  category: 'electrical' | 'airway' | 'vascular' | 'diagnostic';
  indications: string[];
  settings?: string[];   // joules, rate, mA
  pitfalls: string[];
  riLevels: ('E' | 'A' | 'AC')[];
  national: NationalScope;
  riAuthority?: RiAuthority;
  conflicts?: Conflict[];
}

export interface TopicCard extends Base {
  kind: 'topic';
  deck: string;          // e.g. "ecg", "peds-resus"
  deckTitle: string;
  chapter?: number;      // textbook chapter, when there is one
  title: string;
  body: string[];   // one short line per bullet
  tags: string[];
  conflicts?: Conflict[];
}

// Why a distractor is wrong. For med math these are computed, not invented: the
// generator derives each wrong option by applying the named error to the same
// variables that produce the right one, so "what a student who forgot to convert
// pounds would get" is an actual number, not a plausible-looking one.
export type ErrorMode =
  | 'no-conversion'      // skipped lb→kg, g→mg, mg→mcg
  | 'inverted'           // flipped the ratio (mL/mg for mg/mL, or ÷ instead of ×)
  | 'wrong-magnitude'    // off by a factor of 10, 100 or 1,000
  | 'ignored-ceiling'    // computed past a stated maximum
  | 'ignored-floor'      // computed under a stated minimum
  | 'single-vs-total'    // single dose where cumulative was asked, or the reverse
  | 'wrong-concentration'// used the other vial strength on the truck
  | 'adult-peds'         // applied the adult figure to a child, or the reverse
  | 'ri-answer'          // correct under RI protocol, not the national/NREMT answer
  | 'adjacent-fact'      // a real fact about something else (recall questions)
  | 'common-confusion';  // the classic mix-up for this topic

export interface Choice {
  id: 'a' | 'b' | 'c' | 'd';
  text: string;
  // Exactly one choice per question sets this. Absent means a distractor.
  correct?: true;
  // Why this is the answer, or — for a distractor — the specific mistake that
  // produces it. Shown after the learner commits, for every option.
  rationale: string;
  // Absent on the correct choice; names the error on every distractor.
  error?: ErrorMode;
}

export interface CalcQuestion extends Base {
  kind: 'calc' | 'recall';   // calc = med math, recall = flip card
  deck: string;
  deckTitle: string;
  number: number;   // 1–100, matches the original bank
  set: number;
  setTitle: string;
  stem: string;
  answer: string;
  work: string;     // shown on reveal
  // Four options, one correct, each carrying its own rationale. Optional on the
  // type only while the rebuild is in flight — the validator requires a complete
  // well-formed set wherever the field is present, and the drill treats a
  // question without choices as not yet converted.
  choices?: Choice[];
  formula?: Formula;       // med math only
  trap: Trap | null;
  protocolRef?: string;  // RI protocol number, e.g. "2.10P"
  note?: string;
  strip?: RhythmStripParams;  // rhythm-ID questions only: renders an original SVG strip
  // Present only when RI differs from the national answer above.
  ri?: {
    stem?: string;       // set when RI changes the question itself
    answer: string;
    work: string;
    ref?: string | null;
    trap?: Trap | null;
  };
}

// Parameters for an original, procedurally-drawn ECG rhythm strip (see RhythmStrip.tsx).
// Nothing here is traced from a textbook image — the component synthesizes the waveform.
export type Regularity = 'regular' | 'irregular' | 'irregularly-irregular';
export type PWaveType = 'normal' | 'inverted' | 'absent' | 'sawtooth' | 'fibrillatory' | 'dissociated';
export type DroppedBeats = 'wenckebach' | 'fixed-ratio' | 'bigeminy';

export interface RhythmStripParams {
  rate: number;                  // ventricular (QRS) rate, bpm
  regularity: Regularity;
  pWaves: PWaveType;
  prInterval: number | null;     // seconds; null when P and QRS have no fixed relationship
  qrsWidth: number;              // seconds
  droppedBeats?: DroppedBeats;
  atrialRate?: number;           // only for pWaves 'sawtooth' (default 300) or 'dissociated'
  conductionRatio?: number;      // P waves per group, for wenckebach / fixed-ratio (default 4)
  polymorphic?: boolean;         // torsades-style twisting amplitude/axis
  flatline?: boolean;            // asystole: ignores every other field
  // Ventricular fibrillation: a chaotic trace with no organized complex at all.
  // Like flatline, it ignores rate, pWaves, prInterval and qrsWidth.
  chaotic?: 'coarse' | 'fine';
  // Ventricular standstill: atria still depolarizing, ventricles silent.
  // P waves march at atrialRate (or rate); no QRS is drawn.
  ventricularStandstill?: boolean;
  seconds?: number;              // strip duration, default 6
  seed?: number;                 // override the deterministic seed derived from the params
}

export interface QuestionFile {
  decks: { id: string; title: string }[];
  standards: { primary: string; secondary: string };
  formulas: Record<Formula, string>;
  questions: CalcQuestion[];
}

// Spaced repetition state, stored per item id on-device.
export interface ReviewState {
  itemId: string;
  box: 1 | 2 | 3 | 4 | 5;  // Leitner box: missed → 1, got it → box + 1
  dueAt: string;           // ISO date
  lastResult: 'got' | 'missed';
}
