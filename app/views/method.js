// /method — Muc 4: mot man, toi da 300 tu, moi y mot dong nguon (Phu luc A dac ta).
export function renderMethod(root) {
  root.replaceChildren();
  const main = document.createElement("main");
  const h = document.createElement("h1");
  h.textContent = "Vì sao app làm thế này?";
  const items = [
    ["App bắt bạn nhớ lại trước khi cho xem đáp án, vì việc tự nhớ lại giúp nhớ lâu hơn việc đọc lại. Nguồn: Roediger và Karpicke, 2006."],
    ["Thẻ quay lại đúng ngày đã hẹn, vì ôn cách quãng hiệu quả hơn ôn dồn. Nguồn: Cepeda và cộng sự, 2006."],
    ["App không cho band Writing và Speaking, vì không có người chấm thì con số đó không đáng tin."],
  ];
  for (const [text] of items) {
    const p = document.createElement("p");
    p.textContent = text;
    main.append(p);
  }
  main.prepend(h);
  const a = document.createElement("a");
  a.href = "today";
  a.dataset.nav = "";
  a.className = "cta-primary";
  a.dataset.cta = "primary";
  a.textContent = "Về hôm nay";
  main.append(a);
  root.append(main);
}
