
/* =========================================
   PIXORA — PREMIUM STORE
   Live products + Product details + Orders
========================================= */

const SUPABASE_URL = "https://wgaqjdellsvkseqdrlco.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ehhXQXJnuyFc5gy5tcWqcg_l-2lVjUX";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

/* =========================================
   PAGE ELEMENTS
========================================= */

const langButton = document.querySelector("#lang");
const menuButton = document.querySelector("#menu");
const nav = document.querySelector("#nav");

const dialog = document.querySelector("#dialog");
const grid = document.querySelector(".grid");
const status = document.querySelector(".warning");

const emailInput = document.querySelector("#customer-email");
const buyButton = document.querySelector("#buy");
const orderStatus = document.querySelector("#order-status");

const dialogImage = document.querySelector("#dialog-image");
const detailVisual = document.querySelector("#detail-visual");
const detailPlaceholder = document.querySelector("#detail-placeholder");
const dialogCategory = document.querySelector("#dialog-category");
const dialogTitle = document.querySelector("#dialog-title");
const dialogText = document.querySelector("#dialog-text");
const dialogPrice = document.querySelector("#dialog-price");

let language = document.documentElement.lang === "ar" ? "ar" : "en";
let products = [];
let activeFilter = "all";
let activeProduct = null;

const categories = {
  files: {
    en: "Digital files",
    ar: "ملفات رقمية"
  },
  design: {
    en: "Design & templates",
    ar: "التصميم والقوالب"
  },
  ai: {
    en: "AI resources",
    ar: "موارد الذكاء الاصطناعي"
  }
};

/* =========================================
   TYPOGRAPHY
========================================= */

function applyTypography() {
  const font = language === "ar"
    ? '"Cairo", Tahoma, Arial, sans-serif'
    : '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif';

  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";

  document.body.style.setProperty(
    "font-family",
    font,
    "important"
  );

  document.querySelectorAll("body *").forEach(element => {
    element.style.setProperty(
      "font-family",
      font,
      "important"
    );
  });

  if (document.fonts && document.fonts.load) {
    document.fonts.load(
      language === "ar"
        ? '400 16px "Cairo"'
        : '400 16px "Inter"'
    ).catch(() => {});
  }
}

/* =========================================
   LANGUAGE SWITCHING
========================================= */

function setLanguage(next) {
  language = next === "ar" ? "ar" : "en";

  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";

  langButton.textContent =
    language === "ar" ? "English" : "العربية";

  document.querySelectorAll("[data-en][data-ar]").forEach(el => {
    const translatedText = el.dataset[language];

    if (translatedText !== undefined) {
      el.innerHTML = translatedText;
    }
  });

  renderProducts();

  if (activeProduct && dialog.open) {
    showDetails(activeProduct);
  }

  if (status) {
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
  }

  applyTypography();
}

langButton.addEventListener("click", () => {
  setLanguage(language === "en" ? "ar" : "en");
});

/* =========================================
   ELEMENT HELPER
========================================= */

function makeElement(tag, className, text) {
  const el = document.createElement(tag);

  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;

  return el;
}

/* =========================================
   PRICE FORMATTING
========================================= */

function formatPrice(product) {
  const amount = Number(product.price);

  if (!Number.isFinite(amount)) return "—";

  const currency = product.currency || "USD";

  try {
    return new Intl.NumberFormat(
      language === "ar" ? "ar-DZ" : "en-US",
      {
        style: "currency",
        currency
      }
    ).format(amount);
  } catch {
    return amount + " " + currency;
  }
}

/* =========================================
   PRODUCT IMAGE IN DETAILS WINDOW
========================================= */

function showProductImage(product) {
  if (!dialogImage || !detailPlaceholder) return;

  // Reset the image before loading another product.
  dialogImage.onload = null;
  dialogImage.onerror = null;
  dialogImage.removeAttribute("src");
  dialogImage.style.display = "none";

  detailPlaceholder.style.display = "flex";

  if (!product.image_path) return;

  const imageUrl = db.storage
    .from("pixora-images")
    .getPublicUrl(product.image_path).data.publicUrl;

  if (!imageUrl) return;

  dialogImage.onload = () => {
    dialogImage.style.display = "block";
    detailPlaceholder.style.display = "none";
  };

  dialogImage.onerror = () => {
    dialogImage.style.display = "none";
    detailPlaceholder.style.display = "flex";
  };

  dialogImage.alt =
    language === "ar"
      ? (product.title_ar || product.title_en || "صورة المنتج")
      : (product.title_en || product.title_ar || "Product image");

  dialogImage.src = imageUrl;
}

/* =========================================
   PRODUCT DETAILS WINDOW
========================================= */

function showDetails(product) {
  activeProduct = product;

  // Product title.
  dialogTitle.textContent =
    language === "ar"
      ? (product.title_ar || product.title_en || "")
      : (product.title_en || product.title_ar || "");

  // Product description.
  dialogText.textContent =
    language === "ar"
      ? (product.description_ar || product.description_en || "")
      : (product.description_en || product.description_ar || "");

  // Product category.
  dialogCategory.textContent =
    categories[product.category]?.[language] ||
    (language === "ar" ? "منتج رقمي" : "Digital product");

  // Product price.
  dialogPrice.textContent = formatPrice(product);

  // Product image or placeholder.
  showProductImage(product);

  // Reset order form.
  emailInput.value = "";
  orderStatus.textContent = "";
  buyButton.disabled = false;

  buyButton.textContent =
    language === "ar"
      ? "إنشاء طلب الشراء"
      : "Create order";

  applyTypography();

  if (!dialog.open) {
    dialog.showModal();
  }
}

/* =========================================
   RENDER PRODUCTS
========================================= */

function renderProducts() {
  grid.replaceChildren();

  products.forEach(product => {
    const card = makeElement("article", "product");

    card.dataset.category = product.category || "files";

    const visual = makeElement(
      "div",
      "visual " + (
        categories[product.category] ? product.category : "files"
      )
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

    details.addEventListener("click", () => {
      showDetails(product);
    });

    body.appendChild(details);

    card.append(visual, body);
    grid.appendChild(card);
  });

  applyFilter();
  applyTypography();
}

/* =========================================
   PRODUCT FILTERS
========================================= */

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

/* =========================================
   LOAD PRODUCTS FROM SUPABASE
========================================= */

async function loadProducts() {
  status.textContent =
    language === "ar"
      ? "جارٍ تحميل المنتجات..."
      : "Loading products...";

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

/* =========================================
   CREATE CUSTOMER ORDER
========================================= */

buyButton.addEventListener("click", async () => {
  if (!activeProduct) return;

  const email = emailInput.value.trim();

  if (!emailInput.checkValidity() || !email) {
    emailInput.reportValidity();

    orderStatus.textContent =
      language === "ar"
        ? "يرجى إدخال بريد إلكتروني صحيح."
        : "Please enter a valid email address.";

    return;
  }

  buyButton.disabled = true;

  buyButton.textContent =
    language === "ar"
      ? "جارٍ إنشاء الطلب..."
      : "Creating order...";

  orderStatus.textContent =
    language === "ar"
      ? "يرجى الانتظار..."
      : "Please wait...";

  try {
    const { data, error } = await db.functions.invoke(
      "create-order",
      {
        body: {
          product_id: activeProduct.id,
          customer_email: email
        }
      }
    );

    if (error) throw error;

    console.log("PIXORA order response:", data);

    orderStatus.textContent =
      language === "ar"
        ? "تم إنشاء طلبك بنجاح. الدفع غير مفعّل حاليًا، وسيبقى الطلب في انتظار الدفع."
        : "Your order was created successfully. Payment is not enabled yet, so your order will remain pending.";

    buyButton.textContent =
      language === "ar"
        ? "تم إنشاء الطلب"
        : "Order created";

  } catch (error) {
    console.error("PIXORA order error:", error);

    orderStatus.textContent =
      language === "ar"
        ? "تعذر إنشاء الطلب. يرجى المحاولة لاحقًا."
        : "Unable to create the order. Please try again later.";

    buyButton.disabled = false;

    buyButton.textContent =
      language === "ar"
        ? "إعادة المحاولة"
        : "Try again";
  }
});

/* =========================================
   DIALOG CONTROLS
========================================= */

document.querySelector("#close").addEventListener("click", () => {
  dialog.close();
});

document.querySelector("#ok").addEventListener("click", () => {
  dialog.close();
});

dialog.addEventListener("click", event => {
  if (event.target === dialog) {
    dialog.close();
  }
});

/* =========================================
   MOBILE NAVIGATION
========================================= */

menuButton.addEventListener("click", () => {
  nav.classList.toggle("open");
});

nav.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
  });
});

/* =========================================
   START PIXORA
========================================= */

setLanguage(language);
loadProducts();
