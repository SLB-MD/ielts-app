// Router History API — Muc 22.2. Base path doc tu the <base>.
// QUAN TRONG: base phai tinh MOT LAN luc module nap, khi URL con la URL vao.
// Neu tinh lai sau pushState, <base href="./"> se phan giai theo thu muc cua
// route hien tai (vd /learn/) va moi route hai doan se lech khop.
const BASE_PATH = (() => {
  const base = document.querySelector("base")?.getAttribute("href") || "./";
  return new URL(base, location.href).pathname;
})();
export function basePath() {
  return BASE_PATH;
}

const routes = [];
export function route(pattern, handler) {
  if (pattern === "*") {
    routes.push({ pattern, regex: null, keys: [], handler });
    return;
  }
  const keys = [];
  const regex = new RegExp(
    "^" + pattern.replace(/:[^/]+/g, (m) => { keys.push(m.slice(1)); return "([^/]+)"; }) + "$"
  );
  routes.push({ pattern, regex, keys, handler });
}

export function currentPath() {
  const saved = sessionStorage.getItem("spa:redirect");
  if (saved) {
    sessionStorage.removeItem("spa:redirect");
    history.replaceState(null, "", saved);
  }
  const base = basePath();
  let path = location.pathname;
  if (base !== "/" && path.startsWith(base)) path = "/" + path.slice(base.length);
  return path || "/";
}

export function navigate(path) {
  history.pushState(null, "", basePath().replace(/\/$/, "") + path);
  dispatch();
}

function dispatch() {
  const path = currentPath();
  for (const r of routes) {
    if (!r.regex) continue;
    const m = r.regex.exec(path);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      r.handler(params);
      return;
    }
  }
  const fallback = routes.find((r) => r.pattern === "*");
  if (fallback) fallback.handler({});
}

export function startRouter(onNotFound) {
  route("*", onNotFound);
  window.addEventListener("popstate", dispatch);
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-nav]");
    if (!a) return;
    e.preventDefault();
    const u = new URL(a.href);
    navigate((u.pathname.replace(basePath().replace(/\/$/, ""), "") || "/") + u.search);
  });
  dispatch();
}
