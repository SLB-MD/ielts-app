// /errors — Error Notebook, Muc 14.7: sap theo diem giam dan, co trang thai va nut va loi.
import { tagScore, repairEligible } from "../engine/errors.js";
import { dueChecks } from "../engine/errors.js";
import { repo, getProgress, el, mainShell, primaryLink } from "../state.js";
const NAMES = { tfng: "TFNG", ynng: "YNNG", completion: "Điền từ", mcq: "Trắc nghiệm", listening: "Nghe", time: "Thời gian", vocab: "Từ vựng" };
const STATUS = { open: "Chưa vá", pending: "Đang kiểm", verifying: "Đang kiểm", closed: "Đã đóng" };
export async function renderErrors(root) {
  const main = mainShell(root, "Mình sai gì nhiều nhất?");
  const r = await repo();
  const all = [];
  for (const st of ["open", "pending", "verifying", "closed"]) {
    const rows = await r.getAllByIndex("errors", "state", st).catch(() => []);
    all.push(...rows);
  }
  if (!all.length) main.append(el("p", "Chưa có lỗi nào được ghi. Lỗi sẽ xuất hiện sau khi bạn làm bài."));
  const states = (await getProgress("repairStates")) || {};
  const byTag = new Map();
  for (const e of all) { if (!byTag.has(e.tag)) byTag.set(e.tag, []); byTag.get(e.tag).push(e); }
  const now = Date.now();
  const rows = [...byTag.entries()].map(([tag, errs]) => ({ tag, errs, score: tagScore(errs, now) })).sort((a, b) => b.score - a.score);
  for (const { tag, errs } of rows) {
    const st = states[tag];
    const status = st ? STATUS[st.state] : STATUS[errs[0].state] || "Chưa vá";
    const fam = NAMES[tag.split(".")[0]] || tag.split(".")[0];
    const line = el("p", fam + " · " + tag + " — " + errs.length + " lỗi · gần nhất " + String(errs[errs.length - 1].createdAt).slice(0, 10) + " · " + status, "num");
    main.append(line);
    if (st && dueChecks({ state: st.state, repairedAt: st.repairedAt, check1At: st.check1At }, now).length) {
      const a = el("a", "Kiểm tra lại · 3 phút", "cta-primary"); a.href = "verify/" + encodeURIComponent(tag); a.dataset.nav = ""; a.dataset.cta = "primary";
      main.append(a);
    } else if (status === "Chưa vá" && repairEligible(errs, now)) {
      const a = el("a", "Vá lỗi · 6 phút", "cta-primary"); a.href = "repair/" + encodeURIComponent(tag); a.dataset.nav = ""; a.dataset.cta = "primary";
      main.append(a);
    } else if (status === "Chưa vá") {
      main.append(el("p", "Cần thêm lỗi cùng loại trong 7 ngày, hoặc đủ tổng trong 14 ngày, mới mở bài vá."));
    }
  }
  primaryLink(main, "today", "Về hôm nay");
}
