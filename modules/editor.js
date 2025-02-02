import { notify } from "./notify.js";
import { reloadShop, sortCategoriesAlphabetically } from "../index.js";
import { changeSection, isDebug } from "./common.js";

const msg_success = "[✔️] Success";
const msg_err = "[❌] Error";
let SELECTED_CAT;
let DEFAULT_ENTRIES;
let IMPORTED_ENTRIES;
let custom_list;

document.addEventListener("DOMContentLoaded", async () => {
  DEFAULT_ENTRIES = await (await fetch("ShopCore.json")).json();

  document.getElementById("editor_add").addEventListener("click", () => {
    if (SELECTED_CAT) {
      let product = prompt("Product Name");
      if (product) {
        // null check
        if (product.length > 0) {
          create_editor_product(SELECTED_CAT, product);
        }
      }
    } else {
      notify({
        message: `You need to select a category. To select a category, click the category name.`,
        timeout: 5,
      });
    }
  });

  document.getElementById("editor_save").addEventListener("click", async () => {
    parse_and_save_custom_list("BUILD");
  });

  document.getElementById("editor_load").addEventListener("click", () => {
    load_custom_list();
  });

  document.getElementById("editor_export").addEventListener("click", () => {
    export_custom_list();
  });

  document.getElementById("editor_import").addEventListener("click", () => {
    import_custom_list();
  });

  document.getElementById("editor_reset").addEventListener("click", () => {
    if (confirm("Reset to factory default? Is this OK?")) {
      parse_and_save_custom_list("RESET");
    }
  });

  document.getElementById("editor_leave").addEventListener("click", () => {
    reloadShop();
    changeSection({
      id: "shop",
    });
  });
});

function import_custom_list() {
  const f = document.createElement("input");
  f.type = "file";
  f.id = "fileInput";
  f.accept = ".json";
  f.style.display = "none";
  document.body.appendChild(f);
  f.addEventListener("change", function (event) {
    if (event.target.files[0]) {
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          isDebug() && console.log(JSON.parse(e.target.result));
          IMPORTED_ENTRIES = JSON.parse(e.target.result);
          parse_and_save_custom_list("IMPORT");
        } catch (error) {
          console.error(error);
        }
      };
      reader.readAsText(event.target.files[0]);
    }
  });
  f.click();
  f.remove();
}

function export_custom_list() {
  console.log(custom_list);
  if (custom_list) {
    const blob = new Blob([JSON.stringify(custom_list, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "ShopCore.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function validate_selected_category(category) {
  if (SELECTED_CAT) {
    if (SELECTED_CAT !== category) {
      SELECTED_CAT.style.backgroundColor = "transparent"; // remove old selection
    }
  }
  if (category) {
    category.style.backgroundColor = "green";
    SELECTED_CAT = category;
  }
}

function create_editor_product(elem_category, item) {
  const elem_item = document.createElement("button");
  const elem_trash = document.createElement("div");
  const p = document.createElement("p");

  elem_item.id = `editor_${item}`;
  elem_item.classList.add("product");

  p.textContent = item;
  p.addEventListener("click", () => {
    //
  });

  elem_trash.classList.add("trash");
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
  custom_list = load_custom_list();
  if (custom_list) {
    entries_data = sortCategoriesAlphabetically(custom_list);
  } else {
    entries_data = DEFAULT_ENTRIES;
  }

  for (const category in entries_data) {
    // isDebug() && console.log(`Category: ${category}`);

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
      // isDebug() && console.log(`- ${item}`);
      create_editor_product(elem_category, item);
    });

    document.getElementById("editor_content").appendChild(elem_category);
  }
}

export function load_custom_list() {
  console.log(
    "_________________________ LOAD COOKIE _________________________"
  );
  const LIST = decodeURIComponent(document.cookie).split(";");
  for (let i = 0; i < LIST.length; i++) {
    let cookie = LIST[i].trim();
    if (cookie.indexOf("ShopCore=") === 0) {
      const compressedString = cookie.substring(
        "ShopCore=".length,
        cookie.length
      );
      const jsonString =
        LZString.decompressFromEncodedURIComponent(compressedString);
      if (!jsonString) return null; // Handle potential decompression failure
      isDebug() && console.log(JSON.parse(jsonString));
      isDebug() &&
        notify({
          message: `Load Operation: ${msg_success}`,
          timeout: 1,
        });
      return JSON.parse(jsonString);
    }
  }
  return null; // Return null if no valid cookie is found
}

function parse_and_save_custom_list(operation) {
  let jsonData = {};
  switch (operation) {
    case "RESET":
      isDebug() &&
        notify({
          message: `Reset List`,
          timeout: 1,
        });
      jsonData = DEFAULT_ENTRIES;
      break;
    case "IMPORT":
      isDebug() &&
        notify({
          message: `Import List`,
          timeout: 1,
        });
      jsonData = IMPORTED_ENTRIES;
      break;
    case "BUILD":
      isDebug() &&
        notify({
          message: `Build List`,
          timeout: 1,
        });
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
      break;
    default:
      console.error("No operation ?");
  }
  isDebug() && console.log(jsonData);
  console.log("_________________________ SAVING _________________________");

  const compressed = LZString.compressToEncodedURIComponent(
    JSON.stringify(jsonData)
  );

  document.cookie = `ShopCore=${compressed}; expires=${new Date(
    "Thu, 31 Dec 2099 23:59:59 GMT"
  ).toUTCString()}; path=/`;

  notify({
    message: `Save Operation: ${msg_success}`,
    timeout: 1,
  });
  reloadShop();
  changeSection({
    id: "shop",
  });
}
