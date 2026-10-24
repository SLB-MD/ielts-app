// /talk — Tro chuyen voi AI, Muc 17A. Phuong an A da chot (docs/TALK_DECISION.md):
// Gemini Live free tier + Gateway Cloudflare Workers. Khoa API chi o Gateway;
// trinh duyet nhan token tam thoi 1 lan va noi thang toi Google qua WebSocket.
// App khong luu noi dung hoi thoai; talkSessions chi giu thoi luong va che do.
import { loadContent, el, mainShell, getSetting, setSetting, repo } from "../state.js";

const CONSENT_VERSION = 1;
const BREAKER_MESSAGE = "Trò chuyện tạm nghỉ hôm nay. Các phần khác vẫn dùng bình thường.";

function gatewayBase() {
  return getSetting("talkGatewayUrl", "").then((u) => String(u || "").replace(/\/+$/, ""));
}
async function deviceId() {
  let id = await getSetting("talkDeviceId", "");
  if (!id) {
    id = "d-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
    await setSetting("talkDeviceId", id);
  }
  return id;
}
function b64encode(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(s);
}
function b64decode(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export async function renderTalk(root) {
  const main = mainShell(root, "Hôm nay bạn muốn nói về gì?");
  main.append(el("p", "Bạn sẽ nói chuyện với AI của Google (Gemini), không phải người thật."));
  main.append(el("p", "Trò chuyện cần mạng. Các phần khác vẫn dùng được khi mất mạng."));

  // --- Gateway ---
  const gwCard = el("div", null, "card");
  gwCard.append(el("h2", "Kết nối"));
  const gwInput = document.createElement("input");
  gwInput.type = "url"; gwInput.placeholder = "Địa chỉ Gateway, ví dụ https://ielts-talk.example.workers.dev";
  gwInput.value = await getSetting("talkGatewayUrl", "");
  gwInput.setAttribute("aria-label", "Địa chỉ Gateway");
  const gwSave = el("button", "Lưu và kiểm tra", "cta-secondary");
  const status = el("p", "Chưa kiểm tra kết nối."); status.setAttribute("role", "status");
  gwCard.append(gwInput, gwSave, status);
  main.append(gwCard);

  // --- Dong y + tuoi (Muc 17A.11) ---
  const consentCard = el("div", null, "card");
  consentCard.append(el("h2", "Đồng ý trước phiên đầu tiên"));
  const consentState = el("p", "");
  consentCard.append(consentState);
  const consentBox = el("div", null);
  consentBox.append(el("p", "Giọng nói và lời bạn gõ được gửi tới Google Gemini để tạo câu trả lời. App và Gateway không lưu nội dung hội thoại."));
  consentBox.append(el("p", "Ở gói miễn phí, Google công bố nội dung gửi lên có thể được dùng để cải thiện sản phẩm của Google, và người duyệt của Google có thể đọc, chú thích và xử lý nội dung đó. Vì vậy đừng nói hoặc chia sẻ thông tin nhạy cảm, bí mật hay thông tin cá nhân trong lúc trò chuyện."));
  consentBox.append(el("p", "Trò chuyện với AI dành cho người từ 16 tuổi trở lên. App chỉ lưu việc bạn đã đồng ý và tự khai đủ tuổi, không lưu ngày sinh."));
  const agreeData = document.createElement("input"); agreeData.type = "checkbox"; agreeData.id = "talk-agree-data";
  const agreeDataLabel = el("label", "Tôi đã đọc và đồng ý với điều khoản dữ liệu ở trên."); agreeDataLabel.htmlFor = "talk-agree-data";
  const agreeAge = document.createElement("input"); agreeAge.type = "checkbox"; agreeAge.id = "talk-agree-age";
  const agreeAgeLabel = el("label", "Tôi tự khai mình từ 16 tuổi trở lên."); agreeAgeLabel.htmlFor = "talk-agree-age";
  const row1 = el("p", null); row1.append(agreeData, agreeDataLabel);
  const row2 = el("p", null); row2.append(agreeAge, agreeAgeLabel);
  const consentBtn = el("button", "Xác nhận đồng ý", "cta-secondary");
  const revokeBtn = el("button", "Thu hồi đồng ý", "cta-secondary");
  consentBox.append(row1, row2, consentBtn);
  consentCard.append(consentBox, revokeBtn);
  main.append(consentCard);

  let consent = await getSetting("talkConsent", null);
  const paintConsent = () => {
    const ok = !!(consent && consent.version === CONSENT_VERSION && consent.age16 === true);
    consentBox.hidden = ok;
    revokeBtn.hidden = !ok;
    consentState.textContent = ok
      ? "Đã đồng ý điều khoản phiên bản " + CONSENT_VERSION + ", đã tự khai từ 16 tuổi trở lên."
      : "Chưa đồng ý. Cần xác nhận ở mục này trước khi bắt đầu.";
    return ok;
  };
  consentBtn.addEventListener("click", async () => {
    if (!agreeData.checked || !agreeAge.checked) {
      consentState.textContent = "Cần tích đủ hai ô: đồng ý điều khoản dữ liệu và tự khai từ 16 tuổi trở lên.";
      return;
    }
    consent = { version: CONSENT_VERSION, at: Date.now(), age16: true };
    await setSetting("talkConsent", consent);
    paintConsent(); refresh();
  });
  revokeBtn.addEventListener("click", async () => {
    consent = null; await setSetting("talkConsent", null);
    agreeData.checked = false; agreeAge.checked = false;
    paintConsent(); refresh();
  });

  // --- Thiet lap phien ---
  const form = el("div", null, "card");
  form.append(el("h2", "Thiết lập phiên"));
  const modeSel = document.createElement("select"); modeSel.setAttribute("aria-label", "Cách nhập");
  for (const [v, t] of [["voice", "Nói bằng micro"], ["text", "Gõ chữ"]]) {
    const o = document.createElement("option"); o.value = v; o.textContent = t; modeSel.append(o);
  }
  const minSel = document.createElement("select"); minSel.setAttribute("aria-label", "Thời lượng phiên");
  for (const m of [5, 10, 15, 20]) {
    const o = document.createElement("option"); o.value = String(m); o.textContent = m + " phút"; minSel.append(o);
  }
  const topicInput = document.createElement("input");
  topicInput.type = "text"; topicInput.placeholder = "Chủ đề (để trống là tự do)"; topicInput.maxLength = 80;
  const rMode = el("p", "Cách nhập: "); rMode.append(modeSel);
  const rMin = el("p", "Thời lượng: "); rMin.append(minSel);
  const rTopic = el("p", "Chủ đề: "); rTopic.append(topicInput);
  form.append(rMode, rMin, rTopic);
  main.append(form);

  const start = el("button", "Bắt đầu", "cta-primary");
  start.disabled = true; start.dataset.cta = "primary";
  main.append(start);

  // --- Khu vuc phien ---
  const sessionBox = el("div", null, "card");
  sessionBox.hidden = true;
  const timer = el("p", ""); timer.setAttribute("role", "timer");
  const sessStatus = el("p", "");
  const log = el("div", null); log.setAttribute("aria-live", "polite");
  const textRow = el("p", null);
  const textInput = document.createElement("input");
  textInput.type = "text"; textInput.placeholder = "Gõ câu tiếng Anh rồi bấm Gửi"; textInput.maxLength = 500;
  const sendBtn = el("button", "Gửi", "cta-secondary");
  textRow.append(textInput, sendBtn);
  const endBtn = el("button", "Kết thúc phiên", "cta-secondary");
  sessionBox.append(timer, sessStatus, log, textRow, endBtn);
  main.append(sessionBox);

  let gatewayReady = false;
  async function refresh() {
    const base = await gatewayBase();
    const okConsent = paintConsent();
    if (!base) {
      gatewayReady = false;
      status.textContent = "Chưa có địa chỉ Gateway. Gateway cần được chủ dự án triển khai trên Cloudflare Workers rồi dán địa chỉ vào đây (xem docs/TALK_DECISION.md).";
    } else {
      try {
        const dev = await deviceId();
        const r = await fetch(base + "/talk/quota?device=" + encodeURIComponent(dev));
        const q = await r.json();
        if (!q.enabled && q.reason === "quota_exhausted") {
          gatewayReady = false; status.textContent = BREAKER_MESSAGE;
        } else if (!q.enabled) {
          gatewayReady = false; status.textContent = "Gateway đã nối được nhưng chưa cấu hình khóa Gemini ở phía máy chủ.";
        } else {
          gatewayReady = true;
          const leftDay = Math.max(0, q.dailyMinutes - q.usedToday);
          const leftMonth = Math.max(0, q.monthlyMinutes - q.usedMonth);
          status.textContent = "Gateway sẵn sàng. Ước tính còn " + leftDay + " phút hôm nay và " + leftMonth + " phút tháng này cho thiết bị này.";
        }
      } catch {
        gatewayReady = false; status.textContent = "Không nối được tới Gateway. Kiểm tra lại địa chỉ và mạng.";
      }
    }
    start.disabled = !(gatewayReady && okConsent);
  }
  gwSave.addEventListener("click", async () => {
    await setSetting("talkGatewayUrl", gwInput.value.trim());
    refresh();
  });

  // --- Phien noi ---
  let ws = null, micStream = null, micCtx = null, playCtx = null, playAt = 0;
  let timerId = null, remainSec = 0, startedAt = 0, plannedMin = 0, aiLine = null;

  function logLine(who, text) {
    const p = el("p", null);
    const b = el("strong", who + ": ");
    p.append(b, document.createTextNode(text));
    log.append(p);
    return p;
  }
  function playPcm24k(b64) {
    if (!playCtx) { playCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 }); playAt = playCtx.currentTime; }
    const bytes = b64decode(b64);
    const n = Math.floor(bytes.length / 2);
    const buf = playCtx.createBuffer(1, n, 24000);
    const ch = buf.getChannelData(0);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < n; i++) ch[i] = view.getInt16(i * 2, true) / 32768;
    const src = playCtx.createBufferSource(); src.buffer = buf; src.connect(playCtx.destination);
    playAt = Math.max(playAt, playCtx.currentTime);
    src.start(playAt); playAt += buf.duration;
  }
  function sendText() {
    const t = textInput.value.trim();
    if (!t || !ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify({ realtimeInput: { text: t } }));
    logLine("Bạn", t);
    textInput.value = "";
  }
  sendBtn.addEventListener("click", sendText);
  textInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendText(); });

  async function startMic() {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    const srcNode = micCtx.createMediaStreamSource(micStream);
    const proc = micCtx.createScriptProcessor(4096, 1, 1);
    proc.onaudioprocess = (e) => {
      if (!ws || ws.readyState !== 1) return;
      const f = e.inputBuffer.getChannelData(0);
      const pcm = new Int16Array(f.length);
      for (let i = 0; i < f.length; i++) pcm[i] = Math.max(-32768, Math.min(32767, f[i] * 32768));
      ws.send(JSON.stringify({ realtimeInput: { audio: { data: b64encode(new Uint8Array(pcm.buffer)), mimeType: "audio/pcm;rate=16000" } } }));
    };
    srcNode.connect(proc); proc.connect(micCtx.destination);
  }

  async function endSession(note) {
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (micStream) { for (const t of micStream.getTracks()) t.stop(); micStream = null; }
    if (micCtx) { try { await micCtx.close(); } catch { /* da dong */ } micCtx = null; }
    if (playCtx) { try { await playCtx.close(); } catch { /* da dong */ } playCtx = null; }
    if (ws) { try { ws.close(); } catch { /* da dong */ } ws = null; }
    const usedMin = startedAt ? Math.max(1, Math.ceil((Date.now() - startedAt) / 60000)) : plannedMin;
    if (startedAt) {
      try {
        const r = await repo();
        await r.put("talkSessions", { id: "talk-" + startedAt, startedAt, mode: modeSel.value, minutesPlanned: plannedMin, minutesUsed: usedMin });
      } catch { /* ghi nhat ky that bai khong chan viec hoc */ }
    }
    startedAt = 0;
    sessStatus.textContent = note || "Phiên đã kết thúc. Nội dung hội thoại không được lưu, chỉ lưu thời lượng phiên.";
    endBtn.disabled = true; sendBtn.disabled = true;
    refresh();
  }
  endBtn.addEventListener("click", () => endSession());

  start.addEventListener("click", async () => {
    const base = await gatewayBase();
    plannedMin = Number(minSel.value);
    start.disabled = true;
    status.textContent = "Đang xin phiên từ Gateway...";
    let grant;
    try {
      const dev = await deviceId();
      const r = await fetch(base + "/talk/token", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: dev, minutes: plannedMin, consentVersion: CONSENT_VERSION, ageConfirmed: true }),
      });
      grant = await r.json();
      if (!r.ok) { status.textContent = grant.message || "Gateway từ chối cấp phiên."; start.disabled = false; return; }
    } catch { status.textContent = "Không nối được tới Gateway."; start.disabled = false; return; }

    sessionBox.hidden = false;
    log.replaceChildren(); aiLine = null;
    endBtn.disabled = false; sendBtn.disabled = false;
    sessStatus.textContent = "Đang nối tới AI...";
    ws = new WebSocket(grant.wsUrl + "?access_token=" + encodeURIComponent(grant.token));
    ws.onopen = async () => {
      const topic = topicInput.value.trim();
      ws.send(JSON.stringify({ setup: {
        model: grant.model,
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { languageCode: "en-GB" } },
        systemInstruction: { parts: [{ text: "You are an IELTS speaking practice partner. Speak only British English. Keep turns short, ask one question at a time, correct mistakes gently, never give a score or band." + (topic ? " Topic: " + topic : "") }] },
        inputAudioTranscription: {}, outputAudioTranscription: {},
      } }));
      sessStatus.textContent = "Đã nối. Bắt đầu nói hoặc gõ.";
      startedAt = Date.now();
      remainSec = plannedMin * 60;
      timer.textContent = "Còn " + plannedMin + ":00";
      timerId = setInterval(() => {
        remainSec -= 1;
        const m = Math.floor(Math.max(0, remainSec) / 60), s = Math.max(0, remainSec) % 60;
        timer.textContent = "Còn " + m + ":" + String(s).padStart(2, "0");
        if (remainSec <= 0) endSession("Hết thời lượng đã chọn. Phiên đã kết thúc, nội dung không được lưu.");
      }, 1000);
      if (modeSel.value === "voice") {
        try { await startMic(); } catch { sessStatus.textContent = "Không mở được micro. Bạn vẫn gõ chữ để trò chuyện được."; }
      }
    };
    ws.onmessage = async (ev) => {
      try {
        const raw = typeof ev.data === "string" ? ev.data : (ev.data instanceof Blob ? await ev.data.text() : "");
        if (!raw) return;
        const msg = JSON.parse(raw);
        const sc = msg.serverContent;
        if (!sc) return;
        if (sc.interrupted && playCtx) { playAt = playCtx.currentTime; }
        if (sc.inputTranscription && sc.inputTranscription.text) logLine("Bạn", sc.inputTranscription.text);
        if (sc.outputTranscription && sc.outputTranscription.text) {
          if (!aiLine) aiLine = logLine("AI", "");
          aiLine.lastChild.textContent += sc.outputTranscription.text;
        }
        const parts = (sc.modelTurn && sc.modelTurn.parts) || [];
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) playPcm24k(part.inlineData.data);
          if (part.text) { if (!aiLine) aiLine = logLine("AI", ""); aiLine.lastChild.textContent += part.text; }
        }
        if (sc.turnComplete) aiLine = null;
      } catch { /* bo qua khung la */ }
    };
    ws.onerror = () => { sessStatus.textContent = "Mất kết nối tới AI. Phiên dừng tại đây."; };
    ws.onclose = () => { if (startedAt) endSession("Kết nối đã đóng. Phiên kết thúc, nội dung không được lưu."); };
  });

  // --- The chien luoc cho cuoc noi chuyen voi nguoi that (17A.9, P10 sau) ---
  try {
    const talk = await loadContent("rule-cards-talk.json");
    main.append(el("h2", "Chuẩn bị cho cuộc nói chuyện với người thật"));
    main.append(el("p", "Phòng người thật chỉ dành cho người từ 18 tuổi trở lên và thuộc giai đoạn sau (P10)."));
    for (const c of talk.cards) {
      const card = el("div", null, "card");
      card.append(el("h3", c.title));
      const r = el("p", c.rule, "reading"); r.lang = "en"; card.append(r);
      main.append(card);
    }
    main.append(el("p", "Các thẻ này cũng nằm trong hàng ôn giãn cách ở mục Từ vựng."));
  } catch { /* tep the chien luoc do doi noi dung soan */ }
  main.append(el("p", "Dịch vụ bên thứ ba trong mục này: Google Gemini (giọng nói AI, gói miễn phí) và Cloudflare (Gateway). Điều khoản dữ liệu của gói miễn phí đã ghi ở mục Đồng ý phía trên."));

  const back = el("a", "Về hôm nay"); back.href = "today"; back.dataset.nav = "";
  main.append(back);
  paintConsent();
  refresh();
}
