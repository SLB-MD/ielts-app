// Ke hoach hang ngay — Muc 15.2, 15.3 dac ta v4.0.
export function smoothAcc(correct, n) { return (correct + 4 * 0.6) / (n + 4); }
export function priority({ accSmooth, overdueDays = 0, relevance, gapRatio = 0, minutes }) {
  const W = 1 - accSmooth;
  const U = Math.min(1, overdueDays / 3);
  const G = Math.min(1, gapRatio);
  const C = minutes / 30;
  return 0.35 * W + 0.25 * U + 0.20 * relevance + 0.15 * G - 0.10 * C;
}
/** Chon viec: uu tien giam dan, tong phut trong [M-3, M+3], toi da 2 viec cung ky nang,
    dam bao co mot nhiem vu san xuat (luat buoc 4, Muc 15.3). SRS xu ly rieng o buoc 1. */
export function buildPlan(candidates, budgetMinutes) {
  const sorted = [...candidates].sort((a, b) => b.priority - a.priority);
  const picked = [];
  let total = 0;
  const skillCount = {};
  for (const c of sorted) {
    if (picked.length >= 5) break;
    if ((skillCount[c.skill] || 0) >= 2) continue;
    if (total + c.minutes > budgetMinutes + 3 && picked.length >= 3) continue;
    picked.push(c); total += c.minutes; skillCount[c.skill] = (skillCount[c.skill] || 0) + 1;
    if (total >= budgetMinutes - 3 && picked.length >= 3) break;
  }
  if (picked.length && !picked.some((c) => c.production)) {
    const prod = sorted.find((c) => c.production && !picked.includes(c));
    if (prod) {
      const lowest = picked.reduce((a, b) => (a.priority <= b.priority ? a : b));
      picked[picked.indexOf(lowest)] = prod;
    }
  }
  return picked;
}
