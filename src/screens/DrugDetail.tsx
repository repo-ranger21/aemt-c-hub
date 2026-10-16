import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { DoseBlock, DrugCard, FormularyCode } from '../types';
import { Bullets, Button, Section } from '../components/Ui';
import { ConflictList, RiCallout } from '../components/Standards';
import { isCarried } from '../data';
import { color, space, type } from '../theme';

// Dosing is the thing a medic actually opens the card for, so it gets the most
// structure: population first, then what you are treating, then the dose. The
// adult and paediatric blocks are visually separated because mixing them up is
// the single most consequential error on this screen.
function Dosing({ blocks }: { blocks: DoseBlock[] }) {
  const groups = (['adult', 'pediatric'] as const)
    .map((p) => [p, blocks.filter((b) => b.population === p)] as const)
    .filter(([, bs]) => bs.length);

  return (
    <View style={{ gap: space.m }}>
      {groups.map(([population, bs]) => (
        <View key={population} style={styles.doseGroup}>
          <Text style={styles.doseHead}>{population === 'adult' ? 'Adult' : 'Pediatric'}</Text>
          {bs.map((b, i) => (
            <View key={`${b.indication ?? ''}-${i}`} style={{ gap: 2 }}>
              {b.indication ? <Text style={styles.doseFor}>{b.indication}</Text> : null}
              {b.doses.map((dose) => (
                <Text key={dose} style={styles.dose}>{dose}</Text>
              ))}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

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

      {drug.dosing?.length ? (
        <Section title="Dosage and administration"><Dosing blocks={drug.dosing} /></Section>
      ) : null}

      {drug.pharmacokinetics ? (
        <Section title="Duration of action">
          <View style={styles.grid}>
            {([['Onset', drug.pharmacokinetics.onset], ['Peak', drug.pharmacokinetics.peak], ['Duration', drug.pharmacokinetics.duration]] as const)
              .filter(([, v]) => v)
              .map(([label, v]) => (
                <View key={label} style={styles.cell}>
                  <Text style={type.small}>{label}</Text>
                  <Text style={[type.body, { fontWeight: '600' }]}>{v}</Text>
                </View>
              ))}
          </View>
        </Section>
      ) : null}

      {drug.adverse?.length ? (
        <Section title="Adverse reactions">
          <View style={{ gap: space.xs }}>
            {drug.adverse.map((a, i) => (
              <Text key={`${a.system}-${i}`} style={type.body}>
                <Text style={{ fontWeight: '700' }}>{a.system}: </Text>{a.effects}
              </Text>
            ))}
          </View>
        </Section>
      ) : null}

      {drug.interactions?.length ? (
        <Section title="Drug interactions"><Bullets items={drug.interactions} /></Section>
      ) : null}

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

      {/* The label's own indication wording, kept for the pharmacology but placed
          last: it is written for inpatient use and reads wrong as a field
          indication, which is why the protocol indication leads the card. */}
      {drug.labelIndications?.length ? (
        <Section title="On the FDA label">
          <Bullets items={drug.labelIndications} />
          <Text style={[type.small, { marginTop: space.xs }]}>{drug.source.doc}</Text>
        </Section>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.l, gap: space.xl, paddingBottom: 48 },
  grid: { flexDirection: 'row', gap: space.s },
  cell: { flex: 1, padding: space.s, borderWidth: 1, borderColor: color.rule, borderRadius: 6, backgroundColor: color.surface },
  doseGroup: { gap: space.s, borderLeftWidth: 3, borderLeftColor: color.rule, paddingLeft: space.m },
  doseHead: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: color.muted },
  doseFor: { fontSize: 13, fontWeight: '600', color: color.muted },
  dose: { fontSize: 16, lineHeight: 23, fontWeight: '600', color: color.ink },
});
