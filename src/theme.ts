// Star of Life blue for the national standard, Rhode Island anchor gold for state protocol.
export const color = {
  paper: '#F7F9FB',
  surface: '#FFFFFF',
  ink: '#1C2733',
  muted: '#5E6B78',
  rule: '#D9E0E7',
  national: '#1E5AA8',
  nationalTint: '#EAF1FA',
  ri: '#9A6F1E',
  riRule: '#C99A3B',
  riTint: '#FBF4E4',
  trap: '#B3261E',
  good: '#2E7D4F',
  ecgGridLight: '#E4EDF6',
  ecgGridDark: '#B9CBE0',
};

export const type = {
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const, color: color.ink },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const, color: color.ink },
  body: { fontSize: 16, lineHeight: 24, color: color.ink },
  small: { fontSize: 13, lineHeight: 18, color: color.muted },
};

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24 };
