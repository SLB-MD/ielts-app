export function renderNotFound(root) {
  root.replaceChildren();
  const main = document.createElement("main");
  const h = document.createElement("h1");
  h.textContent = "Không có trang này.";
  const a = document.createElement("a");
  a.href = "today";
  a.dataset.nav = "";
  a.className = "cta-primary";
  a.dataset.cta = "primary";
  a.textContent = "Về hôm nay";
  main.append(h, a);
  root.append(main);
}
