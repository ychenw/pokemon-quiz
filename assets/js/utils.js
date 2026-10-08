export const fmt = (n) => {
  const sec = Math.floor(n / 1000);
  return String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
};
export const norm = (s) =>
  s
    .normalize("NFKC")
    .replace(/[\s.’']/g, "")
    .toLowerCase();
