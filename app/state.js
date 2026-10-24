// Trang thai ung dung: noi duy nhat view cham vao repo va noi dung tinh.
// Luong phan lop (Muc 22.1): view -> state/engine -> repo -> IndexedDB.
import { openDb, createRepo } from "./repo/db.js";
import { localDay } from "./engine/day.js";

let repoPromise = null;
export function repo() {
  if (!repoPromise) repoPromise = openDb().then((db) => createRepo(db));
  return repoPromise;
}
const contentCache = new Map();
export async function loadContent(name) {
  if (!contentCache.has(name)) {
    contentCache.set(name, fetch("content/" + name).then((r) => r.json()));
  }
  return contentCache.get(name);
}
export const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
export function todayDay(now = Date.now()) { return localDay(now, TZ); }
export async function getProgress(key) {
  const r = await repo();
  const row = await r.get("progress", key);
  return row ? row.value : null;
}
export async function setProgress(key, value) {
  const r = await repo();
  await r.put("progress", { key, value });
}
export async function getSetting(key, fallback) {
  const r = await repo();
  const row = await r.get("settings", key);
  return row ? row.value : fallback;
}
export async function setSetting(key, value) {
  const r = await repo();
  await r.put("settings", { key, value });
}
export function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
export function mainShell(root, headingText) {
  root.replaceChildren();
  const main = document.createElement("main");
  if (headingText) main.append(el("h1", headingText));
  root.append(main);
  return main;
}
export function primaryLink(main, href, text) {
  const a = el("a", text, "cta-primary");
  a.href = href; a.dataset.nav = ""; a.dataset.cta = "primary";
  main.append(a);
  return a;
}
export function speakLines(lines) {
  if (!("speechSynthesis" in window)) return false;
  speechSynthesis.cancel();
  const voices = speechSynthesis.getVoices();
  const voice = voices.find((v) => v.lang === "en-GB") || voices.find((v) => v.lang && v.lang.startsWith("en"));
  for (const line of lines) {
    const u = new SpeechSynthesisUtterance(line.text || line);
    u.lang = "en-GB"; if (voice) u.voice = voice; u.rate = 0.95;
    speechSynthesis.speak(u);
  }
  return true;
}
