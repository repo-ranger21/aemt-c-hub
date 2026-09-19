// AEMT-C Hub content schema. Flat JSON, bundled in the app, fully offline.

// ri-aemt / ri-aemt-c come from the RI formulary (09.00). nremt-aemt marks textbook/national-only content.
export type Scope = 'nremt-aemt' | 'ri-aemt' | 'ri-aemt-c';
// Formulary codes: R required, O optional, C choice, O/C, R/C, P patient's own supply, X not in scope
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
  nremtScope: 'in' | 'out' | 'unverified'; // national AEMT scope of practice
  conflicts?: Conflict[];
  protocolSource?: Source; // RI protocol the doses were checked against
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
