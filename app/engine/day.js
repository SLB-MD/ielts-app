// Ranh gioi ngay 04:00 gio dia phuong — Muc 22.4 va 18.2.
// Engine la ham thuan: nhan thoi diem lam tham so, khong doc dong ho he thong.
/** So ngay dia phuong (nguyen) cua mot moc ms UTC, ranh gioi 04:00. */
export function localDay(ms, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  let day = Math.floor(Date.UTC(get("year"), get("month") - 1, get("day")) / 86400000);
  if (get("hour") < 4) day -= 1; // truoc 04:00 tinh vao ngay hom truoc
  return day;
}
