import { changeSection, isDebug, delay } from "./common.js";
import { screen_dim } from "../index.js";

export async function splash() {
  if (!isDebug()) {
    let phase = "ShopCore";
    let toggle = true;
    for (let i = 0; i < phase.length; i++) {
      const h1 = document.createElement("h1");
      document.getElementById("splash").appendChild(h1);
      h1.textContent = phase[i];
      h1.classList.add("splash_txt");
      toggle ? h1.classList.add("slide_L") : h1.classList.add("slide_R");
      toggle = !toggle;

      await delay(250);
    }
  }
  screen_dim().then(() => {
    changeSection({
      id: "shop",
    });
    screen_dim();
  });
}
