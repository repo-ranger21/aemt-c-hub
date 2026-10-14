// AEMT-C Hub content schema. Flat JSON, bundled in the app, fully offline.

// ri-aemt / ri-aemt-c come from the RI formulary (09.00). nremt-aemt marks textbook/national-only content.
// 'reference' = carried at no level you practice under; kept for recognition only.
export type Scope = 'nremt-aemt' | 'ri-aemt' | 'ri-aemt-c' | 'reference';
// Formulary codes, RIDOH appendix 09.00: R required, O optional, P patient's own
// supply, X not in scope. 'C' is Choice — the agency medical director picks among
// interchangeable options in a class (appendix 09.01), NOT online medical control.
// Authority to give lives in RiAuthority, read off the numbered protocol.
export type FormularyCode = 'R' | 'O' | 'C' | 'O/C' | 'R/C' | 'P' | 'X';
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
export type Authority = 'standing-order' | 'medical-control' | 'both';

export interface RiAuthority {
  A: Authority | null;
  AC: Authority | null;
  protocolRef: string | null;  // e.g. "2.10P"
}

interface Base {
  id: string;
  domain: Domain;
  scope: Scope[];
  source: Source;
  verify?: string;  // unresolved item to check against RI protocol
}

export interface DrugCard extends Base {
  kind: 'drug';
  name: string;
  brand: string[];
  class: string;
  mechanism: string;
  indications: string[];
  contraindications: string[];
  pearls: string[];      // general / national
  riPearls: string[];    // RI protocol detail, shown in the gold callout
  supply: string | null;
  formulary: { E: FormularyCode; A: FormularyCode; AC: FormularyCode };
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
