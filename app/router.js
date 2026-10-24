// Router History API — Muc 22.2. Base path doc tu the <base>.
export function basePath() {
  const base = document.querySelector("base")?.getAttribute("href") || "./";
  return new URL(base, location.href).pathname;
}

const routes = [];
export function route(pattern, handler) {
  const keys = [];
  const regex = new RegExp(
    "^" + pattern.replace(/:[^/]+/g, (m) => { keys.push(m.slice(1)); return "([^/]+)"; }) + "$"
  );
  routes.push({ regex, keys, handler });
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
