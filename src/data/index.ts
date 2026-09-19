import drugsJson from './drugs.json';
import topicsJson from './topics.json';
import questionsJson from './questions.json';
import type { DrugCard, TopicCard, QuestionFile, CalcQuestion } from '../types';

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

export const inMyScope = (d: DrugCard) => d.scope.includes('ri-aemt-c');
