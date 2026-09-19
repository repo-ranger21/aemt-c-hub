import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { questions } from '../data';
import { isDue, type ReviewMap } from '../lib/review';
import { Button, Section } from '../components/Ui';
import { color, space, type } from '../theme';

const DOMAIN_NAMES: Record<string, string> = {
  airway: 'Airway', cardiology: 'Cardiology', trauma: 'Trauma', medical: 'Medical', operations: 'Operations',
};

export default function Today({ reviews, onStart }: { reviews: ReviewMap; onStart: () => void }) {
  const due = questions.filter((q) => isDue(reviews[q.id])).length;
  const seen = questions.filter((q) => reviews[q.id]).length;
  const mastered = questions.filter((q) => (reviews[q.id]?.box ?? 0) >= 4).length;

  // Share of seen questions last marked "missed", per domain.
  const weak = Object.keys(DOMAIN_NAMES)
    .map((d) => {
      const s = questions.filter((q) => q.domain === d && reviews[q.id]);
      const missed = s.filter((q) => reviews[q.id].lastResult === 'missed').length;
      return { d, seen: s.length, rate: s.length ? missed / s.length : 0 };
    })
    .filter((x) => x.seen > 0)
    .sort((a, b) => b.rate - a.rate);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.big}>{due}</Text>
      <Text style={type.body}>questions due today</Text>
      <View style={{ flexDirection: 'row', marginTop: space.l }}>
        <Button label={due ? 'Start drill' : 'Drill anyway'} onPress={onStart} />
      </View>

      <Section title="Progress">
        <Text style={type.body}>{seen} of {questions.length} questions attempted, {mastered} solid (box 4 or higher).</Text>
      </Section>

      <Section title="Where you're missing most">
        {weak.length === 0 ? (
          <Text style={type.small}>Finish a drill and your weakest areas show up here.</Text>
        ) : (
          weak.map((w) => (
            <View key={w.d} style={styles.row}>
              <Text style={type.body}>{DOMAIN_NAMES[w.d]}</Text>
              <Text style={[type.body, { color: w.rate > 0.3 ? color.trap : color.muted }]}>{Math.round(w.rate * 100)}% missed</Text>
            </View>
          ))
        )}
      </Section>

      <Section title="How answers are shown">
        <Text style={type.body}>
          Every answer leads with the national method, since that's what the NREMT tests. When Rhode Island's AEMT-C protocol differs, it follows in a gold box.
        </Text>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.l, gap: space.xl },
  big: { fontSize: 64, lineHeight: 68, fontWeight: '800', color: color.national },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.xs, borderBottomWidth: 1, borderBottomColor: color.rule },
});
