// Tich hop XP, streak vao UI — Muc 18. Du lieu luu o progress store.
import { award, qualifiesDay, computeStreak } from "./engine/gamify.js";
import { getProgress, setProgress, todayDay } from "./state.js";

export async function addXp(kind, amount) {
  const g = (await getProgress("gamify")) || { xp: 0, xpByDay: {} };
  const { state, awarded } = award(g, kind, todayDay(), amount);
  await setProgress("gamify", state);
  return awarded;
}
export async function markStudyDay(partial) {
  const day = todayDay();
  const days = (await getProgress("studyDays")) || [];
  const flags = (await getProgress("dayFlags")) || {};
  const f = { ...(flags[day] || {}), ...partial };
  flags[day] = f;
  await setProgress("dayFlags", flags);
  if (qualifiesDay(f) && !days.includes(day)) {
    days.push(day);
    await setProgress("studyDays", days);
  }
  return days;
}
export async function streakInfo() {
  const days = (await getProgress("studyDays")) || [];
  const freezes = (await getProgress("freezes")) || {};
  const monthKey = new Date().toISOString().slice(0, 7);
  return computeStreak(days, todayDay(), freezes, monthKey);
}
export async function dailyFlag(key) {
  const flags = (await getProgress("dayFlags")) || {};
  return !!flags[todayDay()]?.[key];
}
export async function setDailyFlag(key) {
  const flags = (await getProgress("dayFlags")) || {};
  const day = todayDay();
  flags[day] = { ...(flags[day] || {}), [key]: true };
  await setProgress("dayFlags", flags);
}
