// Gamification co ky luat — Muc 18 dac ta v4.0. Tran mem 150 XP/ngay.
export const DAILY_XP_CAP = 150;
export const XP_RULES = { lesson: 20, retrieveCorrect: 2, srsOnTime: 1, errorClosed: 15, miniTest: 30, fullTest: 80, writingDaily: 10, speakingDaily: 10, talkDaily: 10 };
export function award(state, kind, day, amount) {
  const a = amount ?? XP_RULES[kind] ?? 0;
  const todayXp = state.xpByDay[day] || 0;
  const real = Math.max(0, Math.min(a, DAILY_XP_CAP - todayXp));
  return { state: { ...state, xp: state.xp + real, xpByDay: { ...state.xpByDay, [day]: todayXp + real } }, awarded: real };
}
/** Ngay hoc hop le (18.2): xong 1 bai hoc, hoac Practice >= 10 cau, hoac on >= 80% the den han (it nhat 5 the). */
export function qualifiesDay({ lessonsDone = 0, practiceAnswers = 0, dueCards = 0, reviewedCards = 0 }) {
  if (lessonsDone >= 1) return true;
  if (practiceAnswers >= 10) return true;
  if (dueCards >= 5 && reviewedCards / dueCards >= 0.8) return true;
  return false;
}
/** Chuoi ngay: ranh gioi 04:00 da nam trong localDay. Bao luu 1 lan/thang khi bo dung 1 ngay. */
export function computeStreak(studyDays, today, freezesUsedByMonth, monthKey) {
  const set = new Set(studyDays);
  let streak = 0, d = today, freezeUsed = false;
  if (!set.has(d)) d = d - 1; // hom nay chua hoc: chuoi tinh den hom qua
  let guard = 0;
  while (guard++ < 400) {
    if (set.has(d)) { streak++; d--; continue; }
    if (set.has(d - 1) && !freezeUsed && (freezesUsedByMonth[monthKey] || 0) < 1 && streak > 0) {
      freezeUsed = true; streak++; d -= 1; continue; // ngay bo qua duoc bao luu giu; lui ve ngay truoc no de dem tiep
    }
    break;
  }
  return { streak, freezeUsed };
}
export const BADGES = [
  { id: "repairer", name: "Người vá lỗi", test: (s) => (s.closedTags || 0) >= 10 },
  { id: "on-time", name: "Đúng hạn", test: (s) => (s.onTimeStreak || 0) >= 7 },
  { id: "solid-words", name: "Từ đã vững", test: (s) => (s.solidCards || 0) >= 100 },
  { id: "full-test", name: "Một đề trọn vẹn", test: (s) => (s.fullTests || 0) >= 1 },
  { id: "interleaver", name: "Người xen kẽ", test: (s) => (s.mixedSessions || 0) >= 10 },
];
export function earnedBadges(stats, calibrationOk) {
  const out = BADGES.filter((b) => b.test(stats)).map((b) => b.id);
  if (calibrationOk) out.push("calibrated");
  return out;
}
