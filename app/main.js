import { route, startRouter } from "./router.js";
import { renderWelcome } from "./views/welcome.js";
import { renderToday } from "./views/today.js";
import { renderMethod } from "./views/method.js";
import { renderNotFound } from "./views/not-found.js";
import { renderPlacement, renderPlacementResult } from "./views/placement.js";
import { renderLearn } from "./views/learn.js";
import { renderVocab } from "./views/vocab.js";
import { renderProgress } from "./views/progress.js";
import { renderSettings } from "./views/settings.js";
import { renderErrors } from "./views/errors.js";
import { renderPractice, renderPracticeSession } from "./views/practice.js";
import { renderTestHome, renderTest, renderTestResult } from "./views/test.js";
import { renderRepair, renderVerify } from "./views/repair.js";
import { renderWrite } from "./views/write.js";
import { renderSpeak } from "./views/speak.js";
import { renderTalk } from "./views/talk.js";
import { getSetting } from "./state.js";

const root = document.getElementById("app");

route("/welcome", () => renderWelcome(root));
route("/", () => renderToday(root));
route("/today", () => renderToday(root));
route("/placement", () => renderPlacement(root));
route("/placement/result", () => renderPlacementResult(root));
route("/learn/:unitId", (params) => renderLearn(root, params));
route("/vocab", () => renderVocab(root));
route("/progress", () => renderProgress(root));
route("/settings", () => renderSettings(root));
route("/errors", () => renderErrors(root));
route("/practice", () => renderPractice(root));
route("/practice/session", () => renderPracticeSession(root));
route("/test", () => renderTestHome(root));
route("/test/:id/result", () => renderTestResult(root));
route("/test/:id", (params) => renderTest(root, params));
route("/repair/:tag", (params) => renderRepair(root, params));
route("/verify/:tag", (params) => renderVerify(root, params));
route("/write", () => renderWrite(root));
route("/speak", () => renderSpeak(root));
route("/talk", () => renderTalk(root));
route("/method", () => renderMethod(root));
startRouter(() => renderNotFound(root));

getSetting("theme", "light").then((t) => {
  if (t === "dark") document.documentElement.dataset.theme = "dark";
}).catch(() => {});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
