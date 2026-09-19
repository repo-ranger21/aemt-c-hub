// Original, procedurally-synthesized ECG rhythm strip. Nothing here traces or embeds a
// textbook image — the waveform is generated from the strip's parameters at render time.
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import type { RhythmStripParams } from '../types';
import { color, space, type } from '../theme';

const PX_PER_SECOND = 100;
const SMALL_BOX = 0.04 * PX_PER_SECOND; // one small box = 0.04 s
const BIG_BOX = SMALL_BOX * 5;          // one big box = 0.20 s
const HEIGHT = 140;
const BASELINE = HEIGHT / 2;
const AMP = 34; // px per unit amplitude
const DT = 0.008; // sample step, seconds

function hashSeed(params: RhythmStripParams): number {
  const s = JSON.stringify(params);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

function makeRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

interface QrsEvent { t: number; wide: boolean; polymorphic?: boolean }

function buildRegularQrs(
  rate: number,
  regularity: RhythmStripParams['regularity'],
  seconds: number,
  rnd: () => number,
  wide: boolean,
  polymorphic?: boolean,
): QrsEvent[] {
  const rr = 60 / rate;
  const events: QrsEvent[] = [];
  let t = rr * 0.3;
  while (t < seconds) {
    events.push({ t, wide, polymorphic });
    let interval = rr;
    if (regularity === 'irregularly-irregular') interval = rr * (0.55 + rnd() * 0.9);
    else if (regularity === 'irregular') interval = rr * (0.85 + rnd() * 0.3);
    t += interval;
  }
  return events;
}

function buildRegularPTimes(rate: number, seconds: number): number[] {
  const pp = 60 / rate;
  const times: number[] = [];
  let t = pp * 0.3;
  while (t < seconds) {
    times.push(t);
    t += pp;
  }
  return times;
}

// Shared by Wenckebach (PR lengthens each beat, then a drop) and fixed-ratio
// Mobitz II (PR constant, then a drop) — the atrial P-P interval stays regular
// in both; only whether/how the PR interval moves differs.
function buildGroupedBeating(params: RhythmStripParams): { pTimes: number[]; qrsEvents: QrsEvent[] } {
  const ratio = params.conductionRatio ?? 4;
  const conducted = ratio - 1;
  const pp = ((60 / params.rate) * conducted) / ratio;
  const basePr = params.prInterval ?? 0.16;
  const seconds = params.seconds ?? 6;
  const pTimes: number[] = [];
  const qrsEvents: QrsEvent[] = [];
  let t = pp * 0.3;
  let idx = 0;
  while (t < seconds) {
    pTimes.push(t);
    const pos = idx % ratio;
    if (pos !== ratio - 1) {
      const pr = params.droppedBeats === 'wenckebach' ? basePr + pos * 0.035 : basePr;
      qrsEvents.push({ t: t + pr, wide: false });
    }
    t += pp;
    idx++;
  }
  return { pTimes, qrsEvents };
}

// Premature wide beat, sinus beat, repeat — the classic "every other beat" PVC pattern.
function buildBigeminy(params: RhythmStripParams): { pTimes: number[]; qrsEvents: QrsEvent[] } {
  const rr = 60 / params.rate;
  const seconds = params.seconds ?? 6;
  const pTimes: number[] = [];
  const qrsEvents: QrsEvent[] = [];
  let t = rr * 0.3;
  let pvc = false;
  while (t < seconds) {
    qrsEvents.push({ t, wide: pvc });
    if (!pvc && params.prInterval != null) pTimes.push(t - params.prInterval);
    t += pvc ? rr * 1.25 : rr * 0.7;
    pvc = !pvc;
  }
  return { pTimes, qrsEvents };
}

type Continuous = 'flat' | 'sawtooth' | 'fibrillatory' | null;

function buildEvents(params: RhythmStripParams, rnd: () => number): { pTimes: number[]; qrsEvents: QrsEvent[]; continuous: Continuous } {
  const seconds = params.seconds ?? 6;
  if (params.flatline) return { pTimes: [], qrsEvents: [], continuous: 'flat' };

  const wide = params.qrsWidth > 0.1;

  if (params.pWaves === 'sawtooth') {
    return { pTimes: [], qrsEvents: buildRegularQrs(params.rate, params.regularity, seconds, rnd, wide), continuous: 'sawtooth' };
  }
  if (params.pWaves === 'fibrillatory') {
    return { pTimes: [], qrsEvents: buildRegularQrs(params.rate, params.regularity, seconds, rnd, wide), continuous: 'fibrillatory' };
  }
  if (params.pWaves === 'dissociated') {
    const qrsEvents = buildRegularQrs(params.rate, params.regularity, seconds, rnd, wide, params.polymorphic);
    const pTimes = buildRegularPTimes(params.atrialRate ?? params.rate * 2, seconds);
    return { pTimes, qrsEvents, continuous: null };
  }
  if (params.droppedBeats === 'wenckebach' || params.droppedBeats === 'fixed-ratio') {
    return { ...buildGroupedBeating(params), continuous: null };
  }
  if (params.droppedBeats === 'bigeminy') {
    return { ...buildBigeminy(params), continuous: null };
  }

  const qrsEvents = buildRegularQrs(params.rate, params.regularity, seconds, rnd, wide, params.polymorphic);
  const pTimes =
    (params.pWaves === 'normal' || params.pWaves === 'inverted') && params.prInterval != null
      ? qrsEvents.map((e) => e.t - params.prInterval!).filter((t) => t > 0)
      : [];
  return { pTimes, qrsEvents, continuous: null };
}

function gaussian(t: number, center: number, sigma: number, amp: number): number {
  const d = t - center;
  return amp * Math.exp(-(d * d) / (2 * sigma * sigma));
}

function sampleWaveform(
  events: { pTimes: number[]; qrsEvents: QrsEvent[]; continuous: Continuous },
  params: RhythmStripParams,
  seconds: number,
  rnd: () => number,
): number[] {
  const n = Math.round(seconds / DT) + 1;
  const samples = new Array(n).fill(0);
  const noiseAmp = params.flatline ? 0.04 : 0.015;
  const seeds = [rnd() * 100, rnd() * 100, rnd() * 100];

  for (let i = 0; i < n; i++) {
    const t = i * DT;
    let v =
      noiseAmp *
      (Math.sin(2 * Math.PI * 6.3 * t + seeds[0]) * 0.5 +
        Math.sin(2 * Math.PI * 11.7 * t + seeds[1]) * 0.3 +
        Math.sin(2 * Math.PI * 17.1 * t + seeds[2]) * 0.2);

    if (events.continuous === 'sawtooth') {
      const period = 60 / (params.atrialRate ?? 300);
      const phase = (t % period) / period;
      v += (phase < 0.5 ? phase * 2 : (1 - phase) * 2 - 1) * 0.16;
    }
    if (events.continuous === 'fibrillatory') {
      v +=
        0.06 *
        (Math.sin(2 * Math.PI * 5.1 * t + seeds[0] * 2) * 0.5 +
          Math.sin(2 * Math.PI * 8.7 * t + seeds[1] * 2) * 0.35 +
          Math.sin(2 * Math.PI * 13.3 * t + seeds[2] * 2) * 0.25);
    }

    for (const pt of events.pTimes) {
      if (Math.abs(t - pt) > 0.25) continue;
      const sign = params.pWaves === 'inverted' ? -1 : 1;
      v += gaussian(t, pt, 0.032, sign * 0.16);
    }

    for (let k = 0; k < events.qrsEvents.length; k++) {
      const e = events.qrsEvents[k];
      if (Math.abs(t - e.t) > 0.4) continue;
      if (e.wide) {
        const sign = e.polymorphic ? (Math.sin(k * 2.4) > 0 ? 1 : -1) : 1;
        const peak = e.polymorphic ? 0.85 + 0.5 * Math.abs(Math.sin(k * 1.7)) : 1.15;
        const width = Math.max(params.qrsWidth, 0.14) / 2.6;
        v += gaussian(t, e.t, width, sign * peak);
        v += gaussian(t, e.t + width * 2.8, width * 1.4, -sign * peak * 0.35);
        v += gaussian(t, e.t + 0.22, 0.07, -sign * 0.22); // discordant T
      } else {
        const w = params.qrsWidth / 3;
        v += gaussian(t, e.t - w * 1.1, w * 0.6, -0.12);
        v += gaussian(t, e.t, w * 0.75, 1.0);
        v += gaussian(t, e.t + w * 1.1, w * 0.6, -0.22);
        v += gaussian(t, e.t + 0.16, 0.07, 0.24); // T wave
      }
    }

    samples[i] = v;
  }
  return samples;
}

function toPath(samples: number[]): string {
  return samples
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * DT * PX_PER_SECOND).toFixed(1)} ${(BASELINE - v * AMP).toFixed(1)}`)
    .join(' ');
}

export function RhythmStrip({ params, caption }: { params: RhythmStripParams; caption?: string }) {
  const seconds = params.seconds ?? 6;
  const width = seconds * PX_PER_SECOND;
  const paramsKey = JSON.stringify(params);

  const path = useMemo(() => {
    const seed = params.seed ?? hashSeed(params);
    const events = buildEvents(params, makeRng(seed));
    const samples = sampleWaveform(events, params, seconds, makeRng(seed + 7));
    return toPath(samples);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator bounces={false}>
        <Svg width={width} height={HEIGHT}>
          <Defs>
            <Pattern id="ecgSmallGrid" width={SMALL_BOX} height={SMALL_BOX} patternUnits="userSpaceOnUse">
              <Path d={`M ${SMALL_BOX} 0 L 0 0 0 ${SMALL_BOX}`} stroke={color.ecgGridLight} strokeWidth={0.5} fill="none" />
            </Pattern>
            <Pattern id="ecgBigGrid" width={BIG_BOX} height={BIG_BOX} patternUnits="userSpaceOnUse">
              <Rect width={BIG_BOX} height={BIG_BOX} fill="url(#ecgSmallGrid)" />
              <Path d={`M ${BIG_BOX} 0 L 0 0 0 ${BIG_BOX}`} stroke={color.ecgGridDark} strokeWidth={1} fill="none" />
            </Pattern>
          </Defs>
          <Rect width={width} height={HEIGHT} fill="url(#ecgBigGrid)" />
          <Path d={path} stroke={color.national} strokeWidth={1.75} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        </Svg>
      </ScrollView>
      {caption ? <Text style={type.small}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
});
