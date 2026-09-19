import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { drugs, inMyScope } from '../data';
import type { DrugCard } from '../types';
import { Chip } from '../components/Ui';
import { color, space, type } from '../theme';

type Filter = 'all' | 'mine' | 'conflicts';

export default function Drugs({ onOpen }: { onOpen: (d: DrugCard) => void }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('mine');

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return drugs.filter((d) => {
      if (filter === 'mine' && !inMyScope(d)) return false;
      if (filter === 'conflicts' && !d.conflicts?.length) return false;
      if (!needle) return true;
      return [d.name, d.class, ...d.brand, ...d.indications].join(' ').toLowerCase().includes(needle);
    });
  }, [q, filter]);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.head}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search name, brand, or indication"
          placeholderTextColor={color.muted}
          style={styles.search}
          autoCorrect={false}
          accessibilityLabel="Search drugs"
        />
        <View style={styles.chips}>
          <Chip label="My AEMT-C scope" active={filter === 'mine'} onPress={() => setFilter('mine')} />
          <Chip label="NREMT vs RI differs" active={filter === 'conflicts'} onPress={() => setFilter('conflicts')} />
          <Chip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
        </View>
      </View>
      <FlatList
        data={list}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ paddingHorizontal: space.l, paddingBottom: space.xl }}
        ListEmptyComponent={<Text style={[type.small, { padding: space.l }]}>No drugs match. Try a brand name or clear the filter.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => onOpen(item)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.nationalTint }]}>
            <View style={{ flex: 1 }}>
              <Text style={type.heading}>{item.name}</Text>
              <Text style={type.small}>{item.class}</Text>
            </View>
            {item.conflicts?.length ? <View style={styles.riDot} accessibilityLabel="RI differs from national" /> : null}
            {!inMyScope(item) ? <Text style={[type.small, { color: color.trap }]}>Not AEMT-C</Text> : null}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { padding: space.l, gap: space.m },
  search: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.rule, borderRadius: 8, padding: space.m, fontSize: 16, color: color.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.m, borderBottomWidth: 1, borderBottomColor: color.rule },
  riDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.riRule },
});
