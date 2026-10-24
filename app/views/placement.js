// /placement — Muc 12: 20 cau thich ung, khong phan hoi giua chung, khong hint.
import { estimate, nextItem, tierWithBoundary, groupStatus, TIER_WEEKS } from "../engine/placement.js";
import { gradeTyped } from "../engine/normalize.js";
import { loadContent, setProgress, el, mainShell, speakLines } from "../state.js";

const NEEDS = { reading: 7, listening: 6, vocab: 7 };
let bank = null, session = null;

function grade(item, answer) {
  if (item.blanks) {
    const b = item.blanks["1"];
    return gradeTyped(answer, { acceptedAnswers: b.acceptedAnswers, maxWords: b.maxWords }).result ? 1 : 0;
  }
  return answer === item.correct ? 1 : 0;
}

export async function renderPlacement(root) {
  bank = await loadContent("placement.json");
  session = { used: new Set(), needs: { ...NEEDS }, responses: [], count: 0 };
  step(root);
}

function passageText(item) {
  const p = bank.passages.find((x) => x.id === item.passageId);
  return p ? p.sentences.join(" ") : null;
}
function clipLines(item) {
  const c = bank.clips.find((x) => x.id === item.audioId);
  return c ? c.lines : null;
}

function step(root) {
  const { theta } = session.responses.length ? estimate(session.responses.map((r) => ({ item: r.item, correct: r.correct }))) : { theta: 0 };
  const item = nextItem(bank.items, session.used, session.needs, theta);
  if (!item || session.count >= 20) return finish(root);
  session.used.add(item.id); session.needs[item.group]--;
  const main = mainShell(root, null);
  main.append(el("p", "Câu " + (session.count + 1) + " trên 20", "num"));
  const pText = item.passageId && passageText(item);
  if (pText) { const p = el("p", pText, "reading"); p.lang = "en"; main.append(p); }
  const lines = item.audioId && clipLines(item);
  if (lines) {
    const btn = el("button", "Nghe đoạn hội thoại", "cta-primary");
    btn.dataset.cta = "secondary-audio";
    btn.addEventListener("click", () => speakLines(lines));
    main.append(btn);
    main.append(el("p", "Bấm Nghe để nghe. Bạn có thể nghe lại."));
  }
  const stem = el("p", item.stem, "reading"); stem.lang = "en"; main.append(stem);
  let submit;
  if (item.blanks) {
    const input = el("input"); input.type = "text"; input.lang = "en"; input.autocomplete = "off";
    main.append(input);
    submit = () => input.value;
    var getAnswer = () => input.value;
  }
  if (item.options) {
    let chosen = null;
    const group = el("div");
    for (const opt of item.options) {
      const b = el("button", opt);
      b.lang = "en";
      b.addEventListener("click", () => { chosen = opt; for (const x of group.children) x.removeAttribute("aria-pressed"); b.setAttribute("aria-pressed", "true"); });
      group.append(b);
    }
    main.append(group);
    var getAnswer = () => chosen;
  }
  const cta = el("button", "Chốt đáp án", "cta-primary");
  cta.dataset.cta = "primary";
  cta.addEventListener("click", () => {
    const ans = getAnswer();
    if (ans == null || ans === "") return;
    session.responses.push({ item, correct: grade(item, ans), answer: ans });
    session.count++;
    step(root);
  });
  main.append(cta);
}

async function finish(root) {
  const responses = session.responses.map((r) => ({ item: r.item, correct: r.correct }));
  const { theta, se } = estimate(responses);
  const { tier, nearBoundary } = tierWithBoundary(theta, se);
  const groups = {};
  for (const g of ["reading", "listening", "vocab"]) {
    groups[g] = groupStatus(session.responses.filter((r) => r.item.group === g));
  }
  const result = { theta, se, tier, nearBoundary, groups, weeks: TIER_WEEKS[tier], at: new Date().toISOString(),
    answers: session.responses.map((r) => ({ id: r.item.id, correct: r.correct })) };
  await setProgress("placement", result);
  location.hash = "";
  const { navigate } = await import("../router.js");
  navigate("/placement/result");
}

export async function renderPlacementResult(root) {
  const { getProgress } = await import("../state.js");
  const r = await getProgress("placement");
  const main = mainShell(root, "Mình đang ở đâu?");
  if (!r) {
    main.append(el("p", "Chưa có kết quả chẩn đoán."));
    const { primaryLink } = await import("../state.js");
    primaryLink(main, "placement", "Làm chẩn đoán");
    return;
  }
  const names = { reading: "Reading", listening: "Listening", vocab: "Từ vựng và ngữ pháp" };
  main.append(el("p", "Mức hiện tại: " + r.tier + ". Sai số của phép đo khoảng ±" + r.se.toFixed(1) + " logit (20 câu)."));
  if (r.nearBoundary) main.append(el("p", "Gần ranh giới " + r.nearBoundary[0] + " và " + r.nearBoundary[1] + ". Bắt đầu ở mức thấp hơn để chắc chắn."));
  for (const g of Object.keys(names)) main.append(el("p", names[g] + ": " + r.groups[g]));
  main.append(el("p", "Lộ trình gợi ý: " + r.weeks + " tuần. Đây là điểm xuất phát để chọn bài, không phải điểm thi."));
  const details = el("details");
  const sum = el("summary", "Cách tính"); details.append(sum);
  details.append(el("p", "Điểm được ước lượng bằng mô hình Rasch: mỗi câu có độ khó riêng, đáp án của bạn được đối chiếu với độ khó đó trên lưới năng lực, kèm sai số. 20 câu cho kết quả tổng thể tương đối ổn, nhưng chi tiết theo từng dạng câu còn thô nên chỉ hiện ba mức Vững, Trung bình, Cần vá."));
  main.append(details);
  const { primaryLink } = await import("../state.js");
  primaryLink(main, "today", "Bắt đầu lộ trình");
}
