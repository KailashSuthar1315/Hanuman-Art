
document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.querySelector(".catalog-grid");

  if (!grid) {
    console.error("Product grid not found on this page.");
    return;
  }

  // Remove the initial loading message from the HTML, if present.
  const initialLoadingMessage = document.querySelector(
    ".category-loading-message"
  );

  if (initialLoadingMessage) {
    initialLoadingMessage.remove();
  }

  if (
    !window.supabase ||
    typeof SUPABASE_URL === "undefined" ||
    typeof SUPABASE_PUBLISHABLE_KEY === "undefined"
  ) {
    console.error("Supabase configuration is missing.");
    return;
  }

  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  // Identify this page's category from its filename.
  const pageCategory = window.location.pathname
    .split("/")
    .pop()
    .replace(".html", "");

  const loading = document.createElement("p");
  loading.textContent = "Loading new products...";
  loading.style.display = "none";
  grid.insertAdjacentElement("beforebegin", loading);

  try {
    const { data: categories, error: categoryError } =
      await supabaseClient
        .from("categories")
        .select("id, name, slug")
        .eq("slug", pageCategory)
        .eq("is_active", true)
        .limit(1);

    if (categoryError || !categories?.length) {
      loading.remove();

      const message = document.createElement("p");
      message.textContent =
        "This product category could not be loaded.";
      grid.append(message);

      console.error(
        categoryError || "Category not found:",
        pageCategory
      );
      return;
    }

    const category = categories[0];

    const { data: products, error: productError } =
      await supabaseClient
        .from("products")
        .select(`
          id,
          name,
          description,
          material,
          dimensions,
          finish,
          price,
          inquiry_only,
          is_featured,
          product_images (
            image_url,
            alt_text,
            display_order
          )
        `)
        .eq("category_id", category.id)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

    if (productError) {
      loading.remove();

      const message = document.createElement("p");
      message.textContent =
        "Products could not be loaded. Please try again later.";
      grid.append(message);

      console.error("Product loading error:", productError);
      return;
    }

    loading.remove();

    if (!products?.length) {
      const message = document.createElement("p");
      message.textContent =
        "No published products in this category yet.";
      grid.append(message);
      return;
    }

    products.forEach((product) => {
      const card = document.createElement("div");
      card.className = "catalog-card";
      card.dataset.supabaseProduct = "true";

      const photos = [...(product.product_images || [])].sort(
        (a, b) => (a.display_order || 0) - (b.display_order || 0)
      );

      const imageBox = document.createElement("div");
      imageBox.className = "catalog-img-box";

      if (photos.length && photos[0].image_url) {
        const image = document.createElement("img");
        image.src = photos[0].image_url;
        image.alt = photos[0].alt_text || product.name;
        image.loading = "lazy";
        imageBox.append(image);
      }

      if (product.is_featured) {
        const badge = document.createElement("span");
        badge.className = "premium-badge";
        badge.textContent = "Featured";
        imageBox.append(badge);
      }

      const info = document.createElement("div");
      info.className = "catalog-info";

      const title = document.createElement("h3");
      title.textContent = product.name;
      info.append(title);

      const price = document.createElement("span");
      price.className = "catalog-price-tag";

      if (product.inquiry_only) {
        price.textContent = "Price on enquiry";
      } else if (product.price != null) {
        price.textContent =
          "₹" + Number(product.price).toLocaleString("en-IN");
      } else {
        price.textContent = "Contact for price";
      }

      info.append(price);
      card.append(imageBox, info);

      card.addEventListener("click", () => {
        const modal = document.getElementById("productDetailModal");

        if (!modal) return;

        const modalImg = document.getElementById("modalImg");
        const modalTitle = document.getElementById("modalTitle");
        const modalPrice = document.getElementById("modalPrice");
        const modalMaterial = document.getElementById("modalMaterial");
        const modalSize = document.getElementById("modalSize");
        const modalFinish = document.getElementById("modalFinish");
        const waInquiryBtn = document.getElementById("waInquiryBtn");
        const waCustomBtn = document.getElementById("waCustomBtn");

        if (
          !modalImg ||
          !modalTitle ||
          !modalPrice ||
          !modalMaterial ||
          !modalSize ||
          !modalFinish ||
          !waInquiryBtn ||
          !waCustomBtn
        ) {
          console.error("One or more product modal elements are missing.");
          return;
        }

        modalImg.src = photos[0]?.image_url || "";
        modalTitle.textContent = product.name;

        modalPrice.textContent = product.inquiry_only
          ? "Price on enquiry"
          : product.price != null
            ? "₹" + Number(product.price).toLocaleString("en-IN")
            : "Contact for price";

        modalMaterial.textContent = product.material || "Not specified";
        modalSize.textContent = product.dimensions || "Not specified";
        modalFinish.textContent = product.finish || "Not specified";

        const inquiryText = encodeURIComponent(
          `Hello Hanuman Art, I am interested in ${product.name}. Please share more details.`
        );

        waInquiryBtn.href =
          `https://wa.me/918946871958?text=${inquiryText}`;

        const customText = encodeURIComponent(
          `Hello Hanuman Art, I am interested in ${product.name} and would like to discuss custom dimensions or finishes.`
        );

        waCustomBtn.href =
          `https://wa.me/918946871958?text=${customText}`;

        modal.style.display = "flex";

        requestAnimationFrame(() => {
          modal.style.opacity = "1";
        });
      });

      grid.append(card);
    });
  } catch (error) {
    loading.remove();

    const message = document.createElement("p");
    message.textContent =
      "Products could not be loaded. Please refresh and try again.";
    grid.append(message);

    console.error("Unexpected product loading error:", error);
  }
});
