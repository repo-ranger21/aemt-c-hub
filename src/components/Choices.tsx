import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Choice } from '../types';
import { color, space, type } from '../theme';

// Options are shuffled per session so position is never the answer, but the
// shuffle is derived from the question id rather than Math.random: it has to
// stay put across re-renders, or an option moves under the reader's thumb
// between tapping and seeing the result.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffleChoices(choices: Choice[], qid: string, seed: number): Choice[] {
  const out = choices.slice();
  // Fisher-Yates driven by a counter hashed with the question id.
  for (let i = out.length - 1; i > 0; i--) {
    const j = hash(`${qid}:${seed}:${i}`) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const LETTERS = ['A', 'B', 'C', 'D'];

export function ChoiceList({
  choices,
  chosen,
  onChoose,
}: {
  choices: Choice[];
  chosen: string | null;      // Choice.id once committed
  onChoose: (c: Choice) => void;
}) {
  const locked = chosen !== null;
  // Options the reader has opened for themselves after answering.
  const [opened, setOpened] = useState<string[]>([]);

  return (
    <View style={{ gap: space.s }}>
      {choices.map((c, i) => {
        const isChosen = c.id === chosen;
        const auto = locked && (isChosen || c.correct);
        const reveal = auto || opened.includes(c.id);
        const tone = !locked ? null : c.correct ? 'right' : isChosen ? 'wrong' : 'muted';

        return (
          <View key={c.id}>
            <Pressable
              onPress={() => {
                if (!locked) return onChoose(c);
                // After the answer is in, tapping an option you did not take
                // opens its reasoning. Every distractor carries one, and a
                // reader who answered correctly still benefits from knowing
                // what the other three were testing.
                if (auto) return;
                setOpened((o) => (o.includes(c.id) ? o.filter((x) => x !== c.id) : [...o, c.id]));
              }}
              accessibilityRole={locked ? 'button' : 'radio'}
              accessibilityState={{ checked: isChosen, expanded: locked ? reveal : undefined }}
              accessibilityLabel={
                locked && !auto
                  ? `${LETTERS[i]}. ${c.text}. ${reveal ? 'Hide' : 'Show'} why this is wrong`
                  : `${LETTERS[i]}. ${c.text}`
              }
              style={[
                styles.option,
                tone === 'right' && styles.right,
                tone === 'wrong' && styles.wrong,
                tone === 'muted' && !reveal && styles.muted,
              ]}
            >
              <View style={[styles.letter, tone === 'right' && styles.letterRight, tone === 'wrong' && styles.letterWrong]}>
                <Text style={[styles.letterText, (tone === 'right' || tone === 'wrong') && { color: '#FFFFFF' }]}>
                  {locked ? (c.correct ? '✓' : isChosen ? '✕' : LETTERS[i]) : LETTERS[i]}
                </Text>
              </View>
              <Text style={[styles.optionText, tone === 'muted' && !reveal && { color: color.muted }]}>{c.text}</Text>
              {locked && !auto ? <Text style={styles.disclose}>{reveal ? '−' : '?'}</Text> : null}
            </Pressable>

            {/* The rationale is the product: it shows automatically for the
                option taken and the right one, and on request for the rest. */}
            {reveal ? (
              <Text style={[styles.rationale, c.correct ? styles.rationaleRight : styles.rationaleWrong]}>
                {c.rationale}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.m,
    padding: space.m,
    borderWidth: 1.5,
    borderColor: color.rule,
    borderRadius: 10,
    backgroundColor: color.surface,
  },
  right: { borderColor: color.good, backgroundColor: color.goodTint },
  wrong: { borderColor: color.bad, backgroundColor: color.badTint },
  muted: { opacity: 0.55 },
  letter: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: color.paper, borderWidth: 1, borderColor: color.rule,
  },
  letterRight: { backgroundColor: color.good, borderColor: 'transparent' },
  letterWrong: { backgroundColor: color.bad, borderColor: 'transparent' },
  letterText: { fontSize: 13, fontWeight: '700', color: color.ink },
  optionText: { flex: 1, fontSize: 16, lineHeight: 23, color: color.ink },
  disclose: { width: 20, textAlign: 'center', fontSize: 15, fontWeight: '700', color: color.muted },
  rationale: {
    fontSize: 14, lineHeight: 20,
    marginTop: space.xs, marginLeft: space.m + 26, marginRight: space.s,
    paddingLeft: space.m, borderLeftWidth: 2,
  },
  rationaleRight: { borderLeftColor: color.good, color: color.ink },
  rationaleWrong: { borderLeftColor: color.bad, color: color.ink },
});
