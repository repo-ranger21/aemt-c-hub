import drugsJson from './drugs.json';
import topicsJson from './topics.json';
import questionsJson from './questions.json';
import type { DrugCard, TopicCard, QuestionFile, CalcQuestion, FormularyCode, SkillCard } from '../types';

// Stocked at a level? 'P' is the patient's own supply — not carried, though it
// may be assisted with. Mirrors the `carried` helper in scripts/validate-content.mjs.
export const isCarried = (code: FormularyCode) => code !== 'X' && code !== 'P';

export const drugs = (drugsJson as unknown as DrugCard[]).slice().sort((a, b) => a.name.localeCompare(b.name));
export const topics = topicsJson as unknown as TopicCard[];
export const questionFile = questionsJson as unknown as QuestionFile;
export const questions: CalcQuestion[] = questionFile.questions;

// Topic decks in the order they first appear in the file.
export const topicDecks = topics.reduce<{ id: string; title: string; count: number }[]>((acc, t) => {
  const d = acc.find((x) => x.id === t.deck);
  if (d) d.count += 1;
  else acc.push({ id: t.deck, title: t.deckTitle, count: 1 });
  return acc;
}, []);

// Carried at a level if ANY formulation is — oral acetaminophen counts even
// though the injectable is out of scope at AEMT.
export const carriedAt = (d: DrugCard, level: 'EMR' | 'E' | 'A' | 'AC' | 'P') =>
  d.formulary.some((e) => isCarried(e.codes[level]));

// True when formulations disagree at a level, which is where exams set traps.
export const splitAt = (d: DrugCard, level: 'EMR' | 'E' | 'A' | 'AC' | 'P') =>
  new Set(d.formulary.map((e) => e.codes[level])).size > 1;

// Derived from the formulary codes rather than the scope array, so the filter can
// never disagree with appendix 09.00.
export const inMyScope = (d: DrugCard) => carriedAt(d, 'AC');
export const skillInMyScope = (s: SkillCard) => s.riLevels.includes('AC');

// National says one thing, RI another — the condition the gold callout exists for.
export const divergentAtAemt = (d: DrugCard) => d.national.status === 'out' && carriedAt(d, 'A');
export const divergentAtCardiac = (d: DrugCard) => d.national.status === 'out' && carriedAt(d, 'AC');
// What the Cardiac endorsement adds on top of RI AEMT.
export const cardiacOnly = (d: DrugCard) => !carriedAt(d, 'A') && carriedAt(d, 'AC');
