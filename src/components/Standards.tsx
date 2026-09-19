import { StyleSheet, Text, View } from 'react-native';
import type { Conflict } from '../types';
import { color, space, type } from '../theme';

// The app's one rule: national method first (it's what the NREMT tests),
// then the RI AEMT-C protocol, only where the two disagree.
export function NationalLabel() {
  return <Text style={[styles.label, { color: color.national }]}>NREMT / national</Text>;
}

export function RiCallout({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={styles.ri}>
      <Text style={[styles.label, { color: color.ri }]}>{title ?? 'RI AEMT-C protocol'}</Text>
      {children}
    </View>
  );
}

export function ConflictList({ conflicts }: { conflicts?: Conflict[] }) {
  if (!conflicts?.length) return null;
  return (
    <View style={{ gap: space.m }}>
      {conflicts.map((c) => (
        <View key={c.topic} style={{ gap: space.s }}>
          <Text style={type.heading}>{c.topic}</Text>
          <View style={styles.national}>
            <NationalLabel />
            <Text style={type.body}>{c.nremt}</Text>
          </View>
          <RiCallout>
            <Text style={type.body}>{c.ri}</Text>
          </RiCallout>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  national: { borderLeftWidth: 3, borderLeftColor: color.national, paddingLeft: space.m },
  ri: {
    backgroundColor: color.riTint,
    borderLeftWidth: 3,
    borderLeftColor: color.riRule,
    paddingVertical: space.s,
    paddingHorizontal: space.m,
    borderRadius: 4,
  },
});
