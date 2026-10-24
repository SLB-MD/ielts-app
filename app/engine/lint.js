// Writing lint co hoc — Muc 17.5 dac ta v4.0. Xac dinh, khong phai diem.
const STOP = new Set("the a an and or but if while of at by for with to in on is are was were be been being it its this that these those as from has have had not no do does did will would can could should may might i you he she we they my your his her our their me him us them than then so such".split(" "));
export function wordCount(text) { return text.trim() === "" ? 0 : text.trim().split(/\s+/).length; }
export function splitSentences(text) { return text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean); }
export function splitParagraphs(text) { return text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean); }
const CONNECTIVES = ["firstly", "secondly", "finally", "however", "moreover", "furthermore", "therefore", "consequently", "in addition", "on the other hand", "for example", "for instance", "in conclusion", "overall", "although", "despite", "whereas", "more importantly", "as a result"];
export function lintEssay(text, { task = 2, spelling = "en-GB" } = {}) {
  const out = [];
  const words = wordCount(text);
  const min = task === 1 ? 150 : 250;
  if (words < min) out.push({ id: "L1", message: "Số từ: " + words + ". Đề yêu cầu tối thiểu " + min + " từ." });
  const paras = splitParagraphs(text);
  if (task === 2 && paras.length < 4) out.push({ id: "L2", message: "Số đoạn: " + paras.length + ". Gợi ý: mở bài, hai đoạn thân, kết bài." });
  const sentences = splitSentences(text);
  sentences.forEach((s, i) => { if (wordCount(s) > 35) out.push({ id: "L3", message: "Câu " + (i + 1) + " dài " + wordCount(s) + " từ. Cân nhắc tách câu." }); });
  const freq = new Map();
  for (const w of text.toLowerCase().replace(/[^a-z' -]/g, " ").split(/\s+/)) {
    if (w.length < 3 || STOP.has(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  for (const [w, n] of freq) if (n >= 5) out.push({ id: "L4", message: "Từ '" + w + "' lặp " + n + " lần. Gợi ý tìm từ thay thế." });
  // L5: tron Anh-My (tap tu co ban, mo rong dan)
  const gb = ["organise", "organised", "behaviour", "colour", "centre", "programme", "realise", "whilst"];
  const us = ["organize", "organized", "behavior", "color", "center", "program", "realize", "while"];
  const low = " " + text.toLowerCase() + " ";
  const hasGb = gb.some((w) => low.includes(" " + w + " ") || low.includes(" " + w + "s "));
  const hasUs = us.some((w) => low.includes(" " + w + " ") || low.includes(" " + w + "s "));
  if (hasGb && hasUs) out.push({ id: "L5", message: "Đang trộn chính tả Anh và Mỹ. Chọn một hệ: " + spelling + "." });
  // L6: tu noi
  const used = new Map();
  for (const c of CONNECTIVES) {
    const n = (low.match(new RegExp("\\b" + c + "\\b", "g")) || []).length;
    if (n) used.set(c, n);
  }
  for (const [c, n] of used) if (n > 3) out.push({ id: "L6", message: "Từ nối '" + c + "' dùng " + n + " lần, quá 3 lần." });
  if (used.size) out.push({ id: "L6-list", message: "Từ nối đã dùng: " + [...used.keys()].join(", ") + "." });
  // L7: cau mo dau giong nhau
  let run = 1;
  for (let i = 1; i < sentences.length; i++) {
    const a = sentences[i - 1].split(" ")[0].toLowerCase(), b = sentences[i].split(" ")[0].toLowerCase();
    run = a === b ? run + 1 : 1;
    if (run === 3) { out.push({ id: "L7", message: "Ba câu liên tiếp bắt đầu bằng '" + b + "'. Cân nhắc đổi cách mở câu." }); break; }
  }
  // L8: viet tat
  const contractions = text.match(/\b\w+['’](t|s|re|ve|ll|d)\b/gi) || [];
  if (contractions.length) out.push({ id: "L8", message: "Có viết tắt (" + [...new Set(contractions)].slice(0, 3).join(", ") + "). Bài học thuật nên viết đầy đủ." });
  return out;
}
