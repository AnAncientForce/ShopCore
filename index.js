import { isMobileDevice } from "../modules/device.js";
import { notify } from "../modules/notify.js";

const msg_success = "[✔️] Success";
const msg_err = "[❌] Error";

let loading_screen;
let cd = false;
let total_network_usage = 0;
let debug = document.URL === "http://127.0.0.1:5500/";
let basket = [];
let entries_data;

function array_remove_if_exists(array, itemName) {
  const index = array.indexOf(itemName);
  if (index !== -1) {
    array.splice(index, 1);
    return true;
  }
  return false;
}

function track_network_usage(elem) {
  // https://stackoverflow.com/questions/28430115/javascript-get-size-in-bytes-from-html-img-src/45409613#45409613
  fetch(elem)
    .then((r) => r.blob())
    .then((blob) => {
      const sizeInMB = blob.size / (1024 * 1024);
      debug && console.log("Blob size:", sizeInMB.toFixed(2), "MB");
      total_network_usage += sizeInMB;
    });
}

function cooldown(duration) {
  cd = !cd;
  setTimeout(function () {
    cd = !cd;
  }, duration);
}

function cast_loading_screen(state) {
  if (loading_screen) {
    if (state) {
      loading_screen.classList.add("on");
    } else {
      loading_screen.classList.remove("on");
    }
  } else {
    console.error("Loading screen element not found.");
  }
}

async function load_dynamic_categories() {
  try {
    const site_json = await fetch("site.json");
    const entries_json = await fetch("entries.json");

    const site_data = await site_json.json();
    entries_data = await entries_json.json();

    document.title = site_data[0].author;

    for (const category in entries_data) {
      debug && console.log(`Category: ${category}`);

      const elem_category = document.createElement("div");
      const elem_category_title = document.createElement("h1");

      elem_category_title.textContent = category;

      elem_category.classList.add("sub_category");
      elem_category.appendChild(elem_category_title);

      entries_data[category].forEach((item) => {
        debug && console.log(`- ${item}`);
        const p = document.createElement("p");
        p.textContent = item;

        p.addEventListener("click", () => {
          p.style.backgroundColor =
            p.style.backgroundColor == "green"
              ? "rgba(255, 255, 255, 0.5)"
              : "green";
          update_basket(item);
        });

        elem_category.appendChild(p);
      });

      document.getElementById("categories").appendChild(elem_category);
    }
  } catch (error) {
    console.error("Error fetching JSON file:", error);
  }
}

function update_basket(product) {
  const basket_content = document.getElementById("basket_content");
  const exists = array_remove_if_exists(basket, product);
  if (!exists) {
    basket.push(product);
    debug && console.log(`added ${product}`);
  } else {
    debug && console.log(`removed ${product}`);
  }

  basket_content.innerHTML = "";
  for (let i = 0; i < basket.length; i++) {
    const item = document.createElement("div");
    const p = document.createElement("p");
    item.classList.add("typical_container", "basket_content_product");
    p.textContent = basket[i];

    item.addEventListener("click", () => {
      update_basket(basket[i]);
    });

    item.appendChild(p);
    basket_content.appendChild(item);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  loading_screen = document.getElementById("loading-screen");

  cast_loading_screen(true);

  document.getElementById("copy").addEventListener("click", () => {
    if (basket.length == 0) {
      notify({
        message: `Your basket is empty.`,
        timeout: 2,
      });
      return;
    }

    // sort
    let tmp = [];
    for (const category in entries_data) {
      entries_data[category].forEach((core_product) => {
        // check if basket has core_product
        basket.forEach((basket_product) => {
          if (core_product === basket_product) {
            tmp.push(basket_product);
          }
        });
      });
    }

    navigator.clipboard
      .writeText(tmp.join("\n"))
      .then(() => {
        notify({
          message: `Basket copied to clipboard!`,
          timeout: 5,
        });
      })
      .catch((error) => {
        notify({
          message: error,
          timeout: 5,
        });
      });
  });

  document.addEventListener("keydown", (event) => {
    switch (event.key) {
      case "p":
        notify({
          message: `${total_network_usage.toFixed(2)} MB`,
          timeout: 2,
        });
        break;
    }
  });

  window.addEventListener("resize", function () {
    if (debug && isMobileDevice()) {
      if (!cd) {
        notify({
          message: "Adapted resolution for mobile",
          timeout: 2,
        });
        cooldown(5000);
      }
    }
  });

  await load_dynamic_categories();
  cast_loading_screen(false);
});
