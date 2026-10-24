// Loi: phan loai, trong so, hang doi va, dong loi — Muc 14 dac ta v4.0.
export function weightOf(error) { return error.confidence === 3 ? 1.5 : 1; } // conf.high-wrong
/** Mot nhan vao hang doi va khi: tong trong so 7 ngay >= 2 HOAC 14 ngay >= 3 (14.4). */
export function repairEligible(errors, nowMs) {
  const open = errors.filter((e) => e.state !== "closed");
  let w7 = 0, w14 = 0;
  for (const e of open) {
    const age = (nowMs - Date.parse(e.createdAt)) / 86400000;
    if (age <= 7) w7 += weightOf(e);
    if (age <= 14) w14 += weightOf(e);
  }
  return w7 >= 2 || w14 >= 3;
}
/** Diem Notebook: tong w * exp(-tuoi_ngay/14) — Muc 14.7. */
export function tagScore(errors, nowMs) {
  let s = 0;
  for (const e of errors) {
    const age = Math.max(0, (nowMs - Date.parse(e.createdAt)) / 86400000);
    s += weightOf(e) * Math.exp(-age / 14);
  }
  return s;
}
/** Dong loi (14.6): pending sau bai va; kiem 1 sau >= 3 ngay (2 cau bien the);
    kiem 2 sau >= 7 ngay ke tu kiem 1 (2 cau khac). Dong khi tong >= 3/4 dung
    va khong co conf.high-wrong trong hai phien kiem. Khong dat -> mo lai (open). */
export function afterRepair(error) { return { ...error, state: "pending" }; }
export function afterCheck(error, checkIndex, passedCount, hadHighWrong, variantsPassedTotal) {
  const e = { ...error, variantsPassed: variantsPassedTotal };
  if (checkIndex === 1) return { ...e, state: "verifying" };
  const totalOk = variantsPassedTotal >= 3 && !hadHighWrong;
  return totalOk ? { ...e, state: "closed", closedAt: new Date().toISOString() } : { ...e, state: "open" };
}
export function dueChecks(error, nowMs) {
  // Tra danh sach kiem den han: [1] sau repair +3 ngay, [2] sau check1 +7 ngay.
  const out = [];
  if (error.state === "pending" && error.repairedAt && nowMs - Date.parse(error.repairedAt) >= 3 * 86400000) out.push(1);
  if (error.state === "verifying" && error.check1At && nowMs - Date.parse(error.check1At) >= 7 * 86400000) out.push(2);
  return out;
}
