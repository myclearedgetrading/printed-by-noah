/**
 * Noah's 3D Print Shop — cart, nav, shop grid, forms
 */
(function () {
  const STORAGE_KEY = "noahs3dprintshop_cart_v1";
  const PRODUCTS = Array.isArray(window.NOAH_PRODUCTS) ? window.NOAH_PRODUCTS : [];

  function getCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  function setCart(obj) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }

  function getProductById(id) {
    return PRODUCTS.find((p) => p.id === id);
  }

  function cartItemCount() {
    const c = getCart();
    return Object.values(c).reduce((a, n) => a + (Number(n) || 0), 0);
  }

  function cartSubtotal() {
    const c = getCart();
    let sum = 0;
    for (const [id, qty] of Object.entries(c)) {
      const p = getProductById(id);
      if (p && qty > 0) sum += p.price * qty;
    }
    return sum;
  }

  function formatMoney(n) {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
  }

  function updateCartBadge() {
    const el = document.getElementById("cart-count");
    if (el) el.textContent = String(cartItemCount());
  }

  function addToCart(productId) {
    const p = getProductById(productId);
    if (!p) return;
    const c = getCart();
    c[productId] = (c[productId] || 0) + 1;
    setCart(c);
    updateCartBadge();
    renderCartDrawer();
    showToast(`Added “${p.name}” to your cart!`);
  }

  function setQty(productId, qty) {
    const c = getCart();
    if (qty <= 0) delete c[productId];
    else c[productId] = qty;
    setCart(c);
    updateCartBadge();
    renderCartDrawer();
  }

  function clearCart() {
    setCart({});
    updateCartBadge();
    renderCartDrawer();
    showToast("Cart cleared.");
  }

  function renderCartDrawer() {
    const body = document.getElementById("cart-lines");
    const subEl = document.getElementById("cart-subtotal");
    if (!body) return;

    const c = getCart();
    const ids = Object.keys(c).filter((id) => c[id] > 0);

    if (ids.length === 0) {
      body.innerHTML =
        '<p class="cart-empty">Your cart is empty — add something fun from the shop!</p>';
    } else {
      body.innerHTML = ids
        .map((id) => {
          const p = getProductById(id);
          const qty = c[id];
          if (!p) return "";
          const safeName = escapeHtml(p.name);
          return `
            <div class="cart-line" data-cart-id="${escapeAttr(id)}">
              <img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.name)}" width="56" height="56" loading="lazy" />
              <div>
                <h3>${safeName}</h3>
                <p>${formatMoney(p.price)} each</p>
              </div>
              <div class="qty" aria-label="Quantity">
                <button type="button" data-qty-minus="${escapeAttr(id)}" aria-label="Decrease">−</button>
                <span>${qty}</span>
                <button type="button" data-qty-plus="${escapeAttr(id)}" aria-label="Increase">+</button>
              </div>
            </div>
          `;
        })
        .join("");
    }

    if (subEl) subEl.textContent = formatMoney(cartSubtotal());
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, "&quot;");
  }

  let toastTimer;
  function showToast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-visible"), 2200);
  }

  function initCartDrawer() {
    const openBtn = document.getElementById("cart-toggle");
    const closeBtn = document.getElementById("cart-close");
    const backdrop = document.getElementById("cart-backdrop");
    const drawer = document.getElementById("cart-drawer");
    const clearBtn = document.getElementById("cart-clear");

    function open() {
      backdrop?.classList.add("is-open");
      drawer?.classList.add("is-open");
      document.body.style.overflow = "hidden";
      renderCartDrawer();
    }

    function close() {
      backdrop?.classList.remove("is-open");
      drawer?.classList.remove("is-open");
      document.body.style.overflow = "";
    }

    openBtn?.addEventListener("click", open);
    closeBtn?.addEventListener("click", close);
    backdrop?.addEventListener("click", close);
    clearBtn?.addEventListener("click", clearCart);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    document.getElementById("cart-lines")?.addEventListener("click", (e) => {
      const minus = e.target.closest("[data-qty-minus]");
      const plus = e.target.closest("[data-qty-plus]");
      if (minus) {
        const id = minus.getAttribute("data-qty-minus");
        const c = getCart();
        setQty(id, (c[id] || 0) - 1);
      }
      if (plus) {
        const id = plus.getAttribute("data-qty-plus");
        const c = getCart();
        setQty(id, (c[id] || 0) + 1);
      }
    });
  }

  function renderProductCard(p) {
    return `
      <article class="product-card" data-product-id="${escapeAttr(p.id)}">
        <img class="product-card__img" src="${escapeAttr(p.image)}" alt="${escapeAttr(p.name)}" width="400" height="320" loading="lazy" />
        <div class="product-card__body">
          <h3 class="product-card__title">${escapeHtml(p.name)}</h3>
          <div class="product-card__meta">
            <span class="product-card__cat">${escapeHtml(p.category)}</span>
            <span class="product-card__price">${formatMoney(p.price)}</span>
          </div>
          <p class="product-card__desc">${escapeHtml(p.description)}</p>
          <button type="button" class="btn btn-primary add-to-cart" data-add="${escapeAttr(p.id)}">Add to Cart</button>
        </div>
      </article>
    `;
  }

  function initShopPage() {
    const grid = document.getElementById("product-grid");
    if (!grid || PRODUCTS.length === 0) return;

    let currentFilter = "all";

    function render() {
      const list =
        currentFilter === "all"
          ? PRODUCTS
          : PRODUCTS.filter((p) => p.category === currentFilter);
      grid.innerHTML = list.map((p) => renderProductCard(p)).join("");
    }

    document.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        currentFilter = chip.getAttribute("data-filter") || "all";
        document.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("is-active"));
        chip.classList.add("is-active");
        render();
      });
    });

    grid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-add]");
      if (btn) addToCart(btn.getAttribute("data-add"));
    });

    render();
  }

  function initFeatured() {
    const grid = document.getElementById("featured-grid");
    if (!grid || PRODUCTS.length === 0) return;
    const featured = PRODUCTS.slice(0, 4);
    grid.innerHTML = featured.map((p) => renderProductCard(p)).join("");
    grid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-add]");
      if (btn) addToCart(btn.getAttribute("data-add"));
    });
  }

  function initNav() {
    const btn = document.getElementById("nav-toggle");
    const menu = document.getElementById("mobile-menu");
    btn?.addEventListener("click", () => {
      const open = menu?.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });

    const page = document.body.getAttribute("data-page");
    if (page) {
      document.querySelectorAll(`[data-nav="${page}"]`).forEach((el) => el.classList.add("is-active"));
    }
  }

  function initForms() {
    const custom = document.getElementById("custom-order-form");
    custom?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(custom);
      const name = fd.get("name") || "friend";
      showToast(`Thanks, ${name}! Your custom idea was submitted (demo).`);
      alert(
        "Custom order submitted (demo — not sent to a server yet).\n\nNoah's 3D Print Shop will review your request and follow up!"
      );
      custom.reset();
    });

    const contact = document.getElementById("contact-form");
    contact?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(contact);
      const name = fd.get("name") || "friend";
      showToast(`Message sent! Thanks, ${name}!`);
      alert("Message sent (demo — not sent to a server yet).\n\nNoah will reply when he can!");
      contact.reset();
    });
  }

  function boot() {
    updateCartBadge();
    renderCartDrawer();
    initCartDrawer();
    initNav();
    initShopPage();
    initFeatured();
    initForms();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
