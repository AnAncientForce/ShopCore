export function isDebug() {
  let stop = false;
  return !stop && document.URL.includes("http://127.0.0.1:5500/");
}
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
