import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReviewState } from '../types';

const KEY = 'review:v1';
const DAYS: Record<ReviewState['box'], number> = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 14 };

export type ReviewMap = Record<string, ReviewState>;

export async function loadReviews(): Promise<ReviewMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ReviewMap) : {};
  } catch {
    return {};
  }
}

export async function saveReviews(map: ReviewMap): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(map));
}

// Leitner: a miss drops the card to box 1 (due today); a hit moves it up one box.
export function grade(prev: ReviewState | undefined, itemId: string, result: 'got' | 'missed'): ReviewState {
  const box = (result === 'missed' ? 1 : Math.min((prev?.box ?? 0) + 1, 5)) as ReviewState['box'];
  const due = new Date();
  due.setDate(due.getDate() + DAYS[box]);
  return { itemId, box, dueAt: due.toISOString(), lastResult: result };
}

export const isDue = (s: ReviewState | undefined, now = new Date()) => !s || new Date(s.dueAt) <= now;
