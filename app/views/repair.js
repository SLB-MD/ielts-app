// Va loi va kiem tra lai — Muc 14.5, 14.6. Dong loi chi sau kiem tra gian cach, khong dong ngay sau bai va.
import { gradeTyped } from "../engine/normalize.js";
import { repairEligible, afterCheck, dueChecks } from "../engine/errors.js";
import { loadContent, repo, getProgress, setProgress, el, mainShell, primaryLink } from "../state.js";
import { addXp } from "../gamify-ui.js";

function familyOf(tag) { return tag.split(".")[0]; }
async function variantsFor(tag, excludeIds, count) {
  const bank = await loadContent("practice-bank.json");
  const fam = familyOf(tag);
  let pool = bank.items.filter((i) => !excludeIds.has(i.id));
  if (fam === "tfng") pool = pool.filter((i) => i.questionType === "tfng");
  else if (fam === "mcq") pool = pool.filter((i) => i.questionType === "mcq");
  else pool = pool.filter((i) => i.blanks);
  return pool.slice(0, count);
}
function askVariants(main, items, done) {
  let idx = 0, passed = 0, highWrong = false;
  const step = () => {
    if (idx >= items.length) return done(passed, highWrong);
    const item = items[idx++];
    const wrap = el("div", null, "card");
    const stem = el("p", item.stem, "reading"); stem.lang = "en"; wrap.append(stem);
    let answer = null, conf = null;
    if (item.options) {
      for (const o of item.options) {
        const v = typeof o === "string" ? o : o.id, t = typeof o === "string" ? o : o.text;
        const b = el("button", t); b.lang = "en";
        b.addEventListener("click", () => { answer = v; });
        wrap.append(b);
      }
    } else if (item.blanks) {
      const input = el("input"); input.type = "text"; input.lang = "en";
      input.addEventListener("input", () => { answer = input.value; });
      wrap.append(input);
    }
    const cg = el("div");
    for (const [lv, label] of [[1, "Đoán"], [2, "Khá chắc"], [3, "Chắc chắn"]]) {
      const b = el("button", label); b.addEventListener("click", () => { conf = lv; }); cg.append(b);
    }
    wrap.append(cg);
    const submit = el("button", "Chốt đáp án", "cta-primary"); submit.dataset.cta = "primary";
    submit.addEventListener("click", () => {
      if (answer == null || answer === "") return;
      let ok;
      if (item.blanks) ok = gradeTyped(answer, { acceptedAnswers: item.blanks["1"].acceptedAnswers, maxWords: item.blanks["1"].maxWords }).result;
      else ok = answer === item.correct;
      if (ok) passed++;
      if (!ok && conf === 3) highWrong = true;
      wrap.remove();
      step();
    });
    wrap.append(submit);
    main.append(wrap);
  };
  step();
}
async function tagErrors(tag) {
  const r = await repo();
  const all = await r.getAllByIndex("errors", "tag", tag).catch(() => []);
  if (all.length) return all;
  const open = await r.getAllByIndex("errors", "state", "open");
  return open.filter((e) => e.tag === tag);
}
export async function renderRepair(root, params) {
  const tag = decodeURIComponent(params.tag);
  const main = mainShell(root, "Vá lỗi · 6 phút");
  const errs = await tagErrors(tag);
  const rules = await loadContent("rule-cards.json");
  const fam = familyOf(tag);
  const rule = rules.cards.find((c) => c.id === (fam === "tfng" ? "RC-TFNG" : fam === "mcq" ? "RC-MCQ" : "RC-TFNG"));
  if (rule) {
    const card = el("div", null, "card");
    card.append(el("h2", rule.title), el("p", rule.rule));
    for (const s of rule.steps) card.append(el("p", s));
    main.append(card);
  }
  main.append(el("p", "Đáp án bạn đã chọn và đáp án đúng:"));
  for (const e of errs.slice(0, 5)) main.append(el("p", "Bạn chọn: " + e.chosen + " · Đáp án: " + e.correct, "num"));
  main.append(el("p", "Vì sao hai đáp án khác nhau? Viết một dòng trước khi làm câu biến thể."));
  const thought = el("input"); thought.type = "text"; main.append(thought);
  const startBtn = el("button", "Làm 2 câu biến thể", "cta-primary"); startBtn.dataset.cta = "primary";
  startBtn.addEventListener("click", async () => {
    startBtn.remove();
    const variants = await variantsFor(tag, new Set(errs.map((e) => e.questionId)), 2);
    askVariants(main, variants, async () => {
      const states = (await getProgress("repairStates")) || {};
      states[tag] = { state: "pending", repairedAt: new Date().toISOString(), variantsPassed: 0 };
      await setProgress("repairStates", states);
      main.append(el("p", "Đã vá xong bước đầu. Lỗi chưa đóng: cần qua hai lần kiểm tra giãn cách, sau 3 ngày và sau 7 ngày tiếp theo."));
      primaryLink(main, "today", "Về hôm nay");
    });
  });
  main.append(startBtn);
}
export async function renderVerify(root, params) {
  const tag = decodeURIComponent(params.tag);
  const main = mainShell(root, "Kiểm tra lại lỗi");
  const states = (await getProgress("repairStates")) || {};
  const st = states[tag];
  if (!st) { main.append(el("p", "Chưa có bài vá cho nhãn này.")); primaryLink(main, "errors", "Về sổ lỗi"); return; }
  const probe = { state: st.state, repairedAt: st.repairedAt, check1At: st.check1At };
  const due = dueChecks(probe, Date.now());
  if (!due.length) { main.append(el("p", "Chưa đến hạn kiểm tra. Kiểm 1 sau 3 ngày kể từ bài vá; kiểm 2 sau 7 ngày kể từ kiểm 1.")); primaryLink(main, "today", "Về hôm nay"); return; }
  const checkIndex = due[0];
  main.append(el("p", "Kiểm " + checkIndex + ": 2 câu biến thể mới, khác câu đã làm."));
  const variants = await variantsFor(tag, new Set(), 2);
  askVariants(main, variants, async (passed, highWrong) => {
    const total = (st.variantsPassed || 0) + passed;
    const probeErr = { state: st.state, variantsPassed: st.variantsPassed || 0 };
    const res = afterCheck(probeErr, checkIndex, passed, highWrong, total);
    states[tag] = { ...st, state: res.state, variantsPassed: total,
      check1At: checkIndex === 1 ? new Date().toISOString() : st.check1At };
    await setProgress("repairStates", states);
    const r = await repo();
    const errs = await tagErrors(tag);
    for (const e of errs) await r.put("errors", { ...e, state: res.state, variantsPassed: total, closedAt: res.closedAt || null });
    if (res.state === "closed") {
      const xp = await addXp("errorClosed");
      main.append(el("p", "Đã đóng lỗi này sau hai lần kiểm tra giãn cách. Cộng " + xp + " XP."));
    } else if (res.state === "verifying") {
      main.append(el("p", "Qua kiểm 1. Còn kiểm 2 sau 7 ngày."));
    } else {
      main.append(el("p", "Chưa đạt. Lỗi mở lại; lần vá sau sẽ dùng cách giải thích khác."));
    }
    primaryLink(main, "today", "Về hôm nay");
  });
}
