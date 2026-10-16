import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { questionFile, questions } from '../data';
import type { CalcQuestion, Choice } from '../types';
import { grade, isDue, type ReviewMap } from '../lib/review';
import { Button, Chip } from '../components/Ui';
import { NationalLabel, RiCallout } from '../components/Standards';
import { RhythmStrip } from '../components/RhythmStrip';
import { ChoiceList, shuffleChoices } from '../components/Choices';
import { color, space, type } from '../theme';

const SESSION = 20;
const TRAP_NAMES = { ceiling: 'Max dose', floor: 'Minimum dose', threshold: 'Cutoff value', age: 'Age modifier', equipment: 'Equipment limit' };

type Mode = 'due' | 'traps' | 'ri';

function buildQueue(mode: Mode, deck: string, reviews: ReviewMap): CalcQuestion[] {
  const pool = questions.filter((q) => (deck === 'all' || q.deck === deck) &&
    (mode === 'traps' ? q.trap || q.ri?.trap : mode === 'ri' ? q.ri : isDue(reviews[q.id])),
  );
  // Misses first, then unseen, then by number.
  return pool
    .slice()
    .sort((a, b) => (reviews[a.id]?.box ?? 0.5) - (reviews[b.id]?.box ?? 0.5) || a.number - b.number)
    .slice(0, SESSION);
}

export default function Drill({ reviews, onGrade }: { reviews: ReviewMap; onGrade: (next: ReviewMap) => void }) {
  const [mode, setMode] = useState<Mode>('due');
  const [deck, setDeck] = useState('all');
  const [seed, setSeed] = useState(0);
  const queue = useMemo(() => buildQueue(mode, deck, reviews), [mode, deck, seed]); // freeze queue for the session
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  // The option committed to on a four-option question. Setting it is what grades
  // the question — there is no self-assessment, which is the whole point.
  const [chosen, setChosen] = useState<Choice | null>(null);

  const q = queue[i];
  const reset = () => { setShown(false); setChosen(null); };
  const restart = (m: Mode, d = deck) => { setMode(m); setDeck(d); setSeed((s) => s + 1); setI(0); reset(); };

  const mark = (result: 'got' | 'missed') => {
    onGrade({ ...reviews, [q.id]: grade(reviews[q.id], q.id, result) });
    reset();
    setI((n) => n + 1);
  };

  // Committing to an option grades it immediately and records the result; the
  // reader then reads why, and moves on when they are ready.
  const commit = (c: Choice) => {
    setChosen(c);
    onGrade({ ...reviews, [q.id]: grade(reviews[q.id], q.id, c.correct ? 'got' : 'missed') });
  };
  const advance = () => { reset(); setI((n) => n + 1); };

  const modes = (
    <View style={styles.chips}>
      <Chip label="Due" active={mode === 'due'} onPress={() => restart('due')} />
      <Chip label="Traps only" active={mode === 'traps'} onPress={() => restart('traps')} />
      <Chip label="NREMT vs RI" active={mode === 'ri'} onPress={() => restart('ri')} />
    </View>
  );
  const decks = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Chip label="All decks" active={deck === 'all'} onPress={() => restart(mode, 'all')} />
      {questionFile.decks.map((d) => (
        <Chip key={d.id} label={d.title} active={deck === d.id} onPress={() => restart(mode, d.id)} />
      ))}
    </ScrollView>
  );

  if (!q) {
    return (
      <View style={styles.wrap}>
        {modes}
        {decks}
        <Text style={type.title}>{queue.length ? 'Session done' : 'Nothing due'}</Text>
        <Text style={type.body}>{queue.length ? `You worked ${queue.length} questions.` : 'Pick another set above, or come back tomorrow.'}</Text>
        {queue.length ? <View style={{ flexDirection: 'row' }}><Button label="Run it again" onPress={() => restart(mode)} /></View> : null}
      </View>
    );
  }

  const trap = q.trap ?? q.ri?.trap ?? null;
  // A question with options is graded by the answer you pick. One without is
  // still a flip card, which is how the not-yet-converted part of the bank runs.
  const options = q.choices?.length === 4 ? shuffleChoices(q.choices, q.id, seed) : null;
  const revealed = options ? chosen !== null : shown;

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {modes}
      {decks}
      <Text style={type.small}>
        {i + 1} of {queue.length}. {q.kind === 'calc' ? `Set ${q.set}, ${q.setTitle}` : q.deckTitle}
      </Text>
      {/* The trap hint is a study aid, not an exam aid: it gives away which way
          the question bites, so it stays out of the way until the answer is in. */}
      {trap && (!options || revealed) ? (
        <Text style={[type.small, { color: color.trap, fontWeight: '700' }]}>Watch for: {TRAP_NAMES[trap]}</Text>
      ) : null}
      {q.strip ? <RhythmStrip params={q.strip} /> : null}
      <Text style={styles.stem}>{q.stem}</Text>

      {options ? (
        <View style={{ gap: space.l }}>
          {!revealed ? (
            <Text style={type.small}>
              {q.kind === 'calc'
                ? 'Work it on paper first, no calculator. Pick one — it locks in.'
                : 'Pick one. It locks in, so commit before you look.'}
            </Text>
          ) : (
            <Text style={[styles.verdict, { color: chosen?.correct ? color.good : color.bad }]}>
              {chosen?.correct ? 'Correct' : 'Not correct'}
            </Text>
          )}
          <ChoiceList choices={options} chosen={chosen?.id ?? null} onChoose={commit} />
        </View>
      ) : !shown ? (
        <>
          <Text style={type.small}>{q.kind === 'calc' ? 'Work it on paper first, no calculator, about 60 seconds.' : 'Say your answer out loud, then check.'}</Text>
          <View style={{ flexDirection: 'row' }}><Button label="Show answer" onPress={() => setShown(true)} /></View>
        </>
      ) : null}

      {revealed ? (
        <View style={{ gap: space.l }}>
          <View style={styles.national}>
            <NationalLabel />
            {!options ? <Text style={styles.answer}>{q.answer}</Text> : null}
            <Text style={type.body}>{q.work}</Text>
            {q.formula ? <Text style={type.small}>{questionFile.formulas[q.formula]}</Text> : null}
          </View>

          {q.ri ? (
            <RiCallout title={`RI AEMT-C protocol${q.ri.ref ? ` (${q.ri.ref})` : ''}`}>
              {q.ri.stem ? <Text style={[type.body, { fontStyle: 'italic', marginBottom: space.xs }]}>{q.ri.stem}</Text> : null}
              <Text style={[styles.answer, { color: color.ri }]}>{q.ri.answer}</Text>
              <Text style={type.body}>{q.ri.work}</Text>
            </RiCallout>
          ) : q.protocolRef ? (
            <Text style={type.small}>Matches RI protocol {q.protocolRef}.</Text>
          ) : null}

          {q.note ? <Text style={type.small}>{q.note}</Text> : null}
          {q.verify ? <Text style={[type.small, { color: color.trap }]}>Check with your instructor: {q.verify}</Text> : null}

          {/* Graded questions have already been recorded by the choice itself.
              Only the flip cards still need the reader to score themselves. */}
          {options ? (
            <View style={{ flexDirection: 'row' }}>
              <Button label={i + 1 === queue.length ? 'Finish' : 'Next question'} onPress={advance} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: space.m }}>
              <Button label="Missed it" tone="bad" onPress={() => mark('missed')} />
              <Button label="Got it" tone="good" onPress={() => mark('got')} />
            </View>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.l, gap: space.l, paddingBottom: 48 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  row: { flexDirection: 'row', gap: space.s },
  stem: { fontSize: 20, lineHeight: 28, fontWeight: '600', color: color.ink },
  verdict: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
  answer: { fontSize: 22, lineHeight: 28, fontWeight: '700', color: color.national },
  national: { borderLeftWidth: 3, borderLeftColor: color.national, paddingLeft: space.m, gap: space.xs },
});
