import { isMobileDevice } from "../modules/device.js";
import { notify } from "../modules/notify.js";
import { splash } from "../modules/splash.js";
import { load_editor_categories, load_custom_list } from "./modules/editor.js";
import { changeSection } from "./modules/common.js";

let loading_screen;
let cd = false;
let debug = document.URL === "http://127.0.0.1:5500/";
let entries_data;
let SITE;
let DEFAULT_ENTRIES;
let LAST_SELECTED_PRODUCT;
let LAST_AUTO_SELECTED_SHOP_PRODUCT;

export function screen_dim() {
  document.getElementById("black-overlay").classList.toggle("off");
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 0.5 * 1000);
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
  if (document.querySelectorAll("#basket_content button p").length === 0) {
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
    check_empty_basket();

    document
      .getElementById(`shop_${args.product}`)
      .querySelector("p").style.color = "white";

    if (args.quantity === 1) {
      /*
      If the quantity is 1, the product was toggled, so toggle between adding it and removing it.
      If the quantity is > 1, the same product was added but with a different quantity was added, so continue.
      */
      return;
    }
  }

  document
    .getElementById(`shop_${args.product}`)
    .querySelector("p").style.color = "yellowgreen";

  const item = document.createElement("button");
  const p = document.createElement("p");
  item.id = `basket_${args.product}`;
  item.classList.add("basket_content_product", "rounded");

  if (args.quantity > 1) {
    // null check
    p.textContent = `${args.product} x${args.quantity}`;
  } else {
    p.textContent = `${args.product}`;
  }

  item.addEventListener("click", () => {
    item.remove();
    check_empty_basket();
    document
      .getElementById(`shop_${args.product}`)
      .querySelector("p").style.color = "white";
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
    // debug && console.log(`Category: ${category}`);
    const elem_category = document.createElement("div");
    const elem_category_title = document.createElement("h1");

    elem_category_title.textContent = category;

    elem_category.classList.add("sub_category");
    elem_category.appendChild(elem_category_title);

    entries_data[category].forEach((item) => {
      // debug && console.log(`- ${item}`);

      const elem_shell = document.createElement("div");
      const elem_item = document.createElement("div");
      const p = document.createElement("p");
      const quantity = document.createElement("input");

      elem_shell.classList.add("elem_shell", "row");

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
      elem_item.addEventListener("click", () => {
        update_basket({
          product: item,
          quantity: 1,
        });
      });

      elem_item.appendChild(p);
      elem_shell.appendChild(quantity);
      elem_shell.appendChild(elem_item);
      elem_category.appendChild(elem_shell);
    });

    document.getElementById("categories").appendChild(elem_category);
  }
}

export async function reloadShop() {
  cast_loading_screen(true);
  // document.getElementById("welcome").style.display = "";
  await load_dynamic_categories();
  check_empty_basket();
  cast_loading_screen(false);
}

function GET_LIST() {
  if (check_empty_basket()) {
    return;
  }

  // sort
  const products = document.querySelectorAll("#basket_content button p");
  let tmp = [];
  for (const category in entries_data) {
    entries_data[category].forEach((core_product) => {
      products.forEach((p) => {
        if (p.textContent === core_product) {
          if (!tmp.some((product) => product === core_product)) {
            tmp.push(p.textContent);
          }
        }
      });
    });
  }

  return tmp.join("\n");
}

document.addEventListener("DOMContentLoaded", async () => {
  changeSection({
    id: "splash",
  });
  screen_dim().then(() => {
    splash();
  });

  loading_screen = document.getElementById("loading-screen");
  SITE = await (await fetch("site.json")).json();
  DEFAULT_ENTRIES = await (await fetch("ShopCore.json")).json();
  document.title = SITE[0].product;

  // dump changelog
  for (const change in SITE[0].changelog) {
    const p = document.createElement("p");
    p.innerHTML = `${change}<br>${SITE[0].changelog[change]}`;
    document.getElementById("changelog-content").appendChild(p);
  }

  document
    .getElementById("lookup")
    .addEventListener("animationend", function () {
      this.classList.remove("play");
    });

  document.getElementById("changelog").addEventListener("click", () => {
    changeSection({
      id: "changelog-guide",
    });
  });

  document.getElementById("copy").addEventListener("click", () => {
    navigator.clipboard
      .writeText(GET_LIST())
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

  document.getElementById("print").addEventListener("click", () => {
    // document.getElementById("welcome").style.display = "none";
    document.getElementById("PRINT_LIST_CONTENT").innerText = GET_LIST();
    changeSection({
      id: "print",
    });
    print();
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

  document.getElementById("shop-handbook").addEventListener("click", () => {
    changeSection({
      id: "shop-guide",
    });
  });

  document.getElementById("editor-handbook").addEventListener("click", () => {
    changeSection({
      id: "editor-guide",
    });
  });

  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("page_leave")) {
      changeSection({
        id: e.target.getAttribute("data-custom"),
      });
    }
  });

  document
    .getElementById("product_search")
    .addEventListener("input", function (event) {
      let search_query = event.target.value.toLowerCase();
      searchLoop: for (const category in entries_data) {
        for (let item of entries_data[category]) {
          if (item.toLowerCase().startsWith(search_query)) {
            debug && console.log("found:", item);
            LAST_AUTO_SELECTED_SHOP_PRODUCT = item;
            item = document.getElementById(`shop_${item}`);
            item.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "nearest",
              offsetTop: 200,
            });
            item.focus();
            item.style.animation = "search_highlight 1s forwards";
            setTimeout(() => {
              item.style.animation = "";
            }, 1000);
            break searchLoop;
          }
        }
      }
    });

  document
    .getElementById("product_search")
    .addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        if (LAST_AUTO_SELECTED_SHOP_PRODUCT) {
          update_basket({
            product: LAST_AUTO_SELECTED_SHOP_PRODUCT,
            quantity: 1,
          });
          LAST_AUTO_SELECTED_SHOP_PRODUCT = null;
        }
        event.target.value = "";
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
