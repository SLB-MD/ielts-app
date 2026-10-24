// /write — Writing workspace, Muc 17.5. Lint la kiem tra co hoc, khong phai diem; khong cham band.
import { lintEssay, wordCount } from "../engine/lint.js";
import { loadContent, repo, getSetting, el, mainShell, primaryLink } from "../state.js";
import { addXp, dailyFlag, setDailyFlag } from "../gamify-ui.js";

export async function renderWrite(root) {
  const data = await loadContent("writing.json");
  const main = mainShell(root, "Bài viết của mình đã soát những gì?");
  let prompt = data.prompts[0];
  const sel = el("select");
  for (const p of data.prompts) { const o = el("option", (p.task === 1 ? "Task 1: " : "Task 2: ") + p.type); o.value = p.id; sel.append(o); }
  sel.addEventListener("change", () => { prompt = data.prompts.find((p) => p.id === sel.value); showPrompt(); });
  main.append(sel);
  const promptBox = el("div", null, "card");
  const showPrompt = () => { promptBox.replaceChildren(el("p", prompt.prompt, "reading")); promptBox.querySelector("p").lang = "en"; };
  showPrompt();
  main.append(promptBox);
  main.append(el("p", "Lập dàn ý (5 phút): phân tích đề, ý chính, ví dụ, từ khóa."));
  const outline = [];
  for (const label of ["Phân tích đề", "Ý chính", "Ví dụ", "Từ khóa"]) {
    const t = el("input"); t.type = "text"; t.placeholder = label; outline.push(t); main.append(t);
  }
  const editor = el("textarea"); editor.rows = 14; editor.lang = "en";
  editor.setAttribute("aria-label", "Khung viết bài");
  main.append(editor);
  const wc = el("p", "0 từ", "num");
  editor.addEventListener("input", () => { wc.textContent = wordCount(editor.value) + " từ"; });
  main.append(wc);
  const lintBtn = el("button", "Kiểm tra cơ học", "cta-primary"); lintBtn.dataset.cta = "primary";
  const lintBox = el("div");
  let lintDone = false;
  lintBtn.addEventListener("click", async () => {
    const spelling = await getSetting("spelling", "en-GB");
    const results = lintEssay(editor.value, { task: prompt.task, spelling });
    lintBox.replaceChildren(el("p", "Kiểm tra cơ học, không phải điểm. App không đánh giá nội dung, lập luận hay độ trôi chảy."));
    if (!results.length) lintBox.append(el("p", "Không phát hiện vấn đề cơ học nào trong danh sách kiểm."));
    for (const r of results) lintBox.append(el("p", r.id + " — " + r.message));
    lintDone = true;
    maybeAward();
  });
  main.append(lintBtn, lintBox);
  if (prompt.sample) {
    const det = el("details");
    det.append(el("summary", "Xem bài mẫu có chú thích"));
    const sp = el("p", prompt.sample, "reading"); sp.lang = "en"; det.append(sp);
    for (const a of prompt.annotations) det.append(el("p", a));
    main.append(det);
  }
  main.append(el("h2", "Checklist tự kiểm"));
  let checked = 0; const boxes = [];
  for (const g of data.checklist) {
    main.append(el("h3", g.group));
    for (const item of g.items) {
      const label = el("label");
      const cb = el("input"); cb.type = "checkbox";
      cb.addEventListener("change", () => { checked = boxes.filter((b) => b.checked).length; count.textContent = "Bạn đã tick " + checked + " trên 12 ô"; maybeAward(); });
      boxes.push(cb);
      label.append(cb, document.createTextNode(" " + item));
      main.append(label);
    }
  }
  const count = el("p", "Bạn đã tick 0 trên 12 ô", "num");
  main.append(count);
  async function maybeAward() {
    if (lintDone && checked === 12 && !(await dailyFlag("writingXp"))) {
      await setDailyFlag("writingXp");
      const xp = await addXp("writingDaily");
      main.append(el("p", "Đã ghi nhận một bài Writing có lint và checklist. Cộng " + xp + " XP."));
      const r = await repo();
      await r.put("attempts", { id: "a-" + Date.now(), testId: prompt.id, skill: "writing", mode: "writing", createdAt: new Date().toISOString(), words: wordCount(editor.value) });
    }
  }
  primaryLink(main, "today", "Về hôm nay");
}
