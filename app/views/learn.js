// /learn/:unitId — bai hoc 6 pha, Muc 6 dac ta v4.0 + bang chung Reading Phu luc B5.
import { gradeTyped } from "../engine/normalize.js";
import { loadContent, repo, el, mainShell, speakLines } from "../state.js";
import { addXp, markStudyDay } from "../gamify-ui.js";

let unit = null, phase = 0, draft = null, confidence = {};

const PHASE_NAMES = ["Preview", "Encounter", "Elaborate", "Retrieve", "Produce", "Reflect"];

function header(main, exitTo) {
  const h = document.createElement("header");
  h.className = "app-header";
  const a = el("a", "← Thoát"); a.href = exitTo; a.dataset.nav = "";
  h.append(a, el("span", "Pha " + (phase + 1) + "/6 · " + PHASE_NAMES[phase]));
  main.before(h);
}
function cta(main, text, onClick) {
  const b = el("button", text, "cta-primary");
  b.dataset.cta = "primary";
  b.addEventListener("click", onClick);
  main.append(b);
  return b;
}
function passageEl(p, highlight) {
  const wrap = el("div");
  for (const para of p.paragraphs) {
    const par = el("p", null, "reading"); par.lang = "en";
    for (const s of para.sentences) {
      const span = el("span", s.text + " ");
      if (highlight && highlight.paragraphId === para.id && highlight.sentenceIndex === s.index) {
        span.style.background = "var(--warn)"; span.style.color = "var(--ink)";
      }
      par.append(span);
    }
    wrap.append(par);
  }
  return wrap;
}
async function saveDraft() {
  const r = await repo();
  await r.put("lessonDrafts", { unitId: unit.id, updatedAt: new Date().toISOString(), state: draft });
}
async function recordError(q, chosen, correct, confLevel, tag) {
  const r = await repo();
  await r.put("errors", { id: "e-" + Date.now() + "-" + q.id, questionId: q.id, tag,
    chosen, correct, confidence: confLevel || null, seconds: null, mode: "lesson",
    createdAt: new Date().toISOString(), state: "open", variantsPassed: 0, recurrent: false });
}
function tagFor(q, chosen) {
  if (q.questionType === "tfng" || q.questionType === "ynng") return q.questionType + "." + String(q.correct).toLowerCase().replace(/ /g, "-") + "-as-" + String(chosen).toLowerCase().replace(/ /g, "-");
  if (q.questionType === "mcq") {
    const opt = q.options.find((o) => o.id === chosen);
    return "mcq." + (opt && opt.distractorType ? opt.distractorType : "unknown");
  }
  return "completion.wrong-word";
}
function feedback(main, q, chosenText, isCorrect) {
  const box = el("div", null, "card");
  box.setAttribute("aria-live", "polite");
  box.append(el("p", isCorrect ? "✓ Đúng" : "✗ Chưa đúng. Đáp án: " + displayCorrect(q)));
  const ex = q.explanation || {};
  if (ex.whyCorrect) box.append(el("p", ex.whyCorrect));
  if (!isCorrect && ex.whyWrong) box.append(el("p", ex.whyWrong));
  if (!isCorrect && ex.trap) box.append(el("p", "Bẫy: " + ex.trap));
  main.append(box);
  const ev = q.evidence || (q.correct === "NOT GIVEN" ? q.nearMiss : null);
  if (ev) main.append(passageEl(unit.questions.includes(q) ? unit.passage : unit.retrievePassage, ev));
  if (q.correct === "NOT GIVEN" && q.nearMiss) box.append(el("p", "Câu gần nhất trong bài: “" + q.nearMiss.quote + "” " + q.nearMiss.whyNotEnough));
}
function displayCorrect(q) {
  if (q.questionType === "mcq") { const o = q.options.find((x) => x.id === q.correct); return o ? o.text : q.correct; }
  if (q.blanks) return q.blanks["1"].acceptedAnswers[0];
  return q.correct;
}
function askQuestion(main, q, { withConfidence = false, onDone }) {
  const wrap = el("div");
  const stem = el("p", q.stem, "reading"); stem.lang = "en"; wrap.append(stem);
  let answer = null, conf = null;
  if (q.options || q.questionType === "tfng" || q.questionType === "ynng") {
    const defaults = q.questionType === "ynng" ? ["YES", "NO", "NOT GIVEN"] : ["TRUE", "FALSE", "NOT GIVEN"];
    const opts = q.options ? q.options.map((o) => ({ v: o.id ?? o, t: o.text ?? o })) : defaults.map((t) => ({ v: t, t }));
    const group = el("div");
    for (const o of opts) {
      const b = el("button", o.t); b.lang = "en";
      b.addEventListener("click", () => { answer = o.v; });
      group.append(b);
    }
    wrap.append(group);
  } else if (q.blanks) {
    const input = el("input"); input.type = "text"; input.lang = "en"; input.autocomplete = "off";
    input.addEventListener("input", () => { answer = input.value; });
    wrap.append(input);
  }
  if (withConfidence) {
    wrap.append(el("p", "Mức chắc chắn:"));
    const cg = el("div");
    for (const [lv, label] of [[1, "Đoán"], [2, "Khá chắc"], [3, "Chắc chắn"]]) {
      const b = el("button", label);
      b.addEventListener("click", () => { conf = lv; });
      cg.append(b);
    }
    wrap.append(cg);
  }
  const submit = el("button", "Chốt đáp án", "cta-primary");
  submit.dataset.cta = "primary";
  submit.addEventListener("click", () => {
    if (answer == null || answer === "") return;
    if (withConfidence && conf == null) return;
    let correct;
    if (q.blanks) correct = gradeTyped(answer, { acceptedAnswers: q.blanks["1"].acceptedAnswers, maxWords: q.blanks["1"].maxWords }).result;
    else correct = answer === q.correct;
    onDone({ answer, correct, conf });
  });
  wrap.append(submit);
  main.append(wrap);
  return wrap;
}

const UNIT_FILES = { "R-U01": "unit-r-u01.json", "R-U02": "unit-r-u02.json", "R-U03": "unit-r-u03.json", "R-U04": "unit-r-u04.json", "R-U05": "unit-r-u05.json", "R-U06": "unit-r-u06.json", "R-U07": "unit-r-u07.json", "R-U08": "unit-r-u08.json", "R-U09": "unit-r-u09.json", "R-U10": "unit-r-u10.json", "R-U11": "unit-r-u11.json", "R-U12": "unit-r-u12.json", "R-U13": "unit-r-u13.json", "R-U14": "unit-r-u14.json", "L-U01": "unit-l-u01.json", "L-U02": "unit-l-u02.json", "L-U03": "unit-l-u03.json", "L-U04": "unit-l-u04.json", "L-U05": "unit-l-u05.json", "L-U06": "unit-l-u06.json", "L-U07": "unit-l-u07.json", "L-U08": "unit-l-u08.json", "L-U09": "unit-l-u09.json", "L-U10": "unit-l-u10.json", "L-U11": "unit-l-u11.json", "L-U12": "unit-l-u12.json", "L-U13": "unit-l-u13.json", "L-U14": "unit-l-u14.json", "G-U01": "unit-g-u01.json", "G-U02": "unit-g-u02.json" };
export async function renderLearn(root, params) {
  unit = await loadContent(UNIT_FILES[params.unitId] || "unit-r-u01.json");
  phase = 0;
  draft = { elaborate: {}, retrieve: [], startedAt: Date.now() };
  renderPhase(root);
}

function renderPhase(root) {
  root.replaceChildren();
  const main = mainShell(root, null);
  header(main, "today");
  const next = () => { phase++; saveDraft(); renderPhase(root); };

  if (phase === 0) { // Preview
    main.append(el("p", unit.objective));
    main.append(el("p", "Thời lượng: " + unit.minutes + " phút"));
    cta(main, "Bắt đầu · " + unit.minutes + " phút", next);
  }
  if (phase === 1) { // Encounter
    if (unit.skill === "listening") {
      main.append(el("p", "Nghe một lần, chưa xem bản ghi. Chỉ để ý thông tin chính và chỗ người nói tự sửa lại."));
      const lines = unit.passage.paragraphs.flatMap((p) => p.sentences.map((s) => s.text));
      const play = el("button", "Nghe đoạn ghi âm", "cta-secondary");
      play.addEventListener("click", () => speakLines(lines));
      main.append(play);
      cta(main, "Nghe xong", next);
    } else {
      main.append(el("p", unit.skill === "grammar" ? "Đọc một lần. Để ý các cấu trúc được dùng trong bài." : "Đọc một lần. Chỉ để ý câu nào nói ngược lại câu hỏi."));
      main.append(passageEl(unit.passage, null));
      cta(main, "Đọc xong", next);
    }
  }
  if (phase === 2) { // Elaborate: mau day du (cau 1) -> co dan (cau 2) -> tu lam (cau 3-5)
    const [q1, q2, ...rest] = unit.questions;
    main.append(el("p", "Trước khi xem giải thích: vì sao đáp án là " + q1.correct + "?"));
    const thought = el("input"); thought.type = "text"; thought.placeholder = "Một dòng, được để trống";
    main.append(thought);
    const showBtn = el("button", "Xem giải thích", "cta-primary"); showBtn.dataset.cta = "primary";
    showBtn.addEventListener("click", () => {
      showBtn.remove(); thought.remove();
      const box = el("div", null, "card");
      box.append(el("p", "Câu mẫu: " + q1.stem, "reading"));
      box.append(el("p", "Bằng chứng trong bài: “" + q1.evidence.quote + "”"));
      box.append(el("p", q1.explanation.whyCorrect));
      main.append(box, passageEl(unit.passage, q1.evidence));
      main.append(el("p", "Câu có dẫn: trả lời, rồi xem phản hồi ngay."));
      askQuestion(main, q2, { onDone: ({ answer, correct }) => {
        if (!correct) recordError(q2, answer, q2.correct, null, tagFor(q2, answer));
        feedback(main, q2, answer, correct);
        let idx = 0;
        const doRest = () => {
          if (idx >= rest.length) { cta(main, "Tiếp tục", next); return; }
          const q = rest[idx++];
          askQuestion(main, q, { onDone: ({ answer: a2, correct: c2 }) => {
            if (!c2) recordError(q, a2, q.correct, null, tagFor(q, a2));
            feedback(main, q, a2, c2);
            doRest();
          }});
        };
        doRest();
      }});
    });
    main.append(showBtn);
  }
  if (phase === 3) { // Retrieve: ngu canh moi, khong nhin lai bai, chon muc chac chan
    main.append(el("p", "Không nhìn lại bài. Chọn đáp án, rồi chọn mức chắc chắn."));
    if (unit.skill === "listening") {
      const lines = unit.retrievePassage.paragraphs.flatMap((p) => p.sentences.map((s) => s.text));
      const play = el("button", "Nghe đoạn mới", "cta-secondary");
      play.addEventListener("click", () => speakLines(lines));
      main.append(play);
    } else {
      main.append(passageEl(unit.retrievePassage, null));
    }
    let idx = 0;
    const doQ = () => {
      if (idx >= unit.retrieveQuestions.length) {
        const score = draft.retrieve.filter((x) => x.correct).length;
        main.append(el("p", "Đúng " + score + " trên " + unit.retrieveQuestions.length + " câu ở phần tự nhớ lại."));
        cta(main, "Tiếp tục", next);
        return;
      }
      const q = unit.retrieveQuestions[idx++];
      askQuestion(main, q, { withConfidence: true, onDone: ({ answer, correct, conf }) => {
        draft.retrieve.push({ id: q.id, correct, conf });
        if (!correct) recordError(q, answer, q.correct, conf, tagFor(q, answer));
        doQ();
      }});
    };
    doQ();
  }
  if (phase === 4) { // Produce: bien doi cau, tu kiem bang mau da duyet
    const p = unit.produce;
    main.append(el("p", p.prompt));
    main.append(el("p", p.sourceSentence, "reading"));
    main.append(el("p", p.instruction));
    const input = el("textarea"); input.lang = "en"; input.rows = 3;
    main.append(input);
    const submit = el("button", "Nộp", "cta-primary"); submit.dataset.cta = "primary";
    submit.addEventListener("click", () => {
      const t = input.value.toLowerCase();
      const ok = p.mustContain.every((m) => t.includes(m)) && p.mustNotContain.every((m) => !t.includes(m));
      const box = el("div", null, "card");
      box.append(el("p", ok ? "Khớp mẫu" : "Chưa khớp mẫu nào. Xem các cách viết đúng."));
      if (!ok) for (const s of p.samples) { const sp = el("p", s, "reading"); sp.lang = "en"; box.append(sp); }
      main.append(box);
      cta(main, "Tiếp tục", next);
    });
    main.append(submit);
  }
  if (phase === 5) { // Reflect
    main.append(el("p", "Một câu thôi: hôm nay bạn học được gì?"));
    const input = el("textarea"); input.rows = 3;
    main.append(input);
    main.append(el("p", "Mức hiểu của bạn, từ 1 đến 5:"));
    let rating = null;
    const rg = el("div");
    for (let i = 1; i <= 5; i++) { const b = el("button", String(i)); b.addEventListener("click", () => { rating = i; }); rg.append(b); }
    main.append(rg);
    cta(main, "Lưu và kết thúc", async () => {
      const r = await repo();
      const score = draft.retrieve.filter((x) => x.correct).length;
      await r.put("lessons", { id: "l-" + Date.now(), unitId: unit.id, skill: unit.skill || "reading",
        retrieveScore: score, retrieveTotal: draft.retrieve.length,
        retrieve: draft.retrieve, reflection: input.value, selfRating: rating,
        at: new Date().toISOString() });
      const rd = await repo();
      await rd.delete("lessonDrafts", unit.id);
      await addXp("lesson");
      for (const x of draft.retrieve) if (x.correct) await addXp("retrieveCorrect");
      await markStudyDay({ lessonsDone: 1 });
      main.replaceChildren(el("p", "Xong. Bài tiếp theo: Reading U02 · 6 phút."));
      const a = el("a", "Về hôm nay", "cta-primary"); a.href = "today"; a.dataset.nav = ""; a.dataset.cta = "primary";
      main.append(a);
    });
  }
}
