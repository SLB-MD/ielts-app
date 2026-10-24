// /progress — Muc 19.5: moi khoi tra loi mot cau hoi. Chua du lieu thi noi chua du.
import { calibration } from "../engine/calibration.js";
import { CONFIDENCE } from "../engine/calibration.js";
import { getProgress, repo, todayDay, el, mainShell, primaryLink } from "../state.js";

export async function renderProgress(root) {
  const main = mainShell(root, "Mình tiến bộ thật không?");
  const placement = await getProgress("placement");
  const block = (title) => { const s = el("section", null, "card"); s.append(el("h2", title)); main.append(s); return s; };

  const s1 = block("Đều đặn");
  const r = await repo();
  const lessons = await r.getAllByIndex("lessons", "skill", "reading");
  s1.append(el("p", "Số bài học đã xong: " + lessons.length, "num"));
  if (placement) s1.append(el("p", "Mức chẩn đoán gần nhất: " + placement.tier + " (ngày " + String(placement.at).slice(0, 10) + ")"));

  const s2 = block("Hiệu chỉnh");
  const entries = [];
  for (const l of lessons) for (const x of l.retrieve || []) {
    const c = CONFIDENCE.find((k) => k.level === x.conf);
    if (c) entries.push({ p: c.p, correct: x.correct ? 1 : 0 });
  }
  const cal = calibration(entries);
  if (cal.status === "insufficient") s2.append(el("p", "Cần thêm dữ liệu. Còn " + cal.need + " câu."));
  else s2.append(el("p", "Bạn tự tin " + Math.round(cal.claimed) + "%, đúng " + Math.round(cal.actual) + "%. Lệch " + (cal.gap > 0 ? "+" : "") + Math.round(cal.gap) + " điểm: " + cal.label.replace("Bạn đang ", "bạn đang ")));

  const s3 = block("Giữ chữ");
  const reviews = await r.getAllByIndex("reviews", "reviewedAt", null).catch(() => []);
  s3.append(el("p", "Số lượt ôn đã ghi: " + reviews.length, "num"));
  if (reviews.length < 50) s3.append(el("p", "Chưa đủ dữ liệu để tính tỉ lệ nhớ thật sau 14 ngày."));

  const s4 = block("Lịch ôn");
  const day = todayDay();
  const cards = await r.getAllByIndex("cards", "state", "review");
  const counts = Array.from({ length: 7 }, (_, i) => cards.filter((c) => c.dueDay === day + i).length);
  s4.append(el("p", "7 ngày tới, số thẻ đến hạn mỗi ngày: " + counts.join(", "), "num"));

  primaryLink(main, "today", "Về hôm nay");
}
