
/* PIXORA Admin — Supabase client-side public key only.
   Never add a service_role key here.
*/

const SUPABASE_URL = "https://wgaqjdellsvkseqdrlco.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ehhXQXJnuyFc5gy5tcWqcg_l-2lVjUX";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const $ = (id) => document.getElementById(id);

const loginPanel = $("loginPanel");
const dashboard = $("dashboard");
const logoutBtn = $("logoutBtn");

let currentUser = null;
let currentProduct = null;


/* =========================
   GENERAL HELPERS
========================= */

function message(target, text, error = false) {
  if (!target) return;

  target.innerHTML = "";

  if (!text) return;

  const el = document.createElement("div");
  el.className = error ? "msg error" : "msg";
  el.textContent = text;

  target.appendChild(el);
}

function safeText(value) {
  return String(value ?? "");
}


/* =========================
   ADMIN AUTHENTICATION
========================= */

async function checkAdmin(user) {
  const { data, error } = await db
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error(
      "هذا الحساب ليس لديه صلاحية مسؤول. تحقق من إضافة user_id في جدول admin_users."
    );
  }
}

async function showDashboard(user) {
  await checkAdmin(user);

  currentUser = user;

  loginPanel.classList.add("hidden");
  dashboard.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");

  await loadProducts();
  await loadOrders();
}

function showLogin() {
  currentUser = null;

  dashboard.classList.add("hidden");
  logoutBtn.classList.add("hidden");
  loginPanel.classList.remove("hidden");
}


/* LOGIN */

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  message($("loginMsg"), "جارٍ تسجيل الدخول...");

  const { data, error } = await db.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("password").value
  });

  if (error) {
    return message($("loginMsg"), error.message, true);
  }

  try {
    await showDashboard(data.user);
    message($("loginMsg"), "");
  } catch (err) {
    await db.auth.signOut();
    showLogin();
    message($("loginMsg"), err.message, true);
  }
});


/* LOGOUT */

logoutBtn.addEventListener("click", async () => {
  await db.auth.signOut();
  showLogin();
});


/* =========================
   PRODUCT FORM
========================= */

function resetForm() {
  $("productForm").reset();

  $("productId").value = "";
  $("price").value = "0";
  $("is_published").value = "false";

  $("formTitle").textContent = "إضافة منتج جديد";
  $("saveBtn").textContent = "حفظ المنتج";

  $("fileStatus").textContent =
    "عند تعديل منتج، اترك اختيار الملف فارغًا للاحتفاظ بالملفات الحالية.";

  currentProduct = null;

  message($("formMsg"), "");
}

$("cancelEditBtn").addEventListener("click", resetForm);


/* =========================
   FILE UPLOAD
========================= */

async function uploadFile(bucket, file, folder) {
  if (!file) return null;

  const ext = file.name.split(".").pop().toLowerCase();

  const path =
    `${currentUser.id}/${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await db.storage
    .from(bucket)
    .upload(path, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "3600"
    });

  if (error) throw error;

  return path;
}


/* =========================
   SAVE PRODUCT
========================= */

$("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentUser) return;

  const saveBtn = $("saveBtn");

  saveBtn.disabled = true;

  message($("formMsg"), "جارٍ حفظ المنتج ورفع الملفات...");

  try {
    const image = $("imageFile").files[0] || null;
    const pdf = $("pdfFile").files[0] || null;

    if (
      image &&
      !["image/png", "image/jpeg", "image/webp"].includes(image.type)
    ) {
      throw new Error("صيغة صورة الغلاف غير مدعومة.");
    }

    if (pdf && pdf.type !== "application/pdf") {
      throw new Error("يجب اختيار ملف PDF.");
    }

    if (image && image.size > 8 * 1024 * 1024) {
      throw new Error("حجم صورة الغلاف يجب ألا يتجاوز 8 MB.");
    }

    if (pdf && pdf.size > 50 * 1024 * 1024) {
      throw new Error("حجم ملف PDF يجب ألا يتجاوز 50 MB.");
    }

    const imagePath = image
      ? await uploadFile("pixora-images", image, "covers")
      : (currentProduct?.image_path || null);

    const filePath = pdf
      ? await uploadFile("pixora-files", pdf, "products")
      : (currentProduct?.file_path || null);

    const payload = {
      title_en: $("title_en").value.trim(),
      title_ar: $("title_ar").value.trim(),
      description_en: $("description_en").value.trim(),
      description_ar: $("description_ar").value.trim(),
      category: $("category").value,
      price: Number($("price").value),
      currency: $("currency").value,
      image_path: imagePath,
      file_path: filePath,
      is_published: $("is_published").value === "true"
    };

    if (!payload.title_en || !payload.title_ar) {
      throw new Error("أدخل اسم المنتج باللغتين.");
    }

    if (!Number.isFinite(payload.price) || payload.price < 0) {
      throw new Error("تحقق من السعر.");
    }

    let result;

    if ($("productId").value) {
      result = await db
        .from("products")
        .update(payload)
        .eq("id", $("productId").value)
        .select()
        .single();
    } else {
      result = await db
        .from("products")
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) throw result.error;

    resetForm();

    message($("formMsg"), "تم حفظ المنتج بنجاح.");

    await loadProducts();

  } catch (err) {
    message(
      $("formMsg"),
      err.message || "حدث خطأ أثناء الحفظ.",
      true
    );
  } finally {
    saveBtn.disabled = false;
  }
});


/* =========================
   PRODUCT CARDS
========================= */

function addProductCard(product) {
  const card = document.createElement("article");
  card.className = "product";

  const info = document.createElement("div");

  const title = document.createElement("strong");

  title.textContent =
    product.title_ar ||
    product.title_en ||
    "منتج بدون اسم";

  const meta = document.createElement("div");
  meta.className = "muted";

  meta.textContent =
    `${product.price} ${product.currency} · ` +
    `${product.is_published ? "منشور" : "مسودة"}`;

  const english = document.createElement("small");
  english.textContent = product.title_en || "";

  info.append(
    title,
    document.createElement("br"),
    english,
    document.createElement("br"),
    meta
  );

  const actions = document.createElement("div");
  actions.className = "product-actions";

  const edit = document.createElement("button");
  edit.className = "secondary";
  edit.textContent = "تعديل";

  edit.addEventListener("click", () => {
    editProduct(product);
  });

  const toggle = document.createElement("button");
  toggle.className = "secondary";
  toggle.textContent = product.is_published ? "إخفاء" : "نشر";

  toggle.addEventListener("click", () => {
    togglePublished(product);
  });

  const del = document.createElement("button");
  del.className = "danger";
  del.textContent = "حذف";

  del.addEventListener("click", () => {
    deleteProduct(product);
  });

  actions.append(edit, toggle, del);

  card.append(info, actions);

  $("productsList").appendChild(card);
}


/* =========================
   LOAD PRODUCTS
========================= */

async function loadProducts() {
  const productsList = $("productsList");

  productsList.textContent = "جارٍ تحميل المنتجات...";

  const { data, error } = await db
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    productsList.textContent =
      "تعذر تحميل المنتجات: " + error.message;
    return;
  }

  productsList.replaceChildren();

  if (!data || !data.length) {
    productsList.textContent =
      "لا توجد منتجات بعد. أضف أول منتج من النموذج أعلاه.";
    return;
  }

  data.forEach(addProductCard);
}


/* =========================
   EDIT PRODUCT
========================= */

function editProduct(p) {
  currentProduct = p;

  $("productId").value = p.id;

  [
    "title_en",
    "title_ar",
    "description_en",
    "description_ar",
    "category",
    "price",
    "currency"
  ].forEach((k) => {
    $(k).value = p[k] ?? "";
  });

  $("is_published").value = String(!!p.is_published);

  $("imageFile").value = "";
  $("pdfFile").value = "";

  $("formTitle").textContent = "تعديل المنتج";
  $("saveBtn").textContent = "حفظ التعديلات";

  $("fileStatus").textContent =
    `الصورة الحالية: ${p.image_path ? "موجودة" : "لا توجد"} — ` +
    `ملف PDF: ${p.file_path ? "موجود" : "لا يوجد"}. ` +
    "اترك الحقول فارغة للاحتفاظ بالملفات الحالية.";

  message($("formMsg"), "تم تحميل بيانات المنتج للتعديل.");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================
   PUBLISH / HIDE PRODUCT
========================= */

async function togglePublished(p) {
  const { error } = await db
    .from("products")
    .update({
      is_published: !p.is_published
    })
    .eq("id", p.id);

  if (error) {
    return alert(
      "تعذر تحديث حالة المنتج: " + error.message
    );
  }

  await loadProducts();
}


/* =========================
   DELETE PRODUCT
========================= */

async function deleteProduct(p) {
  const confirmed = confirm(
    `هل تريد حذف المنتج «${p.title_ar || p.title_en}»؟ لا يمكن التراجع عن ذلك.`
  );

  if (!confirmed) return;

  const { error } = await db
    .from("products")
    .delete()
    .eq("id", p.id);

  if (error) {
    return alert(
      "تعذر حذف المنتج: " + error.message
    );
  }

  await loadProducts();
}


/* =========================
   CUSTOMER ORDERS
========================= */

function orderStatusLabel(status) {
  const labels = {
    pending: "قيد الانتظار",
    paid: "مدفوع",
    failed: "فشل الدفع",
    refunded: "مسترد"
  };

  return labels[status] || status;
}


async function loadOrders() {
  const list = $("ordersList");
  const summary = $("ordersSummary");

  if (!list || !summary) return;

  list.textContent = "جارٍ تحميل الطلبات...";
  summary.textContent = "جارٍ حساب الإحصائيات...";

  const { data, error } = await db
    .from("orders")
    .select(
      "id, product_id, product_title, customer_email, amount, currency, status, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    list.textContent =
      "تعذر تحميل الطلبات: " + error.message;

    summary.textContent =
      "تعذر تحميل الإحصائيات.";

    return;
  }

  const orders = data || [];

  const pending = orders.filter(
    (o) => o.status === "pending"
  ).length;

  const paid = orders.filter(
    (o) => o.status === "paid"
  ).length;

  const failed = orders.filter(
    (o) => o.status === "failed"
  ).length;

  const refunded = orders.filter(
    (o) => o.status === "refunded"
  ).length;

  summary.textContent =
    `إجمالي الطلبات: ${orders.length} — ` +
    `قيد الانتظار: ${pending} — ` +
    `مدفوع: ${paid} — ` +
    `فشل: ${failed} — ` +
    `مسترد: ${refunded}`;

  list.replaceChildren();

  if (!orders.length) {
    list.textContent = "لا توجد طلبات حتى الآن.";
    return;
  }

  orders.forEach((order) => {
    const card = document.createElement("article");
    card.className = "product";

    const info = document.createElement("div");

    const title = document.createElement("strong");
    title.textContent =
      order.product_title || "منتج PIXORA";

    const email = document.createElement("div");
    email.className = "muted";
    email.textContent =
      "البريد الإلكتروني: " + order.customer_email;

    const price = document.createElement("div");
    price.className = "muted";
    price.textContent =
      "المبلغ: " + order.amount + " " + order.currency;

    const date = document.createElement("div");
    date.className = "muted";

    const parsedDate = new Date(order.created_at);

    date.textContent =
      "التاريخ: " +
      (
        Number.isNaN(parsedDate.getTime())
          ? "غير متاح"
          : parsedDate.toLocaleString("ar-DZ")
      );

    const status = document.createElement("div");
    status.className = "tag";
    status.textContent =
      "الحالة: " + orderStatusLabel(order.status);

    info.append(
      title,
      email,
      price,
      date,
      status
    );

    card.appendChild(info);
    list.appendChild(card);
  });
}


/* REFRESH ORDERS BUTTON */

const refreshOrdersBtn = $("refreshOrdersBtn");

if (refreshOrdersBtn) {
  refreshOrdersBtn.addEventListener("click", async () => {
    refreshOrdersBtn.disabled = true;

    try {
      await loadOrders();
    } finally {
      refreshOrdersBtn.disabled = false;
    }
  });
}


/* =========================
   RESTORE SESSION
========================= */

(async function init() {
  const { data, error } = await db.auth.getSession();

  if (error) {
    return message($("loginMsg"), error.message, true);
  }

  if (data.session?.user) {
    try {
      await showDashboard(data.session.user);
    } catch (err) {
      await db.auth.signOut();
      showLogin();

      message(
        $("loginMsg"),
        err.message,
        true
      );
    }
  } else {
    showLogin();
  }
})();

