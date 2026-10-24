// /welcome — Muc 19.1: mot cau hoi duy nhat, mot CTA chinh.
export function renderWelcome(root) {
  root.replaceChildren();
  const main = document.createElement("main");
  const h = document.createElement("h1");
  h.textContent = "Bạn học để làm gì, mỗi ngày bao lâu?";
  const p = document.createElement("p");
  p.textContent = "Dữ liệu nằm trên máy bạn.";
  const a = document.createElement("a");
  a.href = "today";
  a.dataset.nav = "";
  a.className = "cta-primary";
  a.dataset.cta = "primary";
  a.textContent = "Tiếp tục";
  main.append(h, p, a);
  root.append(main);
}
