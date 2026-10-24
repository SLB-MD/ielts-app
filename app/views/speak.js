// /speak — Speaking workspace, Muc 17.6. Chi so co hoc, khong phai diem; khong cham phat am, khong band.
import { countLongSilences } from "../engine/speaking.js";
import { loadContent, el, mainShell, primaryLink } from "../state.js";
import { addXp, dailyFlag, setDailyFlag } from "../gamify-ui.js";

let recorder = null, chunks = [], frames = [], audioCtx = null, raf = 0, startTs = 0, recordings = [], totalBytes = 0;

export async function renderSpeak(root) {
  const data = await loadContent("speaking.json");
  const main = mainShell(root, "Mình nói thế nào?");
  main.append(el("p", "Âm thanh chỉ lưu trên máy bạn."));
  let current = { part: 1, prompt: data.part1[0].questions.join(" ") };
  const sel = el("select");
  const opts = [];
  data.part1.forEach((t, i) => opts.push(["Part 1 · " + t.topic, () => { current = { part: 1, prompt: t.questions.join(" ") }; show(); }]));
  data.part2.forEach((t, i) => opts.push(["Part 2 · " + t.cue, () => { current = { part: 2, prompt: t.cue + " You should say: " + t.points.join("; ") }; show(); }]));
  data.part3.forEach((t, i) => opts.push(["Part 3 · " + t.topic, () => { current = { part: 3, prompt: t.questions.join(" ") }; show(); }]));
  for (const [label] of opts) { const o = el("option", label); sel.append(o); }
  sel.addEventListener("change", () => opts[sel.selectedIndex][1]());
  main.append(sel);
  const box = el("div", null, "card");
  const show = () => { box.replaceChildren(el("p", current.prompt, "reading")); box.querySelector("p").lang = "en"; };
  show();
  main.append(box);

  const status = el("p", "Chưa ghi âm.", "num");
  const recBtn = el("button", "Ghi âm", "cta-primary"); recBtn.dataset.cta = "primary";
  const playBox = el("div");
  const metrics = el("div");
  recBtn.addEventListener("click", async () => {
    if (recorder && recorder.state === "recording") { recorder.stop(); return; }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { status.textContent = "Chưa có quyền micro. Bật quyền trong cài đặt trình duyệt để ghi âm."; return; }
    chunks = []; frames = [];
    const type = ["audio/mp4", "audio/webm"].find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "";
    recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    recorder.addEventListener("dataavailable", (e) => chunks.push(e.data));
    recorder.addEventListener("stop", () => {
      cancelAnimationFrame(raf);
      if (audioCtx) audioCtx.close();
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      totalBytes += blob.size;
      const dur = (Date.now() - startTs) / 1000;
      const rec = { url: URL.createObjectURL(blob), size: blob.size, dur };
      recordings.push(rec);
      status.textContent = "Đã ghi " + Math.round(dur) + " giây.";
      renderRecordings();
      showMetrics(dur);
      recBtn.textContent = "Ghi âm";
    });
    audioCtx = new AudioContext();
    const src = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser(); analyser.fftSize = 2048;
    src.connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    let last = performance.now();
    const loop = () => {
      const now = performance.now();
      if (now - last >= 50) {
        last = now;
        analyser.getFloatTimeDomainData(buf);
        let sum = 0; for (const v of buf) sum += v * v;
        frames.push(Math.sqrt(sum / buf.length));
      }
      raf = requestAnimationFrame(loop);
    };
    startTs = Date.now();
    recorder.start();
    loop();
    status.textContent = "Đang ghi âm.";
    recBtn.textContent = "Dừng ghi";
    if (current.part === 2) setTimeout(() => { if (recorder && recorder.state === "recording") recorder.stop(); }, 120000);
  });
  main.append(recBtn, status, playBox, metrics);
  function renderRecordings() {
    playBox.replaceChildren();
    recordings.forEach((rec, i) => {
      const row = el("div");
      const audio = el("audio"); audio.controls = true; audio.src = rec.url;
      const del = el("button", "Xóa bản ghi " + (i + 1));
      del.addEventListener("click", () => { totalBytes -= rec.size; recordings.splice(i, 1); renderRecordings(); });
      row.append(audio, del);
      playBox.append(row);
    });
    if (totalBytes > 50 * 1024 * 1024) playBox.append(el("p", "Bản ghi đang chiếm hơn 50 MB. Xóa bớt bản cũ."));
  }
  function showMetrics(dur) {
    metrics.replaceChildren(el("p", "Chỉ số cơ học, không phải điểm."));
    metrics.append(el("p", "Thời lượng nói: " + Math.round(dur) + " giây.", "num"));
    metrics.append(el("p", "Số khoảng lặng từ 2 giây trở lên: " + countLongSilences(frames, 0.005), "num"));
    metrics.append(el("p", "Gõ lại điều bạn đã nói vào ô dưới đây nếu muốn xem tốc độ nói ước tính."));
    const t = el("textarea"); t.rows = 3; t.lang = "en";
    const b = el("button", "Tính tốc độ nói");
    b.addEventListener("click", () => {
      const words = t.value.trim() === "" ? 0 : t.value.trim().split(/\s+/).length;
      metrics.append(el("p", "Tốc độ nói ước tính: " + Math.round(words / (dur / 60)) + " từ mỗi phút.", "num"));
    });
    metrics.append(t, b);
  }
  main.append(el("h2", "Checklist tự kiểm"));
  let checked = 0; const boxes = [];
  for (const item of data.checklist) {
    const label = el("label");
    const cb = el("input"); cb.type = "checkbox"; boxes.push(cb);
    cb.addEventListener("change", async () => {
      checked = boxes.filter((b) => b.checked).length;
      if (checked === boxes.length && recordings.length && !(await dailyFlag("speakingXp"))) {
        await setDailyFlag("speakingXp");
        const xp = await addXp("speakingDaily");
        main.append(el("p", "Đã ghi nhận một phiên Speaking có ghi âm và checklist. Cộng " + xp + " XP."));
      }
    });
    label.append(cb, document.createTextNode(" " + item));
    main.append(label);
  }
  primaryLink(main, "today", "Về hôm nay");
}
