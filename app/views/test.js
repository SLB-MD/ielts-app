// /test, /test/:id, /test/:id/result — Muc 19.1, 19.3. Dieu kien thi that: khong goi y, an phan hoi.
import { gradeTyped } from "../engine/normalize.js";
import { bandInterval, formatInterval } from "../engine/band.js";
import { loadContent, repo, el, mainShell, primaryLink, speakLines } from "../state.js";
import { addXp, markStudyDay } from "../gamify-ui.js";

let test = null, answers = {}, startedAt = 0, timerInt = null, paused = false, pauseUsed = false, timeLeft = 0;

const TEST_FILES = { "MT-01": "mini-test-01.json", "MT-02": "mini-test-02.json", "MT-03": "mini-test-03.json", "MT-04": "mini-test-04.json", "MT-05": "mini-test-05.json", "MT-06": "mini-test-06.json", "FT-R01": "full-test-r01.json", "FT-L01": "full-test-l01.json", "FT-R02": "full-test-r02.json", "FT-L02": "full-test-l02.json" };
const TEST_TITLES = { "MT-01": "Mini test 1", "MT-02": "Mini test 2", "MT-03": "Mini test 3", "MT-04": "Mini test 4", "MT-05": "Mini test 5", "MT-06": "Mini test 6" };
const FULL_TESTS = [
  { id: "FT-R01", label: "Full Reading test 1 · 40 câu · khoảng 60 phút" },
  { id: "FT-L01", label: "Full Listening test 1 · 40 câu · khoảng 40 phút" },
  { id: "FT-R02", label: "Full Reading test 2 · 40 câu · khoảng 60 phút" },
  { id: "FT-L02", label: "Full Listening test 2 · 40 câu · khoảng 40 phút" },
];

export async function renderTestHome(root) {
  const main = mainShell(root, "Làm đề nào?");
  main.append(el("p", "Đây là điều kiện thi thật. Không có gợi ý. Đồng hồ sẽ chạy."));
  const r = await repo();
  const attempts = await r.getAllByIndex("attempts", "mode", "test");
  const minis = attempts.filter((a) => TEST_FILES[a.testId]).length;
  for (const id of Object.keys(TEST_FILES)) {
    const done = attempts.filter((a) => a.testId === id).length;
    const card = el("a", TEST_TITLES[id] + " · 10 câu · khoảng 9 phút" + (done ? " · đã làm " + done + " lần" : ""), "card");
    card.href = "test/" + id; card.dataset.nav = "";
    main.append(card);
  }
  main.append(el("p", "Full test mở sau 3 mini test. Đã xong " + minis + " mini test.", "num"));
  if (minis >= 3) {
    for (const f of FULL_TESTS) {
      const card = el("a", f.label, "card");
      card.href = "test/" + f.id; card.dataset.nav = "";
      main.append(card);
    }
  } else {
    const full = el("p", "Full test (40 câu mỗi kỹ năng): chưa mở.", "link-quiet");
    main.append(full);
  }
  primaryLink(main, "today", "Về hôm nay");
}
export async function renderTest(root, params) {
  test = await loadContent(TEST_FILES[params && params.id] || "mini-test-01.json");
  answers = {}; startedAt = Date.now(); timeLeft = test.minutes * 60; paused = false; pauseUsed = false;
  const main = mainShell(root, null);
  const tag = el("p", "◼ Thi thử · " + test.title, "tag-mode"); tag.style.color = "var(--mode-test)"; main.append(tag);
  const clock = el("p", "", "num"); clock.setAttribute("role", "timer"); clock.setAttribute("aria-live", "off"); main.append(clock);
  const tick = () => {
    if (!paused) timeLeft--;
    const m = Math.floor(Math.max(0, timeLeft) / 60), s = Math.max(0, timeLeft) % 60;
    clock.textContent = "Còn " + m + ":" + String(s).padStart(2, "0");
    if (timeLeft <= 0) { clearInterval(timerInt); submit(root); }
  };
  timerInt = setInterval(tick, 1000); tick();
  for (const p of test.passages) {
    const wrap = el("div");
    for (const par of p.paragraphs) { const pp = el("p", par.sentences.map((x) => x.text).join(" "), "reading"); pp.lang = "en"; wrap.append(pp); }
    main.append(wrap);
  }
  for (const clip of test.clips) {
    const b = el("button", "Nghe: " + clip.title);
    b.addEventListener("click", () => speakLines(clip.lines));
    main.append(b);
  }
  test.items.forEach((item, i) => {
    const sec = el("section", null, "card");
    sec.append(el("p", "Câu " + (i + 1) + ". " + item.stem, "reading")).children;
    const stemEl = sec.querySelector("p"); stemEl.lang = "en";
    if (item.options && typeof item.options[0] === "string") {
      for (const o of item.options) {
        const b = el("button", o); b.lang = "en";
        b.addEventListener("click", () => { answers[item.id] = o; });
        sec.append(b);
      }
    } else if (item.options) {
      for (const o of item.options) {
        const b = el("button", o.text); b.lang = "en";
        b.addEventListener("click", () => { answers[item.id] = o.id; });
        sec.append(b);
      }
    } else if (item.blanks) {
      const input = el("input"); input.type = "text"; input.lang = "en"; input.autocomplete = "off";
      input.addEventListener("input", () => { answers[item.id] = input.value; });
      sec.append(input);
    }
    main.append(sec);
  });
  if (!pauseUsed) {
    const pb = el("button", "Tạm dừng khẩn cấp (1 lần)", "link-quiet");
    pb.addEventListener("click", () => { paused = true; pauseUsed = true; pb.replaceWith(el("p", "Đang tạm dừng. Đồng hồ đã dừng.")); 
      const rb = el("button", "Tiếp tục", "cta-primary"); rb.dataset.cta = "secondary";
      rb.addEventListener("click", () => { paused = false; rb.remove(); }); main.append(rb); });
    main.append(pb);
  }
  const submitBtn = el("button", "Nộp bài", "cta-primary"); submitBtn.dataset.cta = "primary";
  submitBtn.addEventListener("click", () => { clearInterval(timerInt); submit(root); });
  main.append(submitBtn);
}
async function submit(root) {
  const usedSec = test.minutes * 60 - Math.max(0, timeLeft);
  let correct = 0;
  const perType = {};
  const wrongTags = [];
  for (const item of test.items) {
    const a = answers[item.id];
    let ok = false;
    if (a != null && a !== "") {
      if (item.blanks) ok = gradeTyped(a, { acceptedAnswers: item.blanks["1"].acceptedAnswers, maxWords: item.blanks["1"].maxWords }).result;
      else ok = a === item.correct;
    }
    perType[item.questionType] = perType[item.questionType] || { ok: 0, total: 0 };
    perType[item.questionType].total++;
    if (ok) { correct++; perType[item.questionType].ok++; }
    else {
      let tag;
      if (item.questionType === "tfng") tag = "tfng." + String(item.correct).toLowerCase().replace(/ /g, "-") + "-as-" + String(a ?? "").toLowerCase().replace(/ /g, "-");
      else if (item.questionType === "mcq") { const o = item.options.find((x) => x.id === a); tag = "mcq." + (o?.distractorType || "unknown"); }
      else tag = "completion.wrong-word";
      wrongTags.push({ item, tag, chosen: a });
    }
  }
  const r = await repo();
  const attempt = { id: "a-" + Date.now(), testId: test.id, skill: test.skill || "mixed", mode: "test", createdAt: new Date().toISOString(),
    correct, total: test.items.length, seconds: usedSec, pauses: pauseUsed ? 1 : 0, perType };
  await r.put("attempts", attempt);
  for (const w of wrongTags) {
    await r.put("errors", { id: "e-" + Date.now() + "-" + w.item.id, questionId: w.item.id, tag: w.tag,
      chosen: String(w.chosen ?? ""), correct: String(w.item.blanks ? w.item.blanks["1"].acceptedAnswers[0] : w.item.correct),
      confidence: null, seconds: null, mode: "test", createdAt: new Date().toISOString(), state: "open", variantsPassed: 0, recurrent: false });
  }
  await addXp("miniTest");
  await markStudyDay({ lessonsDone: 0, practiceAnswers: 0 });
  await r.put("progress", { key: "lastTestResult", value: attempt });
  const { navigate } = await import("../router.js");
  navigate("/test/" + test.id + "/result");
}
const TYPE_LABEL = { tfng: "TRUE / FALSE / NOT GIVEN", mcq: "Trắc nghiệm", sentence: "Điền câu", form: "Điền biểu mẫu" };
const LEVEL = (acc) => acc < 0.5 ? ["▲", "Yếu", "var(--err)"] : acc <= 0.75 ? ["◆", "Trung bình", "var(--warn)"] : ["●", "Vững", "var(--ok)"];
export async function renderTestResult(root) {
  const r = await repo();
  const row = await r.get("progress", "lastTestResult");
  const a = row?.value;
  const main = mainShell(root, "Mình sai ở đâu?");
  if (!a) { main.append(el("p", "Chưa có kết quả thi thử.")); primaryLink(main, "test", "Tới trang thi thử"); return; }
  main.append(el("p", "Đúng " + a.correct + " trên " + a.total + " câu. Thời gian dùng: " + Math.floor(a.seconds / 60) + " phút " + (a.seconds % 60) + " giây. Số lần tạm dừng: " + a.pauses + ".", "num"));
  if (a.total === 40 && (a.skill === "reading" || a.skill === "listening")) {
    const band = formatInterval(bandInterval(a.skill, a.correct, false));
    main.append(el("p", "Band ước tính: " + band + " (khoảng ước tính, cộng trừ 0.5).", "num"));
    main.append(el("p", "Cách tính: số câu đúng được quy đổi theo bảng quy đổi chính thức của IELTS cho kỹ năng này, rồi nới thành khoảng 0.5 vì đề tự biên soạn chưa qua hiệu chuẩn như đề thi thật."));
  } else {
    main.append(el("p", "Đề này có " + a.total + " câu nên không quy đổi band. Band chỉ hiện ở đề đủ 40 câu của một kỹ năng, dạng khoảng ước tính."));
  }
  for (const [t, v] of Object.entries(a.perType)) {
    const acc = v.ok / v.total;
    const [icon, label, color] = LEVEL(acc);
    const p = el("p", icon + " " + (TYPE_LABEL[t] || t) + ": " + v.ok + "/" + v.total + " — " + label, "num");
    p.style.color = color;
    main.append(p);
  }
  primaryLink(main, "errors", "Tạo phiên vá lỗi");
}
