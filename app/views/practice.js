// /practice va /practice/session — Muc 19.1, 9.5: tron >= 3 dang, phan hoi ngay, ghi loi.
import { gradeTyped } from "../engine/normalize.js";
import { loadContent, repo, el, mainShell, primaryLink, speakLines, todayDay } from "../state.js";
import { addXp, markStudyDay } from "../gamify-ui.js";

let bank = null, sessionItems = [], idx = 0, correctCount = 0, hintShownAt = 0;

export async function renderPractice(root) {
  const main = mainShell(root, "Hôm nay luyện kiểu nào?");
  main.append(el("p", "Làm chậm cũng được. Hiểu là chính."));
  const modes = [
    ["mixed", "Trộn các dạng · 10 câu · khoảng 8 phút"],
    ["tfng", "Chỉ TRUE / FALSE / NOT GIVEN · 6 câu"],
    ["vocab", "Từ vựng và ngữ pháp · 6 câu"],
  ];
  for (const [mode, label] of modes) {
    const a = el("a", label, "card"); a.href = "practice/session?mode=" + mode; a.dataset.nav = "";
    main.append(a);
  }
  primaryLink(main, "today", "Về hôm nay");
}

function pickItems(mode) {
  const items = bank.items;
  if (mode === "tfng") return items.filter((i) => i.questionType === "tfng").slice(0, 6);
  if (mode === "vocab") return items.filter((i) => i.skill === "vocab").slice(0, 6);
  const byType = {};
  for (const i of items) (byType[i.questionType] = byType[i.questionType] || []).push(i);
  const types = Object.keys(byType);
  const out = [];
  let k = 0;
  while (out.length < 10 && types.length) {
    const t = types[k++ % types.length];
    const next = byType[t].shift();
    if (next) out.push(next);
  }
  return out;
}
function passageOf(item) { return bank.passages.find((p) => p.id === item.passageId); }
function clipOf(item) { return bank.clips.find((c) => c.id === item.audioId); }
function tagFor(item, chosen, typedTag) {
  if (item.questionType === "tfng") return "tfng." + String(item.correct).toLowerCase().replace(/ /g, "-") + "-as-" + String(chosen).toLowerCase().replace(/ /g, "-");
  if (item.questionType === "mcq") { const o = item.options.find((x) => x.id === chosen); return "mcq." + (o?.distractorType || "unknown"); }
  if (typedTag) return (item.skill === "listening" ? "listening." : "completion.") + typedTag;
  return "completion.wrong-word";
}
export async function renderPracticeSession(root) {
  bank = await loadContent("practice-bank.json");
  const mode = new URLSearchParams(location.search).get("mode") || "mixed";
  sessionItems = pickItems(mode);
  idx = 0; correctCount = 0;
  step(root);
}
function step(root) {
  if (idx >= sessionItems.length) return summary(root);
  const item = sessionItems[idx];
  const main = mainShell(root, null);
  const modeTag = el("p", "◐ Luyện tập · Câu " + (idx + 1) + " trên " + sessionItems.length, "tag-mode");
  modeTag.style.color = "var(--mode-practice)";
  main.append(modeTag);
  const p = passageOf(item);
  if (p) {
    const wrap = el("div");
    for (const par of p.paragraphs) { const pp = el("p", par.sentences.map((s) => s.text).join(" "), "reading"); pp.lang = "en"; wrap.append(pp); }
    main.append(wrap);
  }
  const clip = clipOf(item);
  if (clip) {
    const b = el("button", "Nghe đoạn");
    b.addEventListener("click", () => speakLines(clip.lines));
    main.append(b);
  }
  const stem = el("p", item.stem, "reading"); stem.lang = "en"; main.append(stem);
  const hint = el("button", "Gợi ý", "link-quiet");
  hint.style.display = "none";
  hint.addEventListener("click", () => {
    hint.replaceWith(el("p", item.questionType === "tfng" ? "Tìm câu trong bài nói về đúng ý của câu hỏi, rồi so từng yếu tố." : "Đọc lại câu hỏi và tìm cách diễn đạt khác trong bài."));
  });
  main.append(hint);
  setTimeout(() => { hint.style.display = ""; }, 20000);
  let answer = null, conf = null;
  const confRow = el("div");
  if (item.options) {
    const opts = item.options.map((o) => (typeof o === "string" ? { v: o, t: o } : { v: o.id, t: o.text }));
    for (const o of opts) {
      const b = el("button", o.t); b.lang = "en";
      b.addEventListener("click", () => { answer = o.v; });
      main.append(b);
    }
  } else if (item.blanks) {
    const input = el("input"); input.type = "text"; input.lang = "en"; input.autocomplete = "off";
    input.addEventListener("input", () => { answer = input.value; });
    main.append(input);
  }
  main.append(el("p", "Mức chắc chắn (không bắt buộc):"));
  for (const [lv, label] of [[1, "Đoán"], [2, "Khá chắc"], [3, "Chắc chắn"]]) {
    const b = el("button", label);
    b.addEventListener("click", () => { conf = lv; });
    confRow.append(b);
  }
  main.append(confRow);
  const submit = el("button", "Chốt đáp án", "cta-primary"); submit.dataset.cta = "primary";
  submit.addEventListener("click", async () => {
    if (answer == null || answer === "") return;
    let correct, typedTag = null;
    if (item.blanks) { const g = gradeTyped(answer, { acceptedAnswers: item.blanks["1"].acceptedAnswers, maxWords: item.blanks["1"].maxWords, nearMissAnswers: item.blanks["1"].nearMissAnswers || [] }); correct = g.result; typedTag = g.tag; }
    else correct = answer === item.correct;
    if (correct) correctCount++;
    const box = el("div", null, "card"); box.setAttribute("aria-live", "polite");
    box.append(el("p", correct ? "✓ Đúng" : "✗ Chưa đúng. Đáp án: " + (item.blanks ? item.blanks["1"].acceptedAnswers[0] : item.questionType === "mcq" ? item.options.find((o) => o.id === item.correct)?.text : item.correct)));
    if (item.explanation?.whyCorrect) box.append(el("p", item.explanation.whyCorrect));
    if (!correct && item.explanation?.whyWrong) box.append(el("p", item.explanation.whyWrong));
    main.append(box);
    if (!correct) {
      const r = await repo();
      await r.put("errors", { id: "e-" + Date.now() + "-" + item.id, questionId: item.id, tag: tagFor(item, answer, typedTag),
        chosen: String(answer), correct: String(item.blanks ? item.blanks["1"].acceptedAnswers[0] : item.correct), confidence: conf,
        seconds: null, mode: "practice", createdAt: new Date().toISOString(), state: "open", variantsPassed: 0, recurrent: false });
    }
    submit.remove();
    const nx = el("button", "Câu tiếp", "cta-primary"); nx.dataset.cta = "primary";
    nx.addEventListener("click", () => { idx++; step(root); });
    main.append(nx);
  });
  main.append(submit);
}
async function summary(root) {
  const main = mainShell(root, "Xong phiên luyện");
  main.append(el("p", "Đúng " + correctCount + " trên " + sessionItems.length + " câu.", "num"));
  await markStudyDay({ practiceAnswers: sessionItems.length });
  primaryLink(main, "today", "Về hôm nay");
}
