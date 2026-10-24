// Uoc luong nang luc kieu Rasch (EAP tren luoi) — Muc 12.3 dac ta v4.0.
// Ham thuan, chay duoc trong Web Worker va trong test.
export const GRID = [];
for (let i = 0; i <= 80; i++) GRID.push(-4 + i * 0.1);

export function bOf(item) {
  return typeof item.bCalibrated === "number" ? item.bCalibrated : (item.difficulty - 3) * 0.7;
}
export function cOf(item) {
  if (typeof item.c === "number") return item.c;
  if (item.questionType === "tfng" || item.questionType === "ynng") return 1 / 3;
  if (Array.isArray(item.options) && item.options.length) return 1 / item.options.length;
  return 0;
}
export function prob(theta, item) {
  const c = cOf(item);
  return c + (1 - c) / (1 + Math.exp(-(theta - bOf(item))));
}
function normalPdf(x, mean, sd) {
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}
/** responses: [{item, correct:0|1}]. prior: {mean, sd}. Tra {theta, se}. */
export function estimate(responses, prior = { mean: 0, sd: 1 }) {
  const post = GRID.map((t) => normalPdf(t, prior.mean, prior.sd));
  for (const r of responses) {
    for (let i = 0; i < GRID.length; i++) {
      const p = prob(GRID[i], r.item);
      post[i] *= r.correct ? p : 1 - p;
    }
  }
  const sum = post.reduce((a, b) => a + b, 0);
  let theta = 0, varSum = 0;
  for (let i = 0; i < GRID.length; i++) { const w = post[i] / sum; theta += GRID[i] * w; }
  for (let i = 0; i < GRID.length; i++) { const w = post[i] / sum; varSum += (GRID[i] - theta) ** 2 * w; }
  return { theta, se: Math.sqrt(varSum) };
}
/** Cau ke: chua dung, trong nhom con thieu, |b - theta| nho nhat. */
export function nextItem(bank, usedIds, groupNeeds, theta) {
  let best = null, bestDist = Infinity;
  for (const item of bank) {
    if (usedIds.has(item.id)) continue;
    if ((groupNeeds[item.group] || 0) <= 0) continue;
    const d = Math.abs(bOf(item) - theta);
    if (d < bestDist) { bestDist = d; best = item; }
  }
  return best;
}
export function tierOf(theta) {
  if (theta < -0.8) return "Foundation";
  if (theta < 0) return "Developing";
  if (theta < 0.8) return "Advancing";
  return "Advanced";
}
export const TIER_WEEKS = { Foundation: 16, Developing: 12, Advancing: 8, Advanced: 4 };
export const TIER_ORDER = ["Foundation", "Developing", "Advancing", "Advanced"];
/** Gan ranh gioi (|theta - ranh| < SE): bat dau o tang thap hon, ghi ro ca hai tang. */
export function tierWithBoundary(theta, se) {
  const bounds = [-0.8, 0, 0.8];
  for (const b of bounds) {
    if (Math.abs(theta - b) < se) {
      const upper = tierOf(b + 0.001), lower = tierOf(b - 0.001);
      return { tier: lower, nearBoundary: [lower, upper] };
    }
  }
  return { tier: tierOf(theta), nearBoundary: null };
}
/** Trang thai nhom: accuracy < 0,5 voi >= 6 cau thi Can va (Muc 12.4). */
export function groupStatus(items) {
  if (items.length < 6) return "Chưa đủ dữ liệu";
  const acc = items.filter((x) => x.correct).length / items.length;
  if (acc < 0.5) return "Cần vá";
  if (acc < 0.75) return "Trung bình";
  return "Vững";
}
