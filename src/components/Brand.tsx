import { Image, StyleSheet, Text, View } from 'react-native';
import { brand, color, space } from '../theme';

// Persistent app header. The mark is the heart/Star-of-Life element lifted from
// the American Safety Programs & Training logo — the full lockup's wordmark is
// unreadable below about 90px tall, so the mark carries the brand here and the
// company name is set in type beside it. The full logo is used intact on Today.
export function AppHeader() {
  return (
    <View style={styles.bar}>
      <Image
        source={require('../../assets/aspt-mark.png')}
        style={styles.mark}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
        accessible
        accessibilityRole="image"
        accessibilityLabel="American Safety Programs and Training"
      />
      <View style={styles.titles}>
        <Text style={styles.title}>AEMT-C Hub</Text>
        <Text style={styles.company} numberOfLines={1}>
          American Safety Programs &amp; Training
        </Text>
      </View>
    </View>
  );
}

// Full logo, unmodified, for the home screen.
export function BrandLockup() {
  return (
    <View style={styles.lockup}>
      <Image
        source={require('../../assets/aspt-logo.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
        accessible
        accessibilityRole="image"
        accessibilityLabel="American Safety Programs and Training — Teaching Others to Save Lives"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    paddingHorizontal: space.l,
    paddingVertical: space.s,
    backgroundColor: color.surface,
    borderBottomWidth: 1,
    borderBottomColor: color.rule,
  },
  mark: { width: 32, height: 32 },
  titles: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700', color: brand.navy, letterSpacing: 0.2 },
  company: { fontSize: 11, lineHeight: 14, color: color.muted },
  lockup: { alignItems: 'center', paddingTop: space.s, paddingBottom: space.m },
  logo: { width: 200, height: 157 },
});
