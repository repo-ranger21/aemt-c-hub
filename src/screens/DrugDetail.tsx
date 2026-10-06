import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { DrugCard, FormularyCode } from '../types';
import { Bullets, Button, Section } from '../components/Ui';
import { ConflictList, RiCallout } from '../components/Standards';
import { color, space, type } from '../theme';

const CODE: Record<FormularyCode, string> = {
  R: 'Required', O: 'Optional', C: 'Choice', 'O/C': 'Optional (choice)', 'R/C': 'Required (choice)', P: "Patient's own", X: 'Not in scope',
};

// What the two scopes together mean for this drug. A drug can be outside the
// national AEMT scope and still outside RI's AEMT-C scope — saying "know it for
// RI AEMT-C" in that case would be wrong.
function scopeNote(drug: DrugCard): string | null {
  const riCarries = drug.scope.some((s) => s.startsWith('ri-'));
  if (drug.nremtScope === 'in') return 'Within the national AEMT scope: expect it on the NREMT.';
  if (drug.nremtScope === 'out') {
    return riCarries
      ? 'Beyond the national AEMT scope: unlikely on the NREMT AEMT exam, but RI carries it at your level.'
      : 'Outside the national AEMT scope and outside your RI AEMT-C scope. Here for recognition only — you would not carry or give it.';
  }
  return riCarries ? null : 'Not carried at any RI level. Here for recognition only.';
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

      {national ? <Text style={[type.body, { color: drug.nremtScope === 'in' ? color.national : color.muted }]}>{national}</Text> : null}

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
        <View style={styles.grid}>
          {(['E', 'A', 'AC'] as const).map((lvl) => (
            <View key={lvl} style={styles.cell}>
              <Text style={type.small}>{{ E: 'EMT', A: 'AEMT', AC: 'AEMT-C' }[lvl]}</Text>
              <Text style={[type.body, { fontWeight: '600', color: drug.formulary[lvl] === 'X' ? color.muted : color.ink }]}>{CODE[drug.formulary[lvl]]}</Text>
            </View>
          ))}
        </View>
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
