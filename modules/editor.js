import { notify } from "./notify.js";
import {
  reloadShop,
  changeSection,
  sortCategoriesAlphabetically,
} from "../index.js";

const msg_success = "[✔️] Success";
const msg_err = "[❌] Error";
const debug = false;
let SELECTED_CAT;
let DEFAULT_ENTRIES;

document.addEventListener("DOMContentLoaded", async () => {
  DEFAULT_ENTRIES = await (await fetch("entries.json")).json();

  document.getElementById("editor_add").addEventListener("click", () => {
    if (SELECTED_CAT) {
      let product = prompt("Product Name");
      if (product.length > 0) {
        create_editor_product(SELECTED_CAT, product);
      }
    } else {
      notify({
        message: `You need to select a category. To select a category, click the category name.`,
        timeout: 5,
      });
    }
  });

  document.getElementById("editor_save").addEventListener("click", async () => {
    await parse_and_save_custom_list(false);
  });

  document.getElementById("editor_load").addEventListener("click", () => {
    load_custom_list();
  });

  document
    .getElementById("editor_reset")
    .addEventListener("click", async () => {
      if (confirm("Reset to factory default? Is this OK?") == true) {
        await parse_and_save_custom_list(true);
      }
    });

  document.getElementById("editor_leave").addEventListener("click", () => {
    reloadShop();
  });
});

function validate_selected_category(category) {
  if (SELECTED_CAT) {
    if (SELECTED_CAT !== category) {
      SELECTED_CAT.style.backgroundColor = "rgba(255, 255, 255, 0.25)"; // remove old selection
    }
  }
  if (category) {
    category.style.backgroundColor = "green";
    SELECTED_CAT = category;
  }
}

function create_editor_product(elem_category, item) {
  const elem_item = document.createElement("div");
  const elem_trash = document.createElement("div");
  const p = document.createElement("p");

  elem_item.id = `editor_${item}`;
  elem_item.classList.add("product");

  p.textContent = item;
  p.addEventListener("click", () => {
    //
  });

  elem_trash.textContent = "🗑️";
  elem_trash.addEventListener("click", () => {
    elem_item.remove();
  });

  elem_item.appendChild(elem_trash);
  elem_category.appendChild(elem_item);
  elem_item.appendChild(p);
}

export async function load_editor_categories() {
  document.getElementById("editor_content").innerHTML = "";

  // use custom list if exists, otherwise use default
  let entries_data;
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

    elem_category.addEventListener("click", () => {
      // when da category is clicked
      validate_selected_category(elem_category);
    });

    entries_data[category].forEach((item) => {
      debug && console.log(`- ${item}`);
      create_editor_product(elem_category, item);
    });

    document.getElementById("editor_content").appendChild(elem_category);
  }
}

export function load_custom_list() {
  console.log(
    "_________________________ LOAD COOKIE _________________________"
  );
  const CUSTOM_LIST = decodeURIComponent(document.cookie).split(";");
  for (let i = 0; i < CUSTOM_LIST.length; i++) {
    let cookie = CUSTOM_LIST[i].trim();
    if (cookie.indexOf("ShopCore=") === 0) {
      const jsonString = cookie.substring("ShopCore=".length, cookie.length);
      console.log(JSON.parse(jsonString));
      debug &&
        notify({
          message: `Load Operation: ${msg_success}`,
          timeout: 1,
        });
      return JSON.parse(jsonString);
    }
  }
}

async function parse_and_save_custom_list(reset) {
  let jsonData = {};
  console.log("RESET", reset);
  if (reset) {
    jsonData = DEFAULT_ENTRIES;
  } else {
    const categories = document.querySelectorAll(".sub_category");
    categories.forEach((category) => {
      jsonData[category.querySelector("h1").textContent] = [];
      const products = category.querySelectorAll("p");
      products.forEach((product) => {
        jsonData[category.querySelector("h1").textContent].push(
          product.textContent
        );
      });
    });
  }
  console.log(jsonData);
  console.log("_________________________ SAVING _________________________");
  document.cookie = `ShopCore=${encodeURIComponent(
    JSON.stringify(jsonData)
  )}; expires=${new Date(
    "Thu, 31 Dec 2099 23:59:59 GMT"
  ).toUTCString()}; path=/`;
  notify({
    message: `Save Operation: ${msg_success}`,
    timeout: 1,
  });
  await reloadShop();
}
