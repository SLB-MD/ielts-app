// Band — Muc 17 dac ta v4.0. Chi quy doi tren de du 40 cau, luon la khoang uoc tinh.
const TABLE = {
  listening: [[39, 9.0], [37, 8.5], [35, 8.0], [32, 7.5], [30, 7.0], [26, 6.5], [23, 6.0], [18, 5.5], [16, 5.0], [13, 4.5], [10, 4.0]],
  reading: [[39, 9.0], [37, 8.5], [35, 8.0], [33, 7.5], [30, 7.0], [27, 6.5], [23, 6.0], [19, 5.5], [15, 5.0], [13, 4.5], [10, 4.0]],
};
export function bandPoint(skill, correct) {
  if (correct < 10) return null; // duoi 4,0, khong du du lieu quy doi
  for (const [min, band] of TABLE[skill]) if (correct >= min) return band;
  return null;
}
/** Khoang band: mac dinh ±0,5 (bandReady=false o v1). */
export function bandInterval(skill, correct, bandReady = false) {
  const b = bandPoint(skill, correct);
  if (b === null) return null;
  if (!bandReady) return [Math.max(1, b - 0.5), Math.min(9, b + 0.5)];
  const row = TABLE[skill].find(([, band]) => band === b);
  const idx = TABLE[skill].indexOf(row);
  const hi = idx === 0 ? 40 : TABLE[skill][idx - 1][0] - 1;
  const p = (correct - row[0]) / (hi - row[0]);
  return p >= 0.5 ? [b, Math.min(9, b + 0.5)] : [Math.max(1, b - 0.5), b];
}
const fmt = (x) => String(x).replace(".", ",");
export function formatInterval([lo, hi]) { return fmt(lo) + "–" + fmt(hi); }
/** Overall: trung binh 4 ky nang, le 0,25 len 0,5; le 0,75 len so nguyen ke tiep (Muc 17.4). */
export function overallBand(scores) {
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.floor(mean * 2 + 0.5) / 2;
}
