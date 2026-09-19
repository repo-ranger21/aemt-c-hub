import { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Today from './src/screens/Today';
import Drugs from './src/screens/Drugs';
import DrugDetail from './src/screens/DrugDetail';
import Topics from './src/screens/Topics';
import Drill from './src/screens/Drill';
import { loadReviews, saveReviews, type ReviewMap } from './src/lib/review';
import type { DrugCard } from './src/types';
import { color, space } from './src/theme';

type Tab = 'today' | 'drugs' | 'topics' | 'drill';
const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'drugs', label: 'Drugs' },
  { id: 'topics', label: 'Topics' },
  { id: 'drill', label: 'Drill' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('today');
  const [drug, setDrug] = useState<DrugCard | null>(null);
  const [reviews, setReviews] = useState<ReviewMap>({});

  useEffect(() => { loadReviews().then(setReviews); }, []);

  // Android back closes a drug card before leaving the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (drug) { setDrug(null); return true; }
      return false;
    });
    return () => sub.remove();
  }, [drug]);

  const updateReviews = (next: ReviewMap) => { setReviews(next); saveReviews(next); };

  let screen: React.ReactNode;
  if (tab === 'today') screen = <Today reviews={reviews} onStart={() => setTab('drill')} />;
  else if (tab === 'drugs') screen = drug ? <DrugDetail drug={drug} onBack={() => setDrug(null)} /> : <Drugs onOpen={setDrug} />;
  else if (tab === 'topics') screen = <Topics />;
  else screen = <Drill reviews={reviews} onGrade={updateReviews} />;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}>{screen}</View>
        <View style={styles.tabs} accessibilityRole="tablist">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <Pressable
                key={t.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => { setTab(t.id); if (t.id !== 'drugs') setDrug(null); }}
                style={styles.tab}
              >
                <View style={[styles.bar, active && { backgroundColor: color.national }]} />
                <Text style={[styles.tabText, active && { color: color.national, fontWeight: '700' }]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.paper },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: color.rule, backgroundColor: color.surface },
  tab: { flex: 1, alignItems: 'center', paddingBottom: space.s, minHeight: 52 },
  bar: { height: 3, width: 32, borderRadius: 2, marginBottom: space.s, backgroundColor: 'transparent' },
  tabText: { fontSize: 14, color: color.muted },
});
