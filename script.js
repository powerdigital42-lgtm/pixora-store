
/* PIXORA — Live products from Supabase */

const SUPABASE_URL = "https://wgaqjdellsvkseqdrlco.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ehhXQXJnuyFc5gy5tcWqcg_l-2lVjUX";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const langButton = document.querySelector("#lang");
const menuButton = document.querySelector("#menu");
const nav = document.querySelector("#nav");
const dialog = document.querySelector("#dialog");
const grid = document.querySelector(".grid");
const status = document.querySelector(".warning");

let language = "en";
let products = [];
let activeFilter = "all";

const categories = {
  files: { en: "Digital files", ar: "ملفات رقمية" },
  design: { en: "Design & templates", ar: "التصميم والقوالب" },
  ai: { en: "AI resources", ar: "موارد الذكاء الاصطناعي" }
};

function setLanguage(next) {
  language = next;
  document.documentElement.lang = next;
  document.documentElement.dir = next === "ar" ? "rtl" : "ltr";

  langButton.textContent = next === "ar" ? "English" : "العربية";

  document.querySelectorAll("[data-en][data-ar]").forEach(el => {
    el.innerHTML = el.dataset[next];
  });

  renderProducts();
}

langButton.addEventListener("click", () => {
  setLanguage(language === "en" ? "ar" : "en");
});

function makeElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function formatPrice(product) {
  const amount = Number(product.price);

  if (!Number.isFinite(amount)) return "";

  try {
    return new Intl.NumberFormat(
      language === "ar" ? "ar-DZ" : "en-US",
      {
        style: "currency",
        currency: product.currency || "USD"
      }
    ).format(amount);
  } catch {
    return amount + " " + (product.currency || "");
  }
}

function showDetails(product) {
  document.querySelector("#dialog-title").textContent =
    language === "ar"
      ? (product.title_ar || product.title_en)
      : (product.title_en || product.title_ar);

  document.querySelector("#dialog-text").textContent =
    language === "ar"
      ? (product.description_ar || product.description_en || "")
      : (product.description_en || product.description_ar || "");

  dialog.showModal();
}

function renderProducts() {
  grid.replaceChildren();

  products.forEach(product => {
    const card = makeElement("article", "product");
    card.dataset.category = product.category || "files";

    const visual = makeElement(
      "div",
      "visual " + (categories[product.category] ? product.category : "files")
    );

    visual.appendChild(
      makeElement("small", "", "PIXORA / DIGITAL")
    );

    if (product.image_path) {
      const imageUrl = db.storage
        .from("pixora-images")
        .getPublicUrl(product.image_path).data.publicUrl;

      if (imageUrl) {
        const image = makeElement("img");
        image.src = imageUrl;
        image.alt = product.title_en || "PIXORA product";
        image.loading = "lazy";
        image.style.cssText =
          "width:100%;height:100%;object-fit:cover;position:absolute;inset:0;";
        visual.appendChild(image);
      }
    }

    visual.appendChild(
      makeElement(
        "label",
        "",
        categories[product.category]?.[language] ||
          (language === "ar" ? "منتج رقمي" : "Digital product")
      )
    );

    const body = makeElement("div", "pbody");

    body.appendChild(
      makeElement(
        "small",
        "",
        categories[product.category]?.[language] || "Digital product"
      )
    );

    body.appendChild(
      makeElement(
        "h3",
        "",
        language === "ar"
          ? (product.title_ar || product.title_en)
          : (product.title_en || product.title_ar)
      )
    );

    body.appendChild(
      makeElement(
        "p",
        "",
        language === "ar"
          ? (product.description_ar || product.description_en || "")
          : (product.description_en || product.description_ar || "")
      )
    );

    body.appendChild(
      makeElement("strong", "product-price", formatPrice(product))
    );

    const details = makeElement(
      "button",
      "details",
      language === "ar" ? "تفاصيل المنتج ←" : "Product details ↗"
    );

    details.type = "button";
    details.addEventListener("click", () => showDetails(product));

    body.appendChild(details);
    card.append(visual, body);
    grid.appendChild(card);
  });

  applyFilter();
}

function applyFilter() {
  grid.querySelectorAll(".product").forEach(card => {
    card.hidden =
      activeFilter !== "all" &&
      card.dataset.category !== activeFilter;
  });
}

document.querySelectorAll(".filters button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filters button").forEach(btn => {
      btn.classList.remove("active");
    });

    button.classList.add("active");
    activeFilter = button.dataset.filter;
    applyFilter();
  });
});

async function loadProducts() {
  status.textContent =
    language === "ar" ? "جارٍ تحميل المنتجات..." : "Loading products...";

  try {
    const { data, error } = await db
      .from("products")
      .select(
        "id,title_en,title_ar,description_en,description_ar,category,price,currency,image_path,is_published,created_at"
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    products = data || [];
    renderProducts();

    status.textContent = products.length
      ? (
          language === "ar"
            ? "المنتجات المنشورة والمتاحة حاليًا."
            : "Published products available now."
        )
      : (
          language === "ar"
            ? "لا توجد منتجات منشورة حاليًا."
            : "No published products yet."
        );

  } catch (error) {
    console.error("PIXORA error:", error);

    status.textContent =
      language === "ar"
        ? "تعذر تحميل المنتجات. يرجى تحديث الصفحة."
        : "Unable to load products. Please refresh the page.";
  }
}

document.querySelector("#close").addEventListener("click", () => {
  dialog.close();
});

document.querySelector("#ok").addEventListener("click", () => {
  dialog.close();
});

dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});

menuButton.addEventListener("click", () => {
  nav.classList.toggle("open");
});

nav.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => nav.classList.remove("open"));
});

loadProducts();
