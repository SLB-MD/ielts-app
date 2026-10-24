// /vocab — SRS Muc 13 + bon dang the Muc 10.3. Cham tu dong, nguoi hoc khong tu khai (the tu).
import { gradeReview, graduate, isLeech } from "../engine/srs.js";
import { gradeTyped } from "../engine/normalize.js";
import { loadContent, repo, todayDay, el, mainShell, speakLines } from "../state.js";
import { addXp } from "../gamify-ui.js";

const DAY_MS = 86400000;
let queue = [], requeue = [], newLeft = 8, done = 0, total = 0, startedAt = 0;

async function seed() {
  const r = await repo();
  const existing6 = await r.get("cards", "V-0381");
  if (!existing6) {
    try {
      const v6 = await loadContent("vocab-foundation-6.json");
      for (const c of v6.cards) {
        await r.put("cards", { ...c, cardType: "vocab", state: "new", n: 0, I: 0, E: 2500, lapses: 0, dueAt: 0, dueDay: 0, step: 0 });
      }
    } catch { /* tep bo sung chua co */ }
  }
  const existing5 = await r.get("cards", "V-0261");
  if (!existing5) {
    try {
      const v5 = await loadContent("vocab-foundation-5.json");
      for (const c of v5.cards) {
        await r.put("cards", { ...c, cardType: "vocab", state: "new", n: 0, I: 0, E: 2500, lapses: 0, dueAt: 0, dueDay: 0, step: 0 });
      }
    } catch { /* tep bo sung chua co */ }
  }
  const existing4 = await r.get("cards", "V-0141");
  if (!existing4) {
    try {
      const v4 = await loadContent("vocab-foundation-4.json");
      for (const c of v4.cards) {
        await r.put("cards", { ...c, cardType: "vocab", state: "new", n: 0, I: 0, E: 2500, lapses: 0, dueAt: 0, dueDay: 0, step: 0 });
      }
    } catch { /* tep bo sung chua co */ }
  }
  const existing3 = await r.get("cards", "V-0061");
  if (!existing3) {
    try {
      const v3 = await loadContent("vocab-foundation-3.json");
      for (const c of v3.cards) {
        await r.put("cards", { ...c, cardType: "vocab", state: "new", n: 0, I: 0, E: 2500, lapses: 0, dueAt: 0, dueDay: 0, step: 0 });
      }
    } catch { /* tep bo sung chua co */ }
  }
  const existing2 = await r.get("cards", "V-0021");
  if (!existing2) {
    try {
      const v2 = await loadContent("vocab-foundation-2.json");
      for (const c of v2.cards) {
        await r.put("cards", { ...c, cardType: "vocab", state: "new", n: 0, I: 0, E: 2500, lapses: 0, dueAt: 0, dueDay: 0, step: 0 });
      }
    } catch { /* tep bo sung chua co */ }
  }
  const existing = await r.get("cards", "V-0001");
  if (existing) return;
  const v = await loadContent("vocab-foundation.json");
  for (const c of v.cards) {
    await r.put("cards", { ...c, cardType: "vocab", state: "new", n: 0, I: 0, E: 2500, lapses: 0, dueAt: 0, dueDay: 0, step: 0 });
  }
  const rules = await loadContent("rule-cards.json");
  try { const talk = await loadContent("rule-cards-talk.json"); rules.cards.push(...talk.cards); } catch { /* doi noi dung bo sung */ }
  try { const gram = await loadContent("rule-cards-grammar.json"); rules.cards.push(...gram.cards); } catch { /* doi noi dung bo sung */ }
  for (const c of rules.cards) {
    await r.put("cards", { id: c.id, cardType: "rule", title: c.title, rule: c.rule, steps: c.steps, traps: c.traps,
      state: "new", n: 0, I: 0, E: 2500, lapses: 0, dueAt: 0, dueDay: 0, step: 0 });
  }
}
async function saveCard(card, now) {
  const r = await repo();
  if (card.state === "review" && card.I > 0) {
    card.dueAt = now + card.I * DAY_MS;
    card.dueDay = todayDay(card.dueAt);
  }
  await r.put("cards", card);
  const rv = await repo();
  await rv.put("reviews", { id: "r-" + now + "-" + card.id + "-" + Math.random().toString(36).slice(2, 7),
    cardId: card.id, reviewedAt: new Date(now).toISOString(), rating: card._lastRating || null });
}
function modeFor(card) {
  if (card.cardType === "rule") return "flip";
  if (card.state === "new" || card.state === "learning" || card.state === "relearning") return card.step === 0 ? "M1" : "M2";
  if (card.I >= 15) return "M4";
  if (card.I >= 6) return "M3";
  return "M2";
}
export async function renderVocab(root) {
  await seed();
  const r = await repo();
  const all = [];
  for (const store of ["cards"]) {
    const rows = await r.getAllByIndex(store, "state", "review");
    all.push(...rows);
  }
  const day = todayDay();
  const due = all.filter((c) => c.dueDay <= day && !isLeech(c));
  const fresh = await r.getAllByIndex("cards", "state", "new");
  const allCards = [...due, ...fresh];
  window.__allMeanings = allCards.filter((c) => c.meaningVi).map((c) => c.meaningVi);
  queue = [...due];
  total = due.length;
  window.__newCards = fresh;
  startedAt = Date.now();
  next(root);
}
function finish(root) {
  const main = mainShell(root, "Ôn từ");
  main.append(el("p", "Xong phiên ôn. Đã xử lý " + done + " thẻ."));
  main.append(el("p", "Không nhớ cũng được. Chọn Quên, thẻ sẽ quay lại sớm."));
  const a = el("a", "Về hôm nay", "cta-primary"); a.href = "today"; a.dataset.nav = ""; a.dataset.cta = "primary";
  main.append(a);
}
function next(root) {
  if (requeue.length && (queue.length === 0 || requeue[0].gap <= 0)) {
    queue.unshift(requeue.shift().card);
  }
  for (const x of requeue) x.gap--;
  if (!queue.length) {
    const fresh = (window.__newCards || []).filter((c) => c.state === "new");
    if (fresh.length && newLeft > 0) { queue.push(fresh[0]); window.__newCards = fresh.slice(1); }
    else return finish(root);
  }
  const card = queue.shift();
  if (card.state === "new") { newLeft--; total++; }
  showCard(root, card);
}
function showCard(root, card) {
  const main = mainShell(root, "Ôn từ");
  main.append(el("p", "Đến hạn hôm nay: " + Math.max(0, total - done), "num"));
  const mode = modeFor(card);
  const t0 = Date.now();
  const grade = async (rating, correct) => {
    card._lastRating = rating;
    if (card.cardType === "rule" || card.state === "review") {
      if (rating === "again" && card.cardType === "rule") { requeue.push({ card, gap: 5 }); await saveCard(card, Date.now()); return next(root); }
      if (card.state === "new") Object.assign(card, graduate({ ...card, state: "learning" }, rating));
      else if (rating === "again" && card.state === "review") { Object.assign(card, gradeReview(card, "again")); requeue.push({ card, gap: 5 }); }
      else if (card.state === "relearning") Object.assign(card, graduate(card, rating));
      else { const wasDue = (card.dueDay || 0) <= todayDay(); Object.assign(card, gradeReview(card, rating, { overdueDays: Math.max(0, todayDay() - (card.dueDay || todayDay())) })); if (wasDue && (rating === "good" || rating === "easy")) await addXp("srsOnTime"); }
    } else {
      // The tu: cham tu dong theo dung/sai va thoi gian (Muc 10.3)
      if (!correct) { card.state = card.state === "new" ? "learning" : card.state; requeue.push({ card, gap: 5 }); await saveCard(card, Date.now()); done++; return next(root); }
      if (card.step === 0) { card.step = 1; card.state = "learning"; requeue.push({ card, gap: 5 }); await saveCard(card, Date.now()); return next(root); }
      const ms = Date.now() - t0;
      const auto = rating || (ms >= 8000 ? "hard" : ms <= 3000 ? "easy" : "good");
      Object.assign(card, graduate(card, auto));
    }
    await saveCard(card, Date.now());
    done++;
    next(root);
  };
  if (mode === "flip") {
    main.append(el("h2", card.title || ""));
    main.append(el("p", card.rule || ""));
    const show = el("button", "Xem ba bước và bẫy", "cta-primary"); show.dataset.cta = "primary";
    show.addEventListener("click", () => {
      show.remove();
      for (const s of card.steps || []) main.append(el("p", s));
      for (const t of card.traps || []) main.append(el("p", "Bẫy: " + t));
      main.append(el("p", "Không nhớ cũng được. Chọn Quên, thẻ sẽ quay lại sớm."));
      const g = el("div");
      for (const [rating, label] of [["again", "Quên"], ["hard", "Khó"], ["good", "Nhớ"], ["easy", "Dễ"]]) {
        const b = el("button", label);
        b.addEventListener("click", () => grade(rating, rating !== "again"));
        g.append(b);
      }
      main.append(g);
    });
    main.append(show);
    return;
  }
  // The tu
  main.append(el("h2", card.headword, "reading"));
  const ipa = el("p", card.ipa); ipa.lang = "en"; main.append(ipa);
  const listen = el("button", "Nghe");
  listen.addEventListener("click", () => speakLines([card.headword]));
  main.append(listen);
  if (mode === "M1") {
    main.append(el("p", "Chọn nghĩa đúng của từ này."));
    const others = (window.__allMeanings || []).filter((x) => x !== card.meaningVi);
    const choices = [card.meaningVi, ...others.slice(0, 3)].sort();
    for (const ch of choices) {
      const b = el("button", ch);
      b.addEventListener("click", () => grade(null, ch === card.meaningVi));
      main.append(b);
    }
  } else if (mode === "M3") {
    main.append(el("p", "Nghe rồi gõ lại từ bạn nghe được."));
    const input = el("input"); input.type = "text"; input.lang = "en"; input.autocomplete = "off";
    main.append(input);
    const b = el("button", "Chốt đáp án", "cta-primary"); b.dataset.cta = "primary";
    b.addEventListener("click", () => grade(null, gradeTyped(input.value, { acceptedAnswers: [card.headword], maxWords: 1 }).result));
    main.append(b);
  } else if (mode === "M4") {
    main.append(el("p", "Điền từ vào câu sau."));
    const cl = el("p", card.cloze, "reading"); cl.lang = "en"; main.append(cl);
    const input = el("input"); input.type = "text"; input.lang = "en"; input.autocomplete = "off";
    main.append(input);
    const b = el("button", "Chốt đáp án", "cta-primary"); b.dataset.cta = "primary";
    b.addEventListener("click", () => grade(null, gradeTyped(input.value, { acceptedAnswers: [card.headword], maxWords: 1 }).result));
    main.append(b);
  } else { // M2
    main.append(el("p", "Gõ từ tiếng Anh cho nghĩa: " + card.meaningVi));
    const input = el("input"); input.type = "text"; input.lang = "en"; input.autocomplete = "off";
    main.append(input);
    const b = el("button", "Chốt đáp án", "cta-primary"); b.dataset.cta = "primary";
    b.addEventListener("click", () => grade(null, gradeTyped(input.value, { acceptedAnswers: [card.headword], maxWords: 1 }).result));
    main.append(b);
  }
}
