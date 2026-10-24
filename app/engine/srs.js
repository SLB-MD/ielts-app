// SM-2 bien the — Muc 13 dac ta v4.0. E luu dang so nguyen phan nghin.
// Khoang moi dung E truoc khi cap nhat; lam tron nua len: floor(x + 0,5).
export const E_MIN = 1300, E_MAX = 3000;
const roundHalfUp = (x) => Math.floor(x + 0.5);
export function clampE(e) { return Math.min(E_MAX, Math.max(E_MIN, e)); }

function seededFuzz(cardId, n, interval) {
  if (interval < 7) return interval;
  let h = 0; const s = String(cardId) + ":" + n;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const frac = (h % 1000) / 1000; // 0..0,999, tai lap duoc
  const factor = 0.95 + frac * 0.1; // ±5%
  return Math.max(1, roundHalfUp(interval * factor));
}

/** On mot the o trang thai review. opts: {overdueDays, fuzz} */
export function gradeReview(card, rating, opts = {}) {
  const { overdueDays = 0, fuzz = true } = opts;
  const E = card.E;
  if (rating === "again") {
    return { ...card, E: clampE(E - 200), n: 0, lapses: card.lapses + 1, state: "relearning", I: 0 };
  }
  let I = card.I;
  if ((rating === "good" || rating === "easy") && overdueDays > 0) {
    I = I + Math.floor(Math.min(overdueDays, I) / 2); // the tre, Muc 13.4
  }
  let newI;
  if (card.n === 1) newI = rating === "hard" ? 2 : rating === "good" ? 6 : 10;
  else if (rating === "hard") newI = Math.max(I + 1, roundHalfUp(I * 1.2));
  else if (rating === "good") newI = roundHalfUp(I * (E / 1000));
  else newI = roundHalfUp(I * (E / 1000) * 1.3);
  const dE = rating === "hard" ? -150 : rating === "easy" ? 150 : 0;
  const out = { ...card, E: clampE(E + dE), n: card.n + 1, state: "review" };
  out.I = fuzz ? seededFuzz(card.id, out.n, newI) : newI;
  return out;
}
/** Tot nghiep tu learning/relearning sau khi hoc lai dung (Muc 13.1). */
export function graduate(card, lastRating) {
  return { ...card, state: "review", n: 1, I: lastRating === "easy" ? 4 : 1 };
}
/** Leech: lapses >= 6 thi tam an 7 ngay (Muc 13.7). */
export function isLeech(card) { return card.lapses >= 6; }
