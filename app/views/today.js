// /today — Muc 19.2 + ke hoach Muc 15.
// Man hinh chinh: khoi trinh do (tu du lieu placement da luu) -> de thi that ->
// bai hoc chuan thi (unit moi noi bat, ke hoach cu bang buildPlan/priority) ->
// nhom bai nen tang R-U01..R-U06 (len dau voi tang thap, xuong cuoi voi tang cao).
import { priority, smoothAcc, buildPlan } from "../engine/plan.js";
import { bandInterval, formatInterval } from "../engine/band.js";
import { getProgress, getSetting, repo, todayDay, loadContent, el, mainShell, primaryLink } from "../state.js";
import { streakInfo } from "../gamify-ui.js";

// Khoang band tham chieu cua tung tang, theo bang phan loai muc do cua du an
// (docs/CONTENT_SOURCES_2.md Muc 5.2, neo doi chieu IELTS-CEFR chinh thuc).
// Day la khoang cua muc, khong phai diem do cua nguoi hoc.
const TIER_BAND_REF = { Foundation: "4,0–4,5", Developing: "4,5–5,5", Advancing: "5,5–7,0", Advanced: "7,0–8,0" };
const GROUP_NAMES = { reading: "Reading", listening: "Listening", vocab: "Từ vựng và ngữ pháp" };

// De day du: ban 3 chi hien khi tep noi dung da co (kiem bang loadContent thu).
const EXAM_CARDS = [
  { id: "FT-R03", file: "full-test-r03.json", probe: true, title: "Đề Reading đầy đủ 3 · Y tế, logistics, khoa học", meta: "40 câu · khoảng 60 phút · Mức 3–5" },
  { id: "FT-L03", file: "full-test-l03.json", probe: true, title: "Đề Listening đầy đủ 3 · Phòng khám, kho vận, học thuật", meta: "40 câu · khoảng 40 phút · Mức 2–4" },
  { id: "FT-R01", title: "Đề Reading đầy đủ 1", meta: "40 câu · khoảng 60 phút" },
  { id: "FT-L01", title: "Đề Listening đầy đủ 1", meta: "40 câu · khoảng 40 phút" },
  { id: "FT-R02", title: "Đề Reading đầy đủ 2", meta: "40 câu · khoảng 60 phút" },
  { id: "FT-L02", title: "Đề Listening đầy đủ 2", meta: "40 câu · khoảng 40 phút" },
];
// Id de ma trang Thi thu cong nhan (sao dung luat mo full test cua renderTestHome).
const KNOWN_TEST_IDS = ["MT-01", "MT-02", "MT-03", "MT-04", "MT-05", "MT-06", "FT-R01", "FT-L01", "FT-R02", "FT-L02"];

// Unit chuan thi moi: chi hien khi tep unit da co trong content/.
const FEATURED_UNITS = [
  { id: "R-U15", file: "unit-r-u15.json", title: "Reading U15: thiết kế bệnh viện và quá trình hồi phục", meta: "Mức 3–4 · Y tế" },
  { id: "R-U16", file: "unit-r-u16.json", title: "Reading U16: chuỗi lạnh trong vận chuyển thuốc và thực phẩm", meta: "Mức 3–4 · Logistics" },
  { id: "L-U15", file: "unit-l-u15.json", title: "Listening U15: thảo luận nghiên cứu về sức khỏe", meta: "Mức 3–4 · Y tế" },
  { id: "L-U16", file: "unit-l-u16.json", title: "Listening U16: bài giảng về tự động hoá kho vận", meta: "Mức 4 · Logistics" },
];
// Nhom nen tang: tach khoi danh sach ung vien ke hoach, hien thanh nhom rieng.
const FOUNDATION_UNITS = [
  { id: "R-U01", label: "Reading U01: FALSE và NOT GIVEN" },
  { id: "R-U02", label: "Reading U02: quan điểm tác giả và sự kiện" },
  { id: "R-U03", label: "Reading U03: câu hỏi chi tiết MCQ" },
  { id: "R-U04", label: "Reading U04: giấc ngủ và trí nhớ" },
  { id: "R-U05", label: "Reading U05: quan điểm về làm việc từ xa" },
  { id: "R-U06", label: "Reading U06: bản đồ và hàng hải" },
];

async function tryContent(name) {
  try { return await loadContent(name); } catch { return null; }
}

function linkedRow(href, title, meta) {
  const a = el("a", null, "card exam-card");
  a.href = href; a.dataset.nav = "";
  a.append(el("span", title, "exam-title"));
  if (meta) a.append(el("span", meta, "item-meta"));
  return a;
}

function foundationGroup() {
  const wrap = el("section");
  wrap.append(el("h2", "Bài nền tảng", "section-title"));
  wrap.append(el("p", "Sáu bài khởi động mức thấp trong thang độ khó 1–5, cho người mới bắt đầu hoặc cần ôn lại từ gốc.", "item-meta"));
  const list = el("ol", null, "task-list");
  for (const u of FOUNDATION_UNITS) {
    const li = el("li");
    const a = el("a", u.label); a.href = "learn/" + u.id; a.dataset.nav = "";
    li.append(a, el("span", "Nền tảng · Reading", "item-meta"));
    list.append(li);
  }
  wrap.append(list);
  return wrap;
}

export async function renderToday(root) {
  const main = mainShell(root, null);
  const placement = await getProgress("placement");
  if (!placement) {
    main.append(el("h1", "Luyện IELTS theo đúng trình độ của bạn"));
    main.append(el("p", "Làm 20 câu chẩn đoán (khoảng 13 phút) để app đo trình độ hiện tại, xếp bạn vào một mức trong thang độ khó 1–5, rồi chọn bài học và đề thi đầy đủ đúng định dạng IELTS theo đúng mức đó."));
    primaryLink(main, "placement", "Làm chẩn đoán trình độ");
    const skip = el("a", "Vào thẳng bài học", "link-quiet"); skip.href = "learn/R-U01"; skip.dataset.nav = "";
    main.append(skip);
    return;
  }
  const r = await repo();
  const day = todayDay();
  const reviewCards = await r.getAllByIndex("cards", "state", "review");
  const due = reviewCards.filter((c) => c.dueDay <= day);
  const newCards = await r.getAllByIndex("cards", "state", "new");
  const openErrors = await r.getAllByIndex("errors", "state", "open");
  const attempts = await r.getAllByIndex("attempts", "mode", "test");
  const budget = await getSetting("minutesPerDay", 25);

  // --- Khoi trinh do: chi dung du lieu placement da luu va engine band. ---
  const tier = placement.tier;
  const lowTier = tier === "Foundation" || tier === "Developing";
  const level = el("section", null, "card level-block");
  level.append(el("p", "Mức hiện tại: " + tier, "level-tier"));
  if (TIER_BAND_REF[tier]) {
    level.append(el("p", "Khoảng band tham chiếu của mức này: " + TIER_BAND_REF[tier] + " (ước tính theo bảng đối chiếu IELTS–CEFR của app; đây là khoảng của mức, không phải điểm thi của bạn).", "item-meta"));
  }
  if (placement.nearBoundary) {
    level.append(el("p", "Kết quả chẩn đoán gần ranh giới " + placement.nearBoundary[0] + " và " + placement.nearBoundary[1] + ". App xếp bạn ở mức thấp hơn để chắc chắn.", "item-meta"));
  }
  if (placement.groups) {
    const parts = Object.keys(GROUP_NAMES).filter((g) => placement.groups[g]).map((g) => GROUP_NAMES[g] + ": " + placement.groups[g]);
    if (parts.length) level.append(el("p", parts.join(" · "), "item-meta"));
  }
  const fullAttempts = attempts
    .filter((a) => a.total === 40 && (a.skill === "reading" || a.skill === "listening"))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const lastFull = fullAttempts.find((a) => bandInterval(a.skill, a.correct, false) !== null);
  if (lastFull) {
    level.append(el("p", "Đề đầy đủ gần nhất: " + lastFull.testId + " · đúng " + lastFull.correct + "/40 · band ước tính " + formatInterval(bandInterval(lastFull.skill, lastFull.correct, false)) + " (khoảng ước tính, cộng trừ 0,5).", "item-meta"));
  }
  const streak = await streakInfo();
  const gamify = await getProgress("gamify");
  level.append(el("p", "Chuỗi " + streak.streak + " ngày · " + (gamify?.xp || 0) + " XP" + (placement.weeks ? " · lộ trình gợi ý " + placement.weeks + " tuần" : ""), "num"));
  if (streak.freezeUsed) level.append(el("p", "Hôm qua bạn nghỉ. Chuỗi được giữ bằng 1 lần bảo lưu của tháng này."));
  const diag = el("a", "Xem lại kết quả chẩn đoán", "link-quiet"); diag.href = "placement/result"; diag.dataset.nav = "";
  level.append(diag);
  main.append(level);

  // --- Muc A: de thi that (full test), ban moi nhat len dau. ---
  const examSection = el("section");
  examSection.append(el("h2", "Đề thi thật", "section-title"));
  examSection.append(el("p", "Đề đầy đủ đúng định dạng thi: Reading 3 bài 40 câu, Listening 4 phần 40 câu, có đồng hồ và không gợi ý.", "item-meta"));
  const knownAttempts = attempts.filter((a) => KNOWN_TEST_IDS.includes(a.testId)).length;
  const examsUnlocked = knownAttempts >= 3;
  for (const card of EXAM_CARDS) {
    if (card.probe && !(await tryContent(card.file))) continue;
    if (examsUnlocked) {
      examSection.append(linkedRow("test/" + card.id, card.title, card.meta));
    } else {
      const row = el("div", null, "card exam-card");
      row.append(el("span", card.title, "exam-title"), el("span", card.meta, "item-meta"));
      examSection.append(row);
    }
  }
  if (!examsUnlocked) {
    examSection.append(el("p", "Đề đầy đủ mở sau 3 lượt làm bài kiểm tra (đã có " + knownAttempts + "). Trong lúc chờ, làm mini test ở trang Thi thử.", "item-meta"));
    const toTest = el("a", "Tới trang thi thử", "link-quiet"); toTest.href = "test"; toTest.dataset.nav = "";
    examSection.append(toTest);
  }
  main.append(examSection);

  // --- Muc B: bai hoc chuan thi — unit moi noi bat, roi ke hoach cu. ---
  const lessonSection = el("section");
  lessonSection.append(el("h2", "Bài học chuẩn thi", "section-title"));
  let featuredShown = 0;
  for (const u of FEATURED_UNITS) {
    if (!(await tryContent(u.file))) continue;
    lessonSection.append(linkedRow("learn/" + u.id, u.title, u.meta));
    featuredShown++;
  }
  if (!featuredShown) lessonSection.append(el("p", "Các bài dài đúng chuẩn đề thi đang được bổ sung theo lĩnh vực, ưu tiên y tế và logistics.", "item-meta"));
  main.append(lessonSection);
  if (lowTier) main.append(foundationGroup());

  // Ung vien ke hoach: giu nguyen nhu truoc, tru nhom nen tang da tach rieng.
  const candidates = [];
  if (newCards.length) candidates.push({ id: "vocab-new", label: "Học từ mới · " + Math.min(8, newCards.length) + " thẻ", skill: "vocab",
    minutes: 6, href: "vocab", priority: priority({ accSmooth: 0.6, relevance: 0.7, minutes: 6 }) });
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

  // Muc C: ke hoach hom nay (on tu den han, hoc tu moi, va loi — co che cu).
  const planSection = el("section");
  planSection.append(el("h2", "Kế hoạch hôm nay", "section-title"));
  planSection.append(el("p", shown.length + " việc · " + totalMin + " phút, chọn theo độ ưu tiên và ngân sách thời gian bạn đặt.", "item-meta"));
  const list = el("ol", null, "task-list");
  shown.forEach((t, i) => { const li = el("li", (i + 1) + "  " + t.label); list.append(li); });
  planSection.append(list);
  main.append(planSection);
  const first = shown[0];
  if (first) primaryLink(main, first.href, "Bắt đầu buổi học");
  if (!lowTier) main.append(foundationGroup());
  const nav = el("p");
  for (const [href, label] of [["practice", "Luyện tập"], ["test", "Thi thử"], ["vocab", "Từ vựng"], ["write", "Writing"], ["speak", "Speaking"], ["talk", "Trò chuyện"], ["progress", "Tiến độ"], ["errors", "Sổ lỗi"], ["settings", "Cài đặt"], ["method", "Phương pháp"]]) {
    const a = el("a", label, "link-quiet"); a.href = href; a.dataset.nav = ""; nav.append(a, document.createTextNode(" · "));
  }
  main.append(nav);
}
