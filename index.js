import { isMobileDevice } from "../modules/device.js";
import { notify } from "../modules/notify.js";

const msg_success = "[✔️] Success";
const msg_err = "[❌] Error";

let loading_screen;
let cd = false;
let total_network_usage = 0;
let debug = document.URL === "http://127.0.0.1:5500/";
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

function sortCategoriesAlphabetically(data) {
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

function update_basket(product, quantity) {
  const basket_content = document.getElementById("basket_content");

  document.getElementById(`shop_${product}`).style.backgroundColor = "green";

  if (document.getElementById(`basket_${product}`)) {
    // prevent duplicates
    document.getElementById(`basket_${product}`).remove();
  }

  const item = document.createElement("div");
  const p = document.createElement("p");
  item.id = `basket_${product}`;
  item.classList.add("typical_container", "basket_content_product");
  p.textContent = `${product} x${quantity}`;

  item.addEventListener("click", () => {
    item.remove();
    check_empty_basket();
    document.getElementById(`shop_${product}`).style.backgroundColor =
      "rgba(0, 0, 0, 0.5)";
  });

  item.appendChild(p);
  basket_content.appendChild(item);

  check_empty_basket();
}

async function load_dynamic_categories() {
  try {
    const site_json = await fetch("site.json");
    const entries_json = await fetch("entries.json");

    const site_data = await site_json.json();
    entries_data = sortCategoriesAlphabetically(await entries_json.json());

    document.title = site_data[0].product;

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
          update_basket(item, 0);
          update_basket(item, event.target.value);
        });

        p.textContent = item;
        p.addEventListener("click", () => {
          update_basket(item, 1);
        });

        elem_item.appendChild(quantity);
        elem_category.appendChild(elem_item);
        elem_item.appendChild(p);
      });

      document.getElementById("categories").appendChild(elem_category);
    }
  } catch (error) {
    console.error("Error fetching JSON file:", error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  loading_screen = document.getElementById("loading-screen");

  cast_loading_screen(true);

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

  await load_dynamic_categories();
  check_empty_basket();
  cast_loading_screen(false);
});
