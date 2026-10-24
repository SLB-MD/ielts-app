// /settings — Muc 19.6 + sao luu/khoi phuc/reset Muc 22.3.
import { openDb } from "../repo/db.js";
import { getSetting, setSetting, el, mainShell, primaryLink } from "../state.js";

const STORES = ["cards", "reviews", "errors", "attempts", "lessons", "lessonDrafts", "progress", "settings", "meta"];
// Sao luu mac dinh KHONG gom ban ghi chu tro chuyen (talkSessions) — Muc 17A.11, 22.3.

function allFromStore(db, store) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, "readonly").objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function clearAndPut(db, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES, "readwrite");
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    for (const store of STORES) {
      const os = tx.objectStore(store);
      os.clear();
      for (const row of data.stores[store] || []) os.put(row);
    }
  });
}
export async function renderSettings(root) {
  const main = mainShell(root, "Chỉnh gì?");
  const minutes = await getSetting("minutesPerDay", 25);
  main.append(el("p", "Phút mỗi ngày:"));
  const group = el("div");
  for (const m of [15, 25, 40]) {
    const b = el("button", m + " phút" + (m === minutes ? " (đang chọn)" : ""));
    b.addEventListener("click", async () => { await setSetting("minutesPerDay", m); renderSettings(root); });
    group.append(b);
  }
  main.append(group);
  const themeBtn = el("button", "Đổi giao diện sáng / tối");
  themeBtn.addEventListener("click", async () => {
    const cur = await getSetting("theme", "light");
    const nextTheme = cur === "light" ? "dark" : "light";
    await setSetting("theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme === "dark" ? "dark" : "";
  });
  main.append(themeBtn);
  if (navigator.storage?.persist) {
    const persisted = await navigator.storage.persisted();
    main.append(el("p", "Lưu trữ bền trên trình duyệt này: " + (persisted ? "đã bật" : "chưa bật")));
    if (!persisted) {
      const pb = el("button", "Xin lưu trữ bền");
      pb.addEventListener("click", async () => { await navigator.storage.persist(); renderSettings(root); });
      main.append(pb);
    }
  }
  main.append(el("h2", "Sao lưu và khôi phục"));
  const backupBtn = el("button", "Tạo tệp sao lưu");
  backupBtn.addEventListener("click", async () => {
    const db = await openDb();
    const stores = {};
    for (const s of STORES) stores[s] = await allFromStore(db, s);
    const payload = { schemaVersion: 1, exportedAt: new Date().toISOString(), stores };
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const a = el("a", "Tải tệp sao lưu"); a.href = URL.createObjectURL(blob); a.download = "ielts-rebuild-backup.json";
    main.append(a);
    await setSetting("lastBackupAt", new Date().toISOString());
  });
  main.append(backupBtn);
  const file = el("input"); file.type = "file"; file.accept = "application/json";
  main.append(file);
  const importBtn = el("button", "Nhập tệp sao lưu đã chọn");
  importBtn.addEventListener("click", async () => {
    const f = file.files[0];
    if (!f) return;
    let data;
    try { data = JSON.parse(await f.text()); } catch { main.append(el("p", "Tệp sao lưu thuộc phiên bản không tương thích. Dữ liệu hiện tại chưa bị thay đổi.")); return; }
    if (!data || data.schemaVersion !== 1 || typeof data.stores !== "object") {
      main.append(el("p", "Tệp sao lưu thuộc phiên bản không tương thích. Dữ liệu hiện tại chưa bị thay đổi."));
      return;
    }
    const counts = STORES.map((s) => s + ": " + ((data.stores[s] || []).length)).join(", ");
    main.append(el("p", "Bản xem trước: " + counts));
    const confirmBtn = el("button", "Xác nhận khôi phục (ghi đè dữ liệu hiện tại)", "cta-primary");
    confirmBtn.dataset.cta = "primary";
    confirmBtn.addEventListener("click", async () => {
      const db = await openDb();
      await clearAndPut(db, data);
      main.append(el("p", "Đã khôi phục xong."));
    });
    main.append(confirmBtn);
  });
  main.append(importBtn);
  main.append(el("h2", "Xóa dữ liệu"));
  const resetBtn = el("button", "Reset toàn bộ");
  resetBtn.addEventListener("click", () => {
    main.append(el("p", "Gõ RESET để xóa toàn bộ dữ liệu trên máy này. Không hoàn tác được."));
    const input = el("input"); input.type = "text";
    const doBtn = el("button", "Xóa toàn bộ dữ liệu");
    doBtn.addEventListener("click", async () => {
      if (input.value !== "RESET") { main.append(el("p", "Chưa đúng chữ RESET. Chưa xóa gì.")); return; }
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction([...STORES, "talkSessions"], "readwrite");
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
        for (const s of [...STORES, "talkSessions"]) tx.objectStore(s).clear();
      });
      if (window.caches) { const keys = await caches.keys(); await Promise.all(keys.map((k) => caches.delete(k))); }
      main.append(el("p", "Đã xóa toàn bộ dữ liệu trên máy này."));
    });
    main.append(input, doBtn);
  });
  main.append(resetBtn);
  primaryLink(main, "today", "Xong");
}
