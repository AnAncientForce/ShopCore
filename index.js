import { isMobileDevice } from "../modules/device.js";
import { notify } from "../modules/notify.js";
import { load_editor_categories, load_custom_list } from "./modules/editor.js";

const msg_success = "[✔️] Success";
const msg_err = "[❌] Error";

let loading_screen;
let cd = false;
let total_network_usage = 0;
let debug = document.URL === "http://127.0.0.1:5500/";
let entries_data;
let SITE;
let DEFAULT_ENTRIES;
let LAST_SELECTED_PRODUCT;

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

export function sortCategoriesAlphabetically(data) {
  const tmp = {};
  for (const category in data) {
    tmp[category] = data[category].slice().sort((a, b) => a.localeCompare(b));
  }
  return tmp;
}

function check_empty_basket() {
  const basket_status = document.getElementById("basket_status");
  if (document.querySelectorAll("#basket_content div p").length === 0) {
    basket_status.textContent = "Your basket is empty!";
  } else {
    basket_status.textContent = "";
  }
}

function update_basket(args) {
  if (!args?.product || !args?.quantity) {
    console.error("missing args");
    return;
  }
  const basket_content = document.getElementById("basket_content");

  if (document.getElementById(`basket_${args.product}`)) {
    // remove if exists
    document.getElementById(`basket_${args.product}`).remove();
    document.getElementById(`shop_${args.product}`).style.backgroundColor =
      "rgba(0, 0, 0, 0.5)";

    if (args.quantity === 1) {
      /*
      If the quantity is 1, the product was toggled, so toggle between adding it and removing it.
      If the quantity is > 1, the same product was added but with a different quantity was added, so continue.
      */
      return;
    }
  }

  document.getElementById(`shop_${args.product}`).style.backgroundColor =
    "green";

  const item = document.createElement("div");
  const p = document.createElement("p");
  item.id = `basket_${args.product}`;
  item.classList.add("typical_container", "basket_content_product");

  if (args.quantity > 1) {
    // null check
    p.textContent = `${args.product} x${args.quantity}`;
  } else {
    p.textContent = `${args.product}`;
  }

  item.addEventListener("click", () => {
    item.remove();
    check_empty_basket();
    document.getElementById(`shop_${args.product}`).style.backgroundColor =
      "rgba(0, 0, 0, 0.5)";
  });

  item.appendChild(p);
  basket_content.appendChild(item);

  // Lookup
  LAST_SELECTED_PRODUCT = args?.product;
  document.getElementById("lookup").classList.add("play");

  check_empty_basket();
}

async function load_dynamic_categories() {
  document.getElementById("categories").innerHTML = "";

  // use custom list if exists, otherwise use default
  const custom_list = load_custom_list();
  if (custom_list) {
    entries_data = sortCategoriesAlphabetically(custom_list);
  } else {
    entries_data = DEFAULT_ENTRIES;
  }

  for (const category in entries_data) {
    debug && console.log(`Category: ${category}`);

    const elem_category = document.createElement("div");
    const elem_category_title = document.createElement("h1");

    elem_category_title.textContent = category;

    elem_category.classList.add("sub_category");
    elem_category.appendChild(elem_category_title);

    entries_data[category].forEach((item) => {
      debug && console.log(`- ${item}`);
      const elem_item = document.createElement("div");
      const p = document.createElement("p");
      const quantity = document.createElement("input");

      elem_item.id = `shop_${item}`;
      elem_item.classList.add("product");
      quantity.type = "number";
      quantity.min = 1;
      quantity.max = 1000;
      quantity.step = 1;
      quantity.value = 1;

      quantity.addEventListener("input", function (event) {
        elem_item.setAttribute("quantity", event.target.value); // inject the quantity into the element directly
        update_basket({
          product: item,
          quantity: event.target.value,
        });
      });

      p.textContent = item;
      p.addEventListener("click", () => {
        update_basket({
          product: item,
          quantity: 1,
        });
      });

      elem_item.appendChild(quantity);
      elem_category.appendChild(elem_item);
      elem_item.appendChild(p);
    });

    document.getElementById("categories").appendChild(elem_category);
  }
}

export async function reloadShop() {
  cast_loading_screen(true);
  await load_dynamic_categories();
  check_empty_basket();
  changeSection({
    id: "shop",
  });
  cast_loading_screen(false);
}

document.addEventListener("DOMContentLoaded", async () => {
  loading_screen = document.getElementById("loading-screen");
  SITE = await (await fetch("site.json")).json();
  DEFAULT_ENTRIES = await (await fetch("entries.json")).json();
  document.title = SITE[0].product;

  document
    .getElementById("lookup")
    .addEventListener("animationend", function () {
      this.classList.remove("play");
    });

  document.getElementById("copy").addEventListener("click", () => {
    if (check_empty_basket()) {
      return;
    }
    // sort
    const products = document.querySelectorAll("#basket_content div p");
    let tmp = [];
    for (const category in entries_data) {
      entries_data[category].forEach((core_product) => {
        products.forEach((p) => {
          if (p.textContent.includes(core_product)) {
            tmp.push(p.textContent);
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

  document.getElementById("editor").addEventListener("click", async () => {
    cast_loading_screen(true);
    await load_editor_categories();
    changeSection({
      id: "editor",
    });
    cast_loading_screen(false);
  });

  document.getElementById("lookup").addEventListener("click", () => {
    if (LAST_SELECTED_PRODUCT) {
      window.open(
        `https://duckduckgo.com/?q=${encodeURIComponent(
          LAST_SELECTED_PRODUCT
        )}&iax=images&ia=images`,
        "_blank"
      );
    }
  });

  document.addEventListener("keydown", (event) => {
    switch (event.key) {
      case "p":
        notify({
          message: `${total_network_usage.toFixed(2)} MB`,
          timeout: 2,
        });
        break;
      case "h":
        changeSection({
          id: "editor",
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

  window.onerror = function (message, source, lineno, colno, error) {
    notify({
      message: `An error occurred:
        \nMessage: ${message}
        \nSource: ${source}
        \nLine: ${lineno}
        \nColumn: ${colno}
        \nError object: ${error ? error.stack : "N/A"}`,
      timeout: 300,
    });
  };

  await reloadShop();
});
