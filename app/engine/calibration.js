// Hieu chinh tu tin — Muc 16 dac ta v4.0.
export const CONFIDENCE = [
  { level: 1, label: "Đoán", p: 0.30 },
  { level: 2, label: "Khá chắc", p: 0.65 },
  { level: 3, label: "Chắc chắn", p: 0.90 },
];
/** entries: [{p, correct}] trong cua so 14 ngay. */
export function calibration(entries) {
  if (entries.length < 30) return { status: "insufficient", need: 30 - entries.length };
  const claimed = entries.reduce((a, e) => a + e.p, 0) / entries.length * 100;
  const actual = entries.filter((e) => e.correct).length / entries.length * 100;
  const gap = claimed - actual;
  let label;
  if (Math.abs(gap) <= 8) label = "Khá sát thực tế.";
  else if (gap > 8) label = "Bạn đang tự tin hơi quá.";
  else label = "Bạn đang đánh giá thấp mình.";
  return { status: "ok", claimed, actual, gap, label, calibrated: entries.length >= 60 && Math.abs(gap) <= 8 };
}
