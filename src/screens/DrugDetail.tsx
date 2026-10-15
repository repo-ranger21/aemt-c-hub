import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { DrugCard, FormularyCode } from '../types';
import { Bullets, Button, Section } from '../components/Ui';
import { ConflictList, RiCallout } from '../components/Standards';
import { isCarried } from '../data';
import { color, space, type } from '../theme';

// Wording follows the appendix 09.00 legend.
const CODE: Record<FormularyCode, string> = {
  R: 'Required', O: 'Optional', C: 'Choice', 'O/C': 'Optional (choice)', 'R/C': 'Required (choice)',
  P: "Patient's own", TM: 'Monitor/titrate only', X: 'Not in scope',
};

// What the two scopes together mean for this drug. A drug can be outside the
// national AEMT scope and still outside RI's AEMT-C scope — saying "know it for
// RI AEMT-C" in that case would be wrong.
function scopeNote(drug: DrugCard): string | null {
  const riCarries = drug.formulary.some((e) => isCarried(e.codes.A) || isCarried(e.codes.AC));
  // A drug can be in the national scope and carried at no RI level — the Model
  // authorises "Parenteral analgesia for pain" at AEMT, but RI stocks ketorolac
  // nowhere. Saying only "expect it on the NREMT" would leave a student thinking
  // they carry it.
  if (drug.national.status === 'in') {
    return riCarries
      ? 'Within the national AEMT scope: expect it on the NREMT.'
      : 'Within the national AEMT scope (expect it on the NREMT), but NOT carried at any RI level.';
  }
  return riCarries
    ? 'Beyond the national AEMT scope: unlikely on the NREMT AEMT exam, but RI carries it at your level.'
    : 'Outside the national AEMT scope and outside your RI AEMT-C scope. Here for recognition only — you would not carry or give it.';
}

export default function DrugDetail({ drug, onBack }: { drug: DrugCard; onBack: () => void }) {
  const general = drug.pearls;
  const ri = drug.riPearls;
  const national = scopeNote(drug);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={{ flexDirection: 'row' }}>
        <Button label="Back to drugs" tone="quiet" onPress={onBack} />
      </View>
      <View>
        <Text style={type.title}>{drug.name}</Text>
        {drug.brand.length ? <Text style={type.small}>{drug.brand.join(', ')}</Text> : null}
        <Text style={[type.body, { color: color.muted }]}>{drug.class}</Text>
      </View>

      {national ? <Text style={[type.body, { color: drug.national.status === 'in' ? color.national : color.muted }]}>{national}</Text> : null}

      <Section title="How it works"><Text style={type.body}>{drug.mechanism}</Text></Section>
      <Section title="Indications"><Bullets items={drug.indications} /></Section>
      {drug.contraindications.length ? <Section title="Contraindications"><Bullets items={drug.contraindications} /></Section> : null}
      {general.length ? <Section title="Pearls"><Bullets items={general} /></Section> : null}

      {drug.conflicts?.length ? (
        <Section title="NREMT vs RI">
          <ConflictList conflicts={drug.conflicts} />
        </Section>
      ) : null}

      {ri.length ? (
        <RiCallout title="RI AEMT-C protocol detail">
          <Bullets items={ri.map((p) => p.replace(/^RI /, ''))} />
        </RiCallout>
      ) : null}

      <Section title="RI formulary">
        {drug.formulary.length === 0 ? (
          <Text style={[type.body, { color: color.muted }]}>Not listed in the RI protocols at any level.</Text>
        ) : (
          drug.formulary.map((entry) => (
            // One block per appendix 09.00 row. EMR and Paramedic are stored but not
            // shown — three columns is what fits a phone, and they aren't your levels.
            <View key={`${entry.formulation}|${entry.minimumQuantity ?? ''}`} style={{ gap: space.s }}>
              {drug.formulary.length > 1 ? <Text style={type.small}>{entry.formulation}</Text> : null}
              <View style={styles.grid}>
                {(['E', 'A', 'AC'] as const).map((lvl) => (
                  <View key={lvl} style={styles.cell}>
                    <Text style={type.small}>{{ E: 'EMT', A: 'AEMT', AC: 'AEMT-C' }[lvl]}</Text>
                    <Text style={[type.body, { fontWeight: '600', color: entry.codes[lvl] === 'X' ? color.muted : color.ink }]}>{CODE[entry.codes[lvl]]}</Text>
                  </View>
                ))}
              </View>
              {entry.minimumQuantity ? <Text style={type.small}>Minimum: {entry.minimumQuantity}</Text> : null}
              {entry.note ? <Text style={type.small}>{entry.note}</Text> : null}
            </View>
          ))
        )}
        {drug.supply ? <Text style={type.small}>Supply: {drug.supply}</Text> : null}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.l, gap: space.xl, paddingBottom: 48 },
  grid: { flexDirection: 'row', gap: space.s },
  cell: { flex: 1, padding: space.s, borderWidth: 1, borderColor: color.rule, borderRadius: 6, backgroundColor: color.surface },
});
