// Chuan hoa dap an go — Muc 9.4 dac ta v4.0 (thu tu co dinh).
export function normalizeAnswer(s) {
  let t = String(s).normalize("NFC").trim().toLowerCase();
  t = t.replace(/[‐-―]/g, "-");
  t = t.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
  t = t.replace(/\s+/g, " ");
  if (t.endsWith(".")) t = t.slice(0, -1);
  return t;
}
export function countWords(s) {
  const t = normalizeAnswer(s);
  return t === "" ? 0 : t.split(" ").length;
}
export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return dp[m][n];
}
/** Cham mot cau dien tu. Tra {result, tag} — tag chi de chan doan, khong doi ket qua. */
export function gradeTyped(input, { acceptedAnswers, maxWords, nearMissAnswers = [] }) {
  const t = normalizeAnswer(input);
  const accepted = acceptedAnswers.map(normalizeAnswer);
  if (accepted.includes(t)) return { result: true, tag: null };
  if (maxWords && countWords(t) > maxWords) return { result: false, tag: "over-limit" };
  for (const nm of nearMissAnswers) {
    if (normalizeAnswer(nm.text) === t) return { result: false, tag: nm.tag };
  }
  for (const a of accepted) {
    // So it/so nhieu la chan doan cu the hon sai chinh ta nen kiem truoc.
    if (t + "s" === a || t === a + "s" || t + "es" === a || t === a.replace(/ies$/, "y") && a.endsWith("ies")) {
      return { result: false, tag: "plural-mismatch" };
    }
    const len = a.replace(/ /g, "").length;
    const limit = len >= 8 ? 2 : len >= 5 ? 1 : 0;
    if (limit > 0 && levenshtein(t.replace(/ /g, ""), a.replace(/ /g, "")) <= limit) {
      return { result: false, tag: "spelling" };
    }
  }
  return { result: false, tag: "wrong-word" };
}
