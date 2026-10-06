import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { questionFile, questions } from '../data';
import type { CalcQuestion } from '../types';
import { grade, isDue, type ReviewMap } from '../lib/review';
import { Button, Chip } from '../components/Ui';
import { NationalLabel, RiCallout } from '../components/Standards';
import { RhythmStrip } from '../components/RhythmStrip';
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

  const q = queue[i];
  const restart = (m: Mode, d = deck) => { setMode(m); setDeck(d); setSeed((s) => s + 1); setI(0); setShown(false); };

  const mark = (result: 'got' | 'missed') => {
    onGrade({ ...reviews, [q.id]: grade(reviews[q.id], q.id, result) });
    setShown(false);
    setI((n) => n + 1);
  };

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
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {modes}
      {decks}
      <Text style={type.small}>
        {i + 1} of {queue.length}. {q.kind === 'calc' ? `Set ${q.set}, ${q.setTitle}` : q.deckTitle}
      </Text>
      {trap ? <Text style={[type.small, { color: color.trap, fontWeight: '700' }]}>Watch for: {TRAP_NAMES[trap]}</Text> : null}
      {q.strip ? <RhythmStrip params={q.strip} /> : null}
      <Text style={styles.stem}>{q.stem}</Text>

      {!shown ? (
        <>
          <Text style={type.small}>{q.kind === 'calc' ? 'Work it on paper first, no calculator, about 60 seconds.' : 'Say your answer out loud, then check.'}</Text>
          <View style={{ flexDirection: 'row' }}><Button label="Show answer" onPress={() => setShown(true)} /></View>
        </>
      ) : (
        <View style={{ gap: space.l }}>
          <View style={styles.national}>
            <NationalLabel />
            <Text style={styles.answer}>{q.answer}</Text>
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

          <View style={{ flexDirection: 'row', gap: space.m }}>
            <Button label="Missed it" tone="bad" onPress={() => mark('missed')} />
            <Button label="Got it" tone="good" onPress={() => mark('got')} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.l, gap: space.l, paddingBottom: 48 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  row: { flexDirection: 'row', gap: space.s },
  stem: { fontSize: 20, lineHeight: 28, fontWeight: '600', color: color.ink },
  answer: { fontSize: 22, lineHeight: 28, fontWeight: '700', color: color.national },
  national: { borderLeftWidth: 3, borderLeftColor: color.national, paddingLeft: space.m, gap: space.xs },
});
