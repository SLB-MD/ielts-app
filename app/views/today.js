// /today — Muc 19.2 + ke hoach Muc 15.
import { priority, smoothAcc, buildPlan } from "../engine/plan.js";
import { getProgress, getSetting, repo, todayDay, el, mainShell, primaryLink } from "../state.js";
import { streakInfo } from "../gamify-ui.js";

function greeting() {
  const h = new Date().getHours();
  if (h >= 4 && h < 12) return "buổi sáng";
  if (h >= 12 && h < 18) return "buổi chiều";
  return "buổi tối";
}
export async function renderToday(root) {
  const main = mainShell(root, null);
  const placement = await getProgress("placement");
  if (!placement) {
    main.append(el("h1", "Chào " + greeting() + "."));
    main.append(el("p", "Chưa có lộ trình. Làm 20 câu chẩn đoán, khoảng 13 phút, để mình biết bạn đang ở đâu."));
    primaryLink(main, "placement", "Làm chẩn đoán");
    const skip = el("a", "Để sau", "link-quiet"); skip.href = "learn/R-U01"; skip.dataset.nav = "";
    main.append(skip);
    return;
  }
  const r = await repo();
  const day = todayDay();
  const reviewCards = await r.getAllByIndex("cards", "state", "review");
  const due = reviewCards.filter((c) => c.dueDay <= day);
  const newCards = await r.getAllByIndex("cards", "state", "new");
  const openErrors = await r.getAllByIndex("errors", "state", "open");
  const budget = await getSetting("minutesPerDay", 25);

  const candidates = [];
  if (newCards.length) candidates.push({ id: "vocab-new", label: "Học từ mới · " + Math.min(8, newCards.length) + " thẻ", skill: "vocab",
    minutes: 6, href: "vocab", priority: priority({ accSmooth: 0.6, relevance: 0.7, minutes: 6 }) });
  candidates.push({ id: "lesson-r-u01", label: "Reading U01: FALSE và NOT GIVEN · 6 phút", skill: "reading",
    minutes: 6, href: "learn/R-U01", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.95, minutes: 6 }) });
  candidates.push({ id: "lesson-r-u02", label: "Reading U02: quan điểm tác giả và sự kiện · 6 phút", skill: "reading",
    minutes: 6, href: "learn/R-U02", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.95, minutes: 6 }) });
  candidates.push({ id: "lesson-r-u03", label: "Reading U03: câu hỏi chi tiết MCQ · 6 phút", skill: "reading",
    minutes: 6, href: "learn/R-U03", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.9, minutes: 6 }) });
  candidates.push({ id: "lesson-r-u04", label: "Reading U04: giấc ngủ và trí nhớ · 6 phút", skill: "reading",
    minutes: 6, href: "learn/R-U04", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.9, minutes: 6 }) });
  candidates.push({ id: "lesson-r-u05", label: "Reading U05: quan điểm về làm việc từ xa · 6 phút", skill: "reading",
    minutes: 6, href: "learn/R-U05", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.85, minutes: 6 }) });
  candidates.push({ id: "lesson-r-u06", label: "Reading U06: bản đồ và hàng hải · 6 phút", skill: "reading",
    minutes: 6, href: "learn/R-U06", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.85, minutes: 6 }) });
  candidates.push({ id: "lesson-l-u01", label: "Listening U01: nghe chi tiết triển lãm · 6 phút", skill: "listening",
    minutes: 6, href: "learn/L-U01", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.9, minutes: 6 }) });
  candidates.push({ id: "lesson-r-u07", label: "Reading U07: vi nhựa trong đại dương · 6 phút", skill: "reading",
    minutes: 6, href: "learn/R-U07", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.85, minutes: 6 }) });
  candidates.push({ id: "lesson-r-u08", label: "Reading U08: năng lượng gió ngoài khơi · 6 phút", skill: "reading",
    minutes: 6, href: "learn/R-U08", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.8, minutes: 6 }) });
  candidates.push({ id: "lesson-r-u09", label: "Reading U09: học trực tuyến, ai nói gì · 7 phút", skill: "reading",
    minutes: 7, href: "learn/R-U09", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.85, minutes: 7 }) });
  candidates.push({ id: "lesson-r-u10", label: "Reading U10: thám hiểm hang động · 6 phút", skill: "reading",
    minutes: 6, href: "learn/R-U10", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.8, minutes: 6 }) });
  candidates.push({ id: "lesson-r-u11", label: "Reading U11: lịch sử nhiếp ảnh · 6 phút", skill: "reading",
    minutes: 6, href: "learn/R-U11", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.8, minutes: 6 }) });
  candidates.push({ id: "lesson-r-u12", label: "Reading U12: bảo tàng số và di sản · 6 phút", skill: "reading",
    minutes: 6, href: "learn/R-U12", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.85, minutes: 6 }) });
  candidates.push({ id: "lesson-r-u13", label: "Reading U13: tiêm chủng và sức khỏe cộng đồng · 6 phút", skill: "reading",
    minutes: 6, href: "learn/R-U13", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.95, minutes: 6 }) });
  candidates.push({ id: "lesson-r-u14", label: "Reading U14: chuỗi cung ứng và kho vận · 6 phút", skill: "reading",
    minutes: 6, href: "learn/R-U14", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.95, minutes: 6 }) });
  candidates.push({ id: "lesson-l-u02", label: "Listening U02: nghe số liệu khóa học · 6 phút", skill: "listening",
    minutes: 6, href: "learn/L-U02", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.85, minutes: 6 }) });
  candidates.push({ id: "lesson-l-u03", label: "Listening U03: nghe hướng dẫn phòng thí nghiệm · 6 phút", skill: "listening",
    minutes: 6, href: "learn/L-U03", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.85, minutes: 6 }) });
  candidates.push({ id: "lesson-l-u04", label: "Listening U04: nghe ý kiến trong thảo luận · 6 phút", skill: "listening",
    minutes: 6, href: "learn/L-U04", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.8, minutes: 6 }) });
  candidates.push({ id: "lesson-l-u05", label: "Listening U05: nghe sự kiện và thời gian · 6 phút", skill: "listening",
    minutes: 6, href: "learn/L-U05", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.8, minutes: 6 }) });
  candidates.push({ id: "lesson-l-u06", label: "Listening U06: nghe đặt tour qua điện thoại · 6 phút", skill: "listening",
    minutes: 6, href: "learn/L-U06", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.8, minutes: 6 }) });
  candidates.push({ id: "lesson-l-u07", label: "Listening U07: nghe bài giảng về động vật · 6 phút", skill: "listening",
    minutes: 6, href: "learn/L-U07", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.8, minutes: 6 }) });
  candidates.push({ id: "lesson-l-u08", label: "Listening U08: nghe phỏng vấn vận động viên · 6 phút", skill: "listening",
    minutes: 6, href: "learn/L-U08", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.8, minutes: 6 }) });
  candidates.push({ id: "lesson-l-u13", label: "Listening U13: đặt lịch phòng khám · 6 phút", skill: "listening",
    minutes: 6, href: "learn/L-U13", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.9, minutes: 6 }) });
  candidates.push({ id: "lesson-l-u14", label: "Listening U14: điều phối giao hàng kho vận · 6 phút", skill: "listening",
    minutes: 6, href: "learn/L-U14", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.9, minutes: 6 }) });
  candidates.push({ id: "lesson-l-u11", label: "Listening U11: nghe nghiên cứu về giấc ngủ · 6 phút", skill: "listening",
    minutes: 6, href: "learn/L-U11", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.85, minutes: 6 }) });
  candidates.push({ id: "lesson-l-u12", label: "Listening U12: ôn tập tổng hợp qua hội thoại · 6 phút", skill: "listening",
    minutes: 6, href: "learn/L-U12", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.85, minutes: 6 }) });
  candidates.push({ id: "lesson-l-u09", label: "Listening U09: nghe quy trình làm gốm · 6 phút", skill: "listening",
    minutes: 6, href: "learn/L-U09", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.8, minutes: 6 }) });
  candidates.push({ id: "lesson-l-u10", label: "Listening U10: nghe tư vấn khóa học buổi tối · 6 phút", skill: "listening",
    minutes: 6, href: "learn/L-U10", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.8, minutes: 6 }) });
  candidates.push({ id: "lesson-g-u01", label: "Ngữ pháp U01: hiện tại hoàn thành và quá khứ đơn · 6 phút", skill: "grammar",
    minutes: 6, href: "learn/G-U01", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.85, minutes: 6 }) });
  candidates.push({ id: "lesson-g-u02", label: "Ngữ pháp U02: câu điều kiện loại 1 và 2 · 6 phút", skill: "grammar",
    minutes: 6, href: "learn/G-U02", production: true,
    priority: priority({ accSmooth: 0.6, relevance: 0.8, minutes: 6 }) });
  if (openErrors.length >= 2) candidates.push({ id: "repair", label: "Vá lỗi · 6 phút", skill: "reading",
    minutes: 6, href: "errors", priority: priority({ accSmooth: smoothAcc(0, openErrors.length), overdueDays: 3, relevance: 0.95, minutes: 6 }) });

  const plan = buildPlan(candidates, Math.max(6, budget - Math.min(10, Math.ceil(due.length * 20 / 60))));
  const tasks = [];
  if (due.length) tasks.push({ label: "Ôn " + due.length + " thẻ đến hạn · " + Math.max(2, Math.ceil(due.length * 20 / 60)) + " phút", href: "vocab", minutes: Math.ceil(due.length * 20 / 60) });
  for (const t of plan) tasks.push({ label: t.label, href: t.href, minutes: t.minutes });
  const shown = tasks.slice(0, 5);
  const totalMin = shown.reduce((a, t) => a + t.minutes, 0);

  main.append(el("h1", "Chào " + greeting() + "."));
  const streak = await streakInfo();
  const gamify = await getProgress("gamify");
  main.append(el("p", shown.length + " việc · " + totalMin + " phút · mức " + placement.tier + " · chuỗi " + streak.streak + " ngày · " + (gamify?.xp || 0) + " XP", "num"));
  if (streak.freezeUsed) main.append(el("p", "Hôm qua bạn nghỉ. Chuỗi được giữ bằng 1 lần bảo lưu của tháng này."));
  const list = el("ol", null, "task-list");
  shown.forEach((t, i) => { const li = el("li", (i + 1) + "  " + t.label); list.append(li); });
  main.append(list);
  const first = shown[0];
  if (first) primaryLink(main, first.href, "Bắt đầu buổi học");
  const nav = el("p");
  for (const [href, label] of [["practice", "Luyện tập"], ["test", "Thi thử"], ["vocab", "Từ vựng"], ["write", "Writing"], ["speak", "Speaking"], ["talk", "Trò chuyện"], ["progress", "Tiến độ"], ["errors", "Sổ lỗi"], ["settings", "Cài đặt"], ["method", "Phương pháp"]]) {
    const a = el("a", label, "link-quiet"); a.href = href; a.dataset.nav = ""; nav.append(a, document.createTextNode(" · "));
  }
  main.append(nav);
}
