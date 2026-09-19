import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { topicDecks, topics } from '../data';
import { Bullets, Chip } from '../components/Ui';
import { ConflictList } from '../components/Standards';
import { color, space, type } from '../theme';

export default function Topics() {
  const [deck, setDeck] = useState(topicDecks[0]?.id ?? '');
  const [open, setOpen] = useState<string | null>(null);
  const cards = topics.filter((t) => t.deck === deck);
  const current = topicDecks.find((d) => d.id === deck);
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {topicDecks.map((d) => (
          <Chip key={d.id} label={d.title} active={d.id === deck} onPress={() => { setDeck(d.id); setOpen(null); }} />
        ))}
      </ScrollView>
      <Text style={type.title}>{current?.title}</Text>
      <Text style={type.small}>
        {cards.length} cards{cards[0]?.chapter ? `, textbook chapter ${cards[0].chapter}` : ''}. Gold dot = NREMT and RI differ.
      </Text>
      {cards.map((t) => {
        const expanded = open === t.id;
        const riOnly = !t.scope.includes('nremt-aemt');
        return (
          <View key={t.id} style={styles.item}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setOpen(expanded ? null : t.id)}
              style={styles.head}
            >
              <Text style={[type.heading, { flex: 1 }]}>{t.title}</Text>
              {riOnly ? <Text style={[type.small, { color: color.ri }]}>RI only</Text> : null}
              {t.conflicts?.length ? <View style={styles.riDot} /> : null}
            </Pressable>
            {expanded ? (
              <View style={{ gap: space.l, paddingBottom: space.m }}>
                <Bullets items={t.body} />
                <ConflictList conflicts={t.conflicts} />
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.l, gap: space.s, paddingBottom: 48 },
  chips: { flexDirection: 'row', gap: space.s, marginBottom: space.s },
  item: { borderBottomWidth: 1, borderBottomColor: color.rule },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.s, paddingVertical: space.m },
  riDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.riRule },
});
