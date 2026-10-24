// GitHub Pages khong co fallback cho duong dan sau (Muc 22.2):
// luu duong dan goc, quay ve index, router doc lai va dieu huong dung cho.
sessionStorage.setItem("spa:redirect", location.pathname + location.search + location.hash);
location.replace(new URL("./", location.href).href);
