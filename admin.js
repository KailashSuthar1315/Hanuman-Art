
const adminSupabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const $ = id => document.getElementById(id);

const loginPanel = $("login-panel");
const dashboardPanel = $("dashboard-panel");
const loginForm = $("login-form");
const loginButton = $("login-button");
const loginMessage = $("login-message");
const dashboardMessage = $("dashboard-message");
const adminEmail = $("admin-email");
const productForm = $("product-form");
const productFormMessage = $("product-form-message");
const saveProductButton = $("save-product-button");

let dashboardUser = null;
let categories = [];

// --------------------------------------------------
// LOGIN AND DASHBOARD
// --------------------------------------------------

function showLogin(message = "") {
  dashboardUser = null;
  loginPanel.hidden = false;
  dashboardPanel.hidden = true;
  loginMessage.textContent = message;
  dashboardMessage.textContent = "";
}

function showDashboard(user) {
  dashboardUser = user;
  loginPanel.hidden = true;
  dashboardPanel.hidden = false;
  adminEmail.textContent = user.email || "Administrator";
  loginMessage.textContent = "";
}

async function verifyAdministrator() {
  const {
    data: { user },
    error: userError
  } = await adminSupabase.auth.getUser();

  if (userError || !user) {
    showLogin("Please sign in with your administrator account.");
    return false;
  }

  const { data: isAdmin, error: adminError } =
    await adminSupabase.rpc("is_admin");

  if (adminError || isAdmin !== true) {
    await adminSupabase.auth.signOut();

    showLogin(
      "Access denied. This account is not authorized to manage products."
    );

    return false;
  }

  showDashboard(user);

  await Promise.all([
    loadCategories(),
    loadDashboardCounts(),
    loadProducts()
  ]);

  return true;
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  loginButton.disabled = true;
  loginButton.textContent = "Signing in...";
  loginMessage.textContent = "";

  const email = $("email").value.trim();
  const password = $("password").value;

  try {
    const { error } = await adminSupabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    await verifyAdministrator();

  } catch (error) {
    loginMessage.textContent =
      "Sign-in failed: " + error.message;

  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Sign In";
  }
});

// --------------------------------------------------
// CATEGORIES
// --------------------------------------------------

async function loadCategories() {
  const select = $("product-category");

  select.replaceChildren(
    new Option("Loading categories...", "")
  );

  const { data, error } = await adminSupabase
    .from("categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("display_order");

  if (error) {
    select.replaceChildren(
      new Option("Could not load categories", "")
    );

    productFormMessage.textContent =
      "Category loading failed: " + error.message;

    return;
  }

  categories = data || [];

  select.replaceChildren(
    new Option("Select a category", "")
  );

  categories.forEach(category => {
    select.add(new Option(category.name, category.id));
  });
}

// --------------------------------------------------
// DASHBOARD COUNTS
// --------------------------------------------------

async function loadDashboardCounts() {
  if (!dashboardUser) return;

  const [
    productsResult,
    publishedResult,
    categoriesResult
  ] = await Promise.all([
    adminSupabase
      .from("products")
      .select("id", { count: "exact", head: true }),

    adminSupabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true),

    adminSupabase
      .from("categories")
      .select("id", { count: "exact", head: true })
  ]);

  const failed = [
    productsResult,
    publishedResult,
    categoriesResult
  ].find(result => result.error);

  if (failed) {
    dashboardMessage.textContent =
      "Could not load dashboard counts: " +
      failed.error.message;

    return;
  }

  $("total-products").textContent =
    productsResult.count ?? 0;

  $("published-products").textContent =
    publishedResult.count ?? 0;

  $("total-categories").textContent =
    categoriesResult.count ?? 0;

  dashboardMessage.textContent =
    "Dashboard loaded successfully.";
}

// --------------------------------------------------
// PRODUCT HELPERS
// --------------------------------------------------

function makeSlug(value) {
  const base = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 75);

  return `${base || "product"}-${crypto.randomUUID().slice(0, 8)}`;
}

function validPhoto(file) {
  return Boolean(
    file &&
    ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
    file.size <= 5 * 1024 * 1024
  );
}

async function uploadProductPhoto(productId, file) {
  const safeName = file.name.replace(
    /[^a-zA-Z0-9._-]/g,
    "_"
  );

  const path =
    `${dashboardUser.id}/${productId}/${crypto.randomUUID()}-${safeName}`;

  const { error } = await adminSupabase.storage
    .from("product-images")
    .upload(path, file, {
      contentType: file.type,
      upsert: false
    });

  if (error) throw error;

  const { data } = adminSupabase.storage
    .from("product-images")
    .getPublicUrl(path);

  return {
    path,
    url: data.publicUrl
  };
}

// --------------------------------------------------
// LOAD PRODUCTS
// --------------------------------------------------

async function loadProducts() {
  if (!dashboardUser) return;

  const list = $("product-list");

  list.replaceChildren(
    document.createTextNode("Loading products...")
  );

  const { data, error } = await adminSupabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      category_id,
      description,
      material,
      dimensions,
      finish,
      price,
      inquiry_only,
      is_featured,
      is_published,
      created_at,
      categories(name),
      product_images(
        image_url,
        alt_text,
        display_order,
        storage_path
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    list.replaceChildren();

    const message = document.createElement("p");
    message.className = "empty-note";
    message.textContent =
      "Could not load products: " + error.message;

    list.append(message);
    return;
  }

  list.replaceChildren();

  if (!data || data.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent =
      "No products yet. Add your first product above.";

    list.append(empty);
    return;
  }

  data.forEach(product => {
    const card = document.createElement("article");
    card.className = "stat-card";

    const title = document.createElement("h3");
    title.textContent = product.name;

    const details = document.createElement("p");

    details.textContent = [
      product.categories?.name || "Uncategorized",
      product.material,
      product.dimensions,
      product.finish
    ].filter(Boolean).join(" · ");

    const status = document.createElement("p");

    status.textContent = product.is_published
      ? "Published"
      : "Draft";

    const photos = [...(product.product_images || [])]
      .sort(
        (a, b) =>
          (a.display_order || 0) - (b.display_order || 0)
      );

    
if (photos.length && photos[0].image_url) {
  const image = document.createElement("img");

  image.src = photos[0].image_url;
  image.alt = photos[0].alt_text || product.name;
  image.loading = "lazy";

  image.style.cssText =
    "width:100%;max-width:220px;aspect-ratio:4/3;" +
    "object-fit:cover;border-radius:8px;display:block;" +
    "margin-bottom:12px;";

  image.onerror = () => {
    image.alt = "Product photo unavailable";
    image.style.display = "none";
  };

  card.append(image);
}


    const price = document.createElement("p");

    price.textContent = product.inquiry_only
      ? "Price: Contact for enquiry"
      : product.price == null
        ? "Price: Not set"
        : `Price: ₹${Number(product.price).toLocaleString("en-IN")}`;

    const actions = document.createElement("div");

    actions.style.cssText =
      "display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;";

    const editButton = document.createElement("button");

    editButton.type = "button";
    editButton.textContent = "Edit";

    editButton.addEventListener("click", () => {
      editProduct(product);
    });

    const deleteButton = document.createElement("button");

    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.className = "secondary-button";

    deleteButton.addEventListener("click", () => {
      deleteProduct(product);
    });

    actions.append(editButton, deleteButton);
    card.append(title, details, status, price, actions);
    list.append(card);
  });
}

// --------------------------------------------------
// EDIT PRODUCT
// --------------------------------------------------

function editProduct(product) {
  $("edit-product-id").value = product.id;
  $("edit-product-name").value = product.name || "";

  $("edit-product-description").value =
    product.description || "";

  $("edit-product-material").value =
    product.material || "";

  $("edit-product-dimensions").value =
    product.dimensions || "";

  $("edit-product-finish").value =
    product.finish || "";

  $("edit-product-price").value =
    product.price == null ? "" : product.price;

  $("edit-product-inquiry-only").checked =
    product.inquiry_only ?? true;

  $("edit-product-featured").checked =
    product.is_featured ?? false;

  $("edit-product-published").checked =
    product.is_published ?? false;

  const categorySelect = $("edit-product-category");

  categorySelect.replaceChildren(
    new Option("Select a category", "")
  );

  categories.forEach(category => {
    categorySelect.add(
      new Option(category.name, category.id)
    );
  });

  categorySelect.value = product.category_id || "";

  $("edit-product-message").textContent = "";
  $("edit-photo-message").textContent = "";
  $("edit-new-photos").value = "";

  // This function is defined at the same scope below.
  loadExistingProductPhotos(product.id);

  $("edit-product-panel").hidden = false;

  $("edit-product-panel").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// --------------------------------------------------
// SAVE EDITED PRODUCT
// --------------------------------------------------

$("edit-product-form").addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    if (!dashboardUser) {
      $("edit-product-message").textContent =
        "Please sign in again.";
      return;
    }

    const name = $("edit-product-name").value.trim();
    const categoryId = $("edit-product-category").value;
    const priceInput = $("edit-product-price").value.trim();

    const price =
      priceInput === "" ? null : Number(priceInput);

    if (!name || !categoryId) {
      $("edit-product-message").textContent =
        "Product name and category are required.";
      return;
    }

    if (
      price !== null &&
      (!Number.isFinite(price) || price < 0)
    ) {
      $("edit-product-message").textContent =
        "Please enter a valid, non-negative price.";
      return;
    }

    const button = $("update-product-button");

    button.disabled = true;
    button.textContent = "Saving...";

    try {
      const { error } = await adminSupabase
        .from("products")
        .update({
          name,
          category_id: categoryId,
          description:
            $("edit-product-description").value.trim() || null,
          material:
            $("edit-product-material").value.trim() || null,
          dimensions:
            $("edit-product-dimensions").value.trim() || null,
          finish:
            $("edit-product-finish").value.trim() || null,
          price,
          inquiry_only:
            $("edit-product-inquiry-only").checked,
          is_featured:
            $("edit-product-featured").checked,
          is_published:
            $("edit-product-published").checked
        })
        .eq("id", $("edit-product-id").value);

      if (error) throw error;

      $("edit-product-message").textContent =
        "Product updated successfully.";

      $("edit-product-panel").hidden = true;

      await Promise.all([
        loadDashboardCounts(),
        loadProducts()
      ]);
    } catch (error) {
      $("edit-product-message").textContent =
        "Could not update product: " + error.message;
    } finally {
      button.disabled = false;
      button.textContent = "Save Changes";
    }
  }
);

$("cancel-edit-button").addEventListener("click", () => {
  $("edit-product-panel").hidden = true;
  $("edit-product-message").textContent = "";
});

// --------------------------------------------------
// LOAD EXISTING PRODUCT PHOTOS
// --------------------------------------------------

async function loadExistingProductPhotos(productId) {
  const container = $("edit-existing-photos");

  container.replaceChildren(
    document.createTextNode("Loading photos...")
  );

  const { data: photos, error } = await adminSupabase
    .from("product_images")
    .select(`
      id,
      image_url,
      storage_path,
      alt_text,
      display_order
    `)
    .eq("product_id", productId)
    .order("display_order");

  if (error) {
    container.textContent =
      "Could not load photos: " + error.message;
    return;
  }

  container.replaceChildren();
  console.log("Photos loaded for product:", productId);
console.log("Photo count:", photos?.length, photos);

  if (!photos || photos.length === 0) {
    container.textContent = "No photos added yet.";
    return;
  }

  photos.forEach(photo => {
    const card = document.createElement("div");

    card.style.cssText =
      "border:1px solid #ddd;padding:12px;margin:12px 0;" +
      "border-radius:8px;";

    const image = document.createElement("img");

    image.src = photo.image_url;
    image.alt = photo.alt_text || "Product photo";
    image.loading = "lazy";

    image.style.cssText =
      "width:180px;max-width:100%;aspect-ratio:4/3;" +
      "object-fit:cover;border-radius:6px;display:block;" +
      "margin-bottom:10px;";

    const label = document.createElement("p");

    label.textContent = "Photo " + photo.display_order;

    const replaceButton = document.createElement("button");

    replaceButton.type = "button";
    replaceButton.textContent = "Replace Photo";

    replaceButton.addEventListener("click", () => {
      replaceProductPhoto(productId, photo);
    });

    const deleteButton = document.createElement("button");

    deleteButton.type = "button";
    deleteButton.className = "secondary-button";
    deleteButton.textContent = "Delete Photo";
    deleteButton.style.marginLeft = "8px";

    deleteButton.addEventListener("click", () => {
      deleteProductPhoto(productId, photo);
    });

    card.append(
      label,
      image,
      replaceButton,
      deleteButton
    );

    container.append(card);
    console.log(
  "Rendered photo:",
  photo.display_order,
  photo.image_url,
  image.complete,
  image.naturalWidth
);
  });
}

// --------------------------------------------------
// ADD PHOTOS TO AN EXISTING PRODUCT
// --------------------------------------------------

$("add-product-photos-button").addEventListener(
  "click",
  async () => {
    const productId = $("edit-product-id").value;

    const files = Array.from(
      $("edit-new-photos").files || []
    );

    const message = $("edit-photo-message");
    const button = $("add-product-photos-button");

    if (!productId || !dashboardUser) {
      message.textContent =
        "Please sign in and select a product.";
      return;
    }

    if (!files.length) {
      message.textContent =
        "Please select at least one photo.";
      return;
    }

    if (files.some(file => !validPhoto(file))) {
      message.textContent =
        "Use JPG, PNG, or WebP images up to 5 MB each.";
      return;
    }

    button.disabled = true;
    message.textContent = "Uploading photos...";

    const uploadedPaths = [];

    try {
      const { data: existing, error: readError } =
        await adminSupabase
          .from("product_images")
          .select("display_order")
          .eq("product_id", productId);

      if (readError) throw readError;

      let order = Math.max(
        0,
        ...(existing || []).map(
          photo => photo.display_order || 0
        )
      );

      const rows = [];

      for (const file of files) {
        const uploaded = await uploadProductPhoto(
          productId,
          file
        );

        uploadedPaths.push(uploaded.path);

        rows.push({
          product_id: productId,
          image_url: uploaded.url,
          storage_path: uploaded.path,
          alt_text:
            $("edit-product-name").value.trim(),
          display_order: ++order
        });
      }

      const { error } = await adminSupabase
        .from("product_images")
        .insert(rows);

      if (error) throw error;

      $("edit-new-photos").value = "";
      message.textContent = "Photos added successfully.";

      await loadExistingProductPhotos(productId);
      await loadProducts();
    } catch (error) {
      if (uploadedPaths.length) {
        const { error: cleanupError } =
          await adminSupabase.storage
            .from("product-images")
            .remove(uploadedPaths);

        if (cleanupError) {
          console.error(
            "Uploaded photo cleanup failed:",
            cleanupError
          );
        }
      }

      message.textContent =
        "Could not add photos: " + error.message;
    } finally {
      button.disabled = false;
    }
  }
);

// --------------------------------------------------
// REPLACE A PRODUCT PHOTO
// --------------------------------------------------

async function replaceProductPhoto(productId, photo) {
  const picker = document.createElement("input");

  picker.type = "file";
  picker.accept = "image/jpeg,image/png,image/webp";

  picker.addEventListener("change", async () => {
    const file = picker.files?.[0];

    if (!file) return;

    if (!validPhoto(file)) {
      $("edit-photo-message").textContent =
        "Choose a JPG, PNG, or WebP photo up to 5 MB.";
      return;
    }

    const message = $("edit-photo-message");

    message.textContent = "Replacing photo...";

    let newPath = null;

    try {
      const uploaded = await uploadProductPhoto(
        productId,
        file
      );

      newPath = uploaded.path;

      const { error } = await adminSupabase
        .from("product_images")
        .update({
          image_url: uploaded.url,
          storage_path: uploaded.path,
          alt_text:
            $("edit-product-name").value.trim() ||
            photo.alt_text
        })
        .eq("id", photo.id)
        .eq("product_id", productId);

      if (error) throw error;

      // The database now points to the replacement photo.
      message.textContent = "Photo replaced successfully.";

      if (photo.storage_path) {
        const { error: cleanupError } =
          await adminSupabase.storage
            .from("product-images")
            .remove([photo.storage_path]);

        if (cleanupError) {
          message.textContent =
            "Photo replaced, but the old stored file " +
            "could not be removed.";

          console.error(
            "Old photo cleanup failed:",
            cleanupError
          );
        }
      }

      await loadExistingProductPhotos(productId);
      await loadProducts();
    } catch (error) {
      // Only remove the new upload if replacement failed.
      if (newPath) {
        const { error: cleanupError } =
          await adminSupabase.storage
            .from("product-images")
            .remove([newPath]);

        if (cleanupError) {
          console.error(
            "Replacement photo cleanup failed:",
            cleanupError
          );
        }
      }

      message.textContent =
        "Could not replace photo: " + error.message;
    }
  });

  picker.click();
}

// --------------------------------------------------
// DELETE A PRODUCT PHOTO
// --------------------------------------------------

async function deleteProductPhoto(productId, photo) {
  const confirmed = confirm(
    "Delete this photo from the product? This cannot be undone."
  );

  if (!confirmed) return;

  const message = $("edit-photo-message");

  message.textContent = "Deleting photo...";

  const { error } = await adminSupabase
    .from("product_images")
    .delete()
    .eq("id", photo.id)
    .eq("product_id", productId);

  if (error) {
    message.textContent =
      "Could not delete photo: " + error.message;
    return;
  }

  if (photo.storage_path) {
    const { error: storageError } =
      await adminSupabase.storage
        .from("product-images")
        .remove([photo.storage_path]);

    if (storageError) {
      message.textContent =
        "Photo removed from the product, but its stored " +
        "file could not be deleted.";

      await loadExistingProductPhotos(productId);
      await loadProducts();
      return;
    }
  }

  message.textContent = "Photo deleted successfully.";

  await loadExistingProductPhotos(productId);
  await loadProducts();
}

// --------------------------------------------------
// DELETE A PRODUCT AND ITS PHOTOS
// --------------------------------------------------

async function deleteProduct(product) {
  const confirmed = confirm(
    `Delete "${product.name}" permanently? This cannot be undone.`
  );

  if (!confirmed) return;

  const { data: images, error: imageReadError } =
    await adminSupabase
      .from("product_images")
      .select("storage_path")
      .eq("product_id", product.id);

  if (imageReadError) {
    alert(
      "Could not check product photos: " +
      imageReadError.message
    );
    return;
  }

  const paths = (images || [])
    .map(image => image.storage_path)
    .filter(Boolean);

  if (paths.length) {
    const { error: storageError } =
      await adminSupabase.storage
        .from("product-images")
        .remove(paths);

    if (storageError) {
      alert(
        "Could not delete product photos. The product was " +
        "not deleted. " + storageError.message
      );
      return;
    }
  }

  const { error } = await adminSupabase
    .from("products")
    .delete()
    .eq("id", product.id);

  if (error) {
    alert("Could not delete product: " + error.message);
    return;
  }

  dashboardMessage.textContent =
    "Product deleted successfully.";

  await Promise.all([
    loadDashboardCounts(),
    loadProducts()
  ]);
}

// --------------------------------------------------
// CREATE A NEW PRODUCT
// --------------------------------------------------

productForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!dashboardUser) {
    productFormMessage.textContent =
      "Please sign in again.";
    return;
  }

  const name = $("product-name").value.trim();
  const categoryId = $("product-category").value;

  const files = Array.from(
    $("product-images").files || []
  );

  const inquiryOnly =
    $("product-inquiry-only").checked;

  const priceInput =
    $("product-price").value.trim();

  if (!name || !categoryId || files.length === 0) {
    productFormMessage.textContent =
      "Enter a product name, choose a category, " +
      "and select at least one photo.";
    return;
  }

  if (!categories.some(category => category.id === categoryId)) {
    productFormMessage.textContent =
      "Please select a valid category.";
    return;
  }

  if (files.some(file => !validPhoto(file))) {
    productFormMessage.textContent =
      "Use JPG, PNG, or WebP images up to 5 MB each.";
    return;
  }

  const price =
    priceInput === "" ? null : Number(priceInput);

  if (
    price !== null &&
    (!Number.isFinite(price) || price < 0)
  ) {
    productFormMessage.textContent =
      "Enter a valid non-negative price.";
    return;
  }

  saveProductButton.disabled = true;
  saveProductButton.textContent = "Saving...";
  productFormMessage.textContent = "";

  let productId = null;
  const uploadedPaths = [];

  try {
    const { data: product, error: productError } =
      await adminSupabase
        .from("products")
        .insert({
          name,
          slug: makeSlug(name),
          category_id: categoryId,
          description:
            $("product-description").value.trim() || null,
          material:
            $("product-material").value.trim() || null,
          dimensions:
            $("product-dimensions").value.trim() || null,
          finish:
            $("product-finish").value.trim() || null,
          price,
          inquiry_only: inquiryOnly,
          is_featured: $("product-featured").checked,
          is_published: $("product-published").checked
        })
        .select("id")
        .single();

    if (productError) throw productError;

    productId = product.id;

    const imageRows = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      const safeName = file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

      const path =
        `${dashboardUser.id}/${productId}/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } =
        await adminSupabase.storage
          .from("product-images")
          .upload(path, file, {
            contentType: file.type,
            upsert: false
          });

      if (uploadError) throw uploadError;

      uploadedPaths.push(path);

      const { data: publicUrlData } =
        adminSupabase.storage
          .from("product-images")
          .getPublicUrl(path);

      imageRows.push({
        product_id: productId,
        image_url: publicUrlData.publicUrl,
        storage_path: path,
        alt_text: name,
        display_order: i + 1
      });
    }

    const { error: imageError } =
      await adminSupabase
        .from("product_images")
        .insert(imageRows);

    if (imageError) throw imageError;

    productForm.reset();

    $("product-inquiry-only").checked = true;

    productFormMessage.textContent =
      "Product saved successfully with " +
      files.length + " photo(s).";

    await Promise.all([
      loadDashboardCounts(),
      loadProducts()
    ]);
  } catch (error) {
    console.error("Product save error:", error);

    if (uploadedPaths.length) {
      const { error: cleanupError } =
        await adminSupabase.storage
          .from("product-images")
          .remove(uploadedPaths);

      if (cleanupError) {
        console.error(
          "Image cleanup error:",
          cleanupError
        );
      }
    }

    if (productId) {
      const { error: cleanupError } =
        await adminSupabase
          .from("products")
          .delete()
          .eq("id", productId);

      if (cleanupError) {
        console.error(
          "Product cleanup error:",
          cleanupError
        );
      }
    }

    productFormMessage.textContent =
      "Could not save the product: " +
      (error.message || "Unknown error");
  } finally {
    saveProductButton.disabled = false;
    saveProductButton.textContent = "Save Product";
  }
});

// --------------------------------------------------
// LOGOUT AND REFRESH
// --------------------------------------------------

$("logout-button").addEventListener("click", async () => {
  const { error } = await adminSupabase.auth.signOut();

  if (error) {
    dashboardMessage.textContent =
      "Sign-out failed: " + error.message;
    return;
  }

  showLogin("You have signed out successfully.");
});

$("refresh-button").addEventListener("click", async () => {
  await Promise.all([
    loadDashboardCounts(),
    loadCategories(),
    loadProducts()
  ]);
});

adminSupabase.auth.onAuthStateChange(event => {
  if (event === "SIGNED_OUT") {
    showLogin();
  }
});

// --------------------------------------------------
// INITIALIZE DASHBOARD
// Keep this block separate from all other functions.
// --------------------------------------------------

(async function initializeDashboard() {
  showLogin();

  try {
    const {
      data: { session },
      error
    } = await adminSupabase.auth.getSession();

    if (error) {
      showLogin(
        "Could not check your session. Please sign in again."
      );
      return;
    }

    if (session) {
      await verifyAdministrator();
    }
  } catch (error) {
    showLogin(
      "Could not initialize the dashboard. Please refresh."
    );

    console.error(
      "Dashboard initialization error:",
      error
    );
  }
})();
