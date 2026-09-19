import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, space, type } from '../theme';

export function Button({ label, onPress, tone = 'primary' }: { label: string; onPress: () => void; tone?: 'primary' | 'quiet' | 'bad' | 'good' }) {
  const bg = { primary: color.national, quiet: color.surface, bad: color.trap, good: color.good }[tone];
  const fg = tone === 'quiet' ? color.ink : '#FFFFFF';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.btn, { backgroundColor: bg, opacity: pressed ? 0.8 : 1, borderWidth: tone === 'quiet' ? 1 : 0 }]}
    >
      <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: color.ink, borderColor: color.ink }]}
    >
      <Text style={[type.small, { color: active ? '#FFFFFF' : color.ink }]}>{label}</Text>
    </Pressable>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.s }}>
      <Text style={type.heading}>{title}</Text>
      {children}
    </View>
  );
}

export function Bullets({ items }: { items: string[] }) {
  return (
    <View style={{ gap: space.xs }}>
      {items.map((t) => (
        <Text key={t} style={type.body}>{'\u2022  '}{t}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center', borderColor: color.rule },
  btnText: { fontSize: 16, fontWeight: '600' },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: color.rule, backgroundColor: color.surface },
});
