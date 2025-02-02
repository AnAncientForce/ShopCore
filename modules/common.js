export function isDebug() {
  let stop = false;
  return !stop && document.URL.includes("http://127.0.0.1:5500/");
}
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function changeSection(args) {
  const sections = document.querySelectorAll("section");
  sections.forEach((section) => {
    if (section.tagName === "SECTION") {
      if (args?.id) {
        if (section.id === args?.id) {
          section.style.display = "block";
        } else {
          section.style.display = "none";
        }
      }
    }
  });
}
