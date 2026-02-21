const API = "/api";

const state = {
  user: null,
  menu: [],
  menuFilter: "Tous",
  cart: [],
  isOrderSortAsc: true,
  filters: {
    ordersDateFrom: "",
    ordersDateTo: "",
    statsDateFrom: "",
    statsDateTo: ""
  },
  paymentProviders: {
    stripe: false,
    flutterwave: false,
    loaded: false
  },
  charts: {
    sales: null,
    popular: null
  }
};

const elements = {
  menuGrid: document.getElementById("menu-grid"),
  menuLoading: document.getElementById("menu-loading"),
  menuEmpty: document.getElementById("menu-empty"),
  menuFilterButtons: Array.from(document.querySelectorAll(".menu__filters .chip")),
  cartItems: document.getElementById("cart-items"),
  cartTotal: document.getElementById("cart-total"),
  ordersList: document.getElementById("orders-list"),
  ordersDateFrom: document.getElementById("orders-date-from"),
  ordersDateTo: document.getElementById("orders-date-to"),
  btnApplyOrdersFilter: document.getElementById("btn-apply-orders-filter"),
  staffOrders: document.getElementById("staff-orders"),
  statusSummary: document.getElementById("status-summary"),
  adminMenuList: document.getElementById("admin-menu-list"),
  salesList: document.getElementById("sales-list"),
  popularList: document.getElementById("popular-list"),
  statsDateFrom: document.getElementById("stats-date-from"),
  statsDateTo: document.getElementById("stats-date-to"),
  btnApplyStatsFilter: document.getElementById("btn-apply-stats-filter"),
  authModal: document.getElementById("auth-modal"),
  confirmModal: document.getElementById("confirm-modal"),
  confirmMessage: document.getElementById("confirm-message"),
  confirmAccept: document.getElementById("confirm-accept"),
  confirmCancel: document.getElementById("confirm-cancel"),
  confirmClose: document.getElementById("confirm-close"),
  btnOpenLogin: document.getElementById("btn-open-login"),
  btnOpenRegister: document.getElementById("btn-open-register"),
  btnOpenLoginMobile: document.getElementById("btn-open-login-mobile"),
  btnOpenRegisterMobile: document.getElementById("btn-open-register-mobile"),
  btnLogout: document.getElementById("btn-logout"),
  loginEmail: document.getElementById("login-email"),
  loginPassword: document.getElementById("login-password"),
  loginEmailError: document.getElementById("login-email-error"),
  loginPasswordError: document.getElementById("login-password-error"),
  loginFormError: document.getElementById("login-form-error"),
  loginSubmit: document.getElementById("login-submit"),
  registerName: document.getElementById("register-name"),
  registerEmail: document.getElementById("register-email"),
  registerPassword: document.getElementById("register-password"),
  registerPasswordConfirm: document.getElementById("register-password-confirm"),
  registerNameError: document.getElementById("register-name-error"),
  registerEmailError: document.getElementById("register-email-error"),
  registerPasswordError: document.getElementById("register-password-error"),
  registerPasswordConfirmError: document.getElementById("register-password-confirm-error"),
  registerFormError: document.getElementById("register-form-error"),
  registerSubmit: document.getElementById("register-submit"),
  loginForm: document.getElementById("login-form"),
  registerForm: document.getElementById("register-form"),
  tabLogin: document.getElementById("tab-login"),
  tabRegister: document.getElementById("tab-register"),
  closeModal: document.getElementById("close-modal"),
  menuForm: document.getElementById("menu-form"),
  menuId: document.getElementById("menu-id"),
  menuName: document.getElementById("menu-name"),
  menuDesc: document.getElementById("menu-desc"),
  menuPrice: document.getElementById("menu-price"),
  menuImage: document.getElementById("menu-image"),
  paymentProvider: document.getElementById("payment-provider"),
  btnPayOrder: document.getElementById("btn-pay-order"),
  btnPlaceOrder: document.getElementById("btn-place-order"),
  btnSortOrders: document.getElementById("btn-sort-orders"),
  toastStack: document.getElementById("toast-stack"),
  adminMenuSection: document.getElementById("admin-menu-section"),
  staffSection: document.getElementById("staff-section"),
  statsSection: document.getElementById("stats-section"),
  settingsSection: document.getElementById("settings-section"),
  navSettings: document.getElementById("nav-settings"),
  mobileNavSettings: document.getElementById("mobile-nav-settings"),
  sectionNavLinks: Array.from(document.querySelectorAll('a[href^="#"]')),
  pageSections: Array.from(document.querySelectorAll('.app-content .container-fluid.py-4 > section[id$="-section"]'))
};

const formatMoney = (value) => `${Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA`;

const parseMoney = (value) => Number(String(value).replace(/[^\d]/g, "")) || 0;

const showToast = (title, message, type = "success") => {
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === "error" ? "fa-circle-exclamation" : "fa-circle-check"}" aria-hidden="true"></i>
    <div>
      <p class="toast__title">${title}</p>
      <p class="toast__message">${message}</p>
    </div>
  `;
  elements.toastStack.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3200);
};

const askConfirmation = (message) =>
  new Promise((resolve) => {
    elements.confirmMessage.textContent = message;
    elements.confirmModal.classList.remove("hidden");

    const onAccept = () => cleanup(true);
    const onCancel = () => cleanup(false);

    const onBackdrop = (event) => {
      if (event.target === elements.confirmModal) cleanup(false);
    };

    const cleanup = (value) => {
      elements.confirmModal.classList.add("hidden");
      elements.confirmAccept.removeEventListener("click", onAccept);
      elements.confirmCancel.removeEventListener("click", onCancel);
      elements.confirmClose.removeEventListener("click", onCancel);
      elements.confirmModal.removeEventListener("click", onBackdrop);
      resolve(value);
    };

    elements.confirmAccept.addEventListener("click", onAccept);
    elements.confirmCancel.addEventListener("click", onCancel);
    elements.confirmClose.addEventListener("click", onCancel);
    elements.confirmModal.addEventListener("click", onBackdrop);
  });

const apiFetch = async (path, options = {}) => {
  const headers = options.headers || {};
  if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

  const response = await fetch(`${API}${path}`, { ...options, headers, credentials: "same-origin" });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.message || "Erreur API");
  }
  return response.json();
};

const buildDateQuery = (dateFrom, dateTo) => {
  const params = new URLSearchParams();
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);
  return params.toString() ? `?${params.toString()}` : "";
};

const openModal = (tab) => {
  elements.authModal.classList.remove("hidden");
  switchTab(tab);
};

const isAuthLocked = () => document.body.classList.contains("auth-locked");

const setAuthLocked = (locked) => {
  document.body.classList.toggle("auth-locked", locked);
  if (elements.tabRegister) elements.tabRegister.classList.toggle("hidden", locked);
  if (elements.btnOpenRegisterMobile) elements.btnOpenRegisterMobile.classList.toggle("hidden", locked);
  if (locked) {
    elements.authModal.classList.remove("hidden");
    switchTab("login");
  }
};

const closeModal = () => {
  if (isAuthLocked()) return;
  elements.authModal.classList.add("hidden");
};

const switchTab = (tab) => {
  clearAuthFormFeedback("login");
  clearAuthFormFeedback("register");
  if (tab === "register") {
    if (elements.tabRegister) elements.tabRegister.classList.add("active");
    if (elements.tabLogin) elements.tabLogin.classList.remove("active");
    elements.registerForm.classList.remove("hidden");
    elements.loginForm.classList.add("hidden");
  } else {
    if (elements.tabLogin) elements.tabLogin.classList.add("active");
    if (elements.tabRegister) elements.tabRegister.classList.remove("active");
    elements.loginForm.classList.remove("hidden");
    elements.registerForm.classList.add("hidden");
  }
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

const setFieldError = (inputEl, errorEl, message = "") => {
  const field = inputEl?.closest(".form__field");
  if (errorEl) errorEl.textContent = message || "";
  if (field) field.classList.toggle("is-invalid", Boolean(message));
};

const clearAuthFormFeedback = (formType) => {
  if (formType === "login") {
    setFieldError(elements.loginEmail, elements.loginEmailError, "");
    setFieldError(elements.loginPassword, elements.loginPasswordError, "");
    elements.loginFormError?.classList.add("hidden");
    if (elements.loginFormError) elements.loginFormError.textContent = "";
    return;
  }
  setFieldError(elements.registerName, elements.registerNameError, "");
  setFieldError(elements.registerEmail, elements.registerEmailError, "");
  setFieldError(elements.registerPassword, elements.registerPasswordError, "");
  setFieldError(elements.registerPasswordConfirm, elements.registerPasswordConfirmError, "");
  elements.registerFormError?.classList.add("hidden");
  if (elements.registerFormError) elements.registerFormError.textContent = "";
};

const setSubmitPending = (button, pending, loadingText, defaultText) => {
  if (!button) return;
  button.disabled = pending;
  button.innerHTML = pending ? `<i class="fa-solid fa-spinner fa-spin"></i> ${loadingText}` : defaultText;
};

const validateLoginForm = () => {
  clearAuthFormFeedback("login");
  let valid = true;
  const email = elements.loginEmail.value.trim();
  const password = elements.loginPassword.value;

  if (!isValidEmail(email)) {
    setFieldError(elements.loginEmail, elements.loginEmailError, "Entrez une adresse email valide.");
    valid = false;
  }
  if (!password || password.length < 4) {
    setFieldError(elements.loginPassword, elements.loginPasswordError, "Le mot de passe est requis.");
    valid = false;
  }
  return valid;
};

const validateRegisterForm = () => {
  clearAuthFormFeedback("register");
  let valid = true;
  const name = elements.registerName.value.trim();
  const email = elements.registerEmail.value.trim();
  const password = elements.registerPassword.value;
  const passwordConfirm = elements.registerPasswordConfirm.value;

  if (name.length < 2) {
    setFieldError(elements.registerName, elements.registerNameError, "Le nom doit contenir au moins 2 caractères.");
    valid = false;
  }
  if (!isValidEmail(email)) {
    setFieldError(elements.registerEmail, elements.registerEmailError, "Entrez une adresse email valide.");
    valid = false;
  }
  if (!password || password.length < 6) {
    setFieldError(elements.registerPassword, elements.registerPasswordError, "Minimum 6 caractères.");
    valid = false;
  }
  if (passwordConfirm !== password) {
    setFieldError(elements.registerPasswordConfirm, elements.registerPasswordConfirmError, "Les mots de passe ne correspondent pas.");
    valid = false;
  }
  return valid;
};

const validateLoginField = (fieldName) => {
  if (fieldName === "email") {
    const email = elements.loginEmail.value.trim();
    const message = isValidEmail(email) ? "" : "Entrez une adresse email valide.";
    setFieldError(elements.loginEmail, elements.loginEmailError, message);
    return !message;
  }
  if (fieldName === "password") {
    const password = elements.loginPassword.value;
    const message = !password || password.length < 4 ? "Le mot de passe est requis." : "";
    setFieldError(elements.loginPassword, elements.loginPasswordError, message);
    return !message;
  }
  return true;
};

const validateRegisterField = (fieldName) => {
  if (fieldName === "name") {
    const name = elements.registerName.value.trim();
    const message = name.length < 2 ? "Le nom doit contenir au moins 2 caractères." : "";
    setFieldError(elements.registerName, elements.registerNameError, message);
    return !message;
  }
  if (fieldName === "email") {
    const email = elements.registerEmail.value.trim();
    const message = isValidEmail(email) ? "" : "Entrez une adresse email valide.";
    setFieldError(elements.registerEmail, elements.registerEmailError, message);
    return !message;
  }
  if (fieldName === "password") {
    const password = elements.registerPassword.value;
    const message = !password || password.length < 6 ? "Minimum 6 caractères." : "";
    setFieldError(elements.registerPassword, elements.registerPasswordError, message);
    if (elements.registerPasswordConfirm.value) {
      validateRegisterField("confirm");
    }
    return !message;
  }
  if (fieldName === "confirm") {
    const password = elements.registerPassword.value;
    const confirm = elements.registerPasswordConfirm.value;
    const message = confirm !== password ? "Les mots de passe ne correspondent pas." : "";
    setFieldError(elements.registerPasswordConfirm, elements.registerPasswordConfirmError, message);
    return !message;
  }
  return true;
};

const bindAuthRealtimeValidation = () => {
  const clearLoginAlert = () => {
    if (!elements.loginFormError) return;
    elements.loginFormError.classList.add("hidden");
    elements.loginFormError.textContent = "";
  };
  const clearRegisterAlert = () => {
    if (!elements.registerFormError) return;
    elements.registerFormError.classList.add("hidden");
    elements.registerFormError.textContent = "";
  };

  elements.loginEmail?.addEventListener("input", () => {
    validateLoginField("email");
    clearLoginAlert();
  });
  elements.loginEmail?.addEventListener("blur", () => validateLoginField("email"));
  elements.loginPassword?.addEventListener("input", () => {
    validateLoginField("password");
    clearLoginAlert();
  });
  elements.loginPassword?.addEventListener("blur", () => validateLoginField("password"));

  elements.registerName?.addEventListener("input", () => {
    validateRegisterField("name");
    clearRegisterAlert();
  });
  elements.registerName?.addEventListener("blur", () => validateRegisterField("name"));
  elements.registerEmail?.addEventListener("input", () => {
    validateRegisterField("email");
    clearRegisterAlert();
  });
  elements.registerEmail?.addEventListener("blur", () => validateRegisterField("email"));
  elements.registerPassword?.addEventListener("input", () => {
    validateRegisterField("password");
    clearRegisterAlert();
  });
  elements.registerPassword?.addEventListener("blur", () => validateRegisterField("password"));
  elements.registerPasswordConfirm?.addEventListener("input", () => {
    validateRegisterField("confirm");
    clearRegisterAlert();
  });
  elements.registerPasswordConfirm?.addEventListener("blur", () => validateRegisterField("confirm"));
};

const syncAuthUi = () => {
  const isLogged = Boolean(state.user);
  elements.btnLogout.classList.toggle("hidden", !isLogged);
  elements.btnOpenLogin.classList.toggle("hidden", isLogged);
  if (elements.btnOpenRegister) elements.btnOpenRegister.classList.toggle("hidden", isLogged);
  setAuthLocked(!isLogged);
};

const setAuth = (user) => {
  state.user = user;
  syncAuthUi();
  applyRoleVisibility();
};

const clearAuth = () => {
  state.user = null;
  syncAuthUi();
  applyRoleVisibility();
};

const hydrateSessionUser = async () => {
  try {
    const user = await apiFetch("/auth/me");
    setAuth(user);
    return user;
  } catch (error) {
    clearAuth();
    return null;
  }
};

const applyRoleVisibility = () => {
  const role = state.user?.role;
  const isAdmin = role === "admin";
  elements.adminMenuSection.classList.toggle("hidden", role !== "admin");
  elements.staffSection.classList.toggle("hidden", !["admin", "staff", "server"].includes(role));
  elements.statsSection.classList.toggle("hidden", !["admin", "staff", "server"].includes(role));
  if (elements.settingsSection) elements.settingsSection.classList.toggle("hidden", !isAdmin);
  if (elements.navSettings) elements.navSettings.classList.toggle("hidden", !isAdmin);
  if (elements.mobileNavSettings) elements.mobileNavSettings.classList.toggle("hidden", !isAdmin);
  activateSection(window.location.hash.replace("#", "") || "menu-section");
};

const getNavigableSections = () => elements.pageSections.filter((section) => !section.classList.contains("hidden"));

const setNavActive = (sectionId) => {
  elements.sectionNavLinks.forEach((link) => {
    if (!link.classList.contains("nav-link")) return;
    link.classList.toggle("active", link.getAttribute("href") === `#${sectionId}`);
  });
};

const activateSection = (requestedId) => {
  const available = getNavigableSections();
  if (!available.length) return;
  const target = available.find((section) => section.id === requestedId) || available[0];
  elements.pageSections.forEach((section) => {
    section.style.display = section.id === target.id ? "" : "none";
  });
  setNavActive(target.id);
  if (window.location.hash !== `#${target.id}`) {
    history.replaceState(null, "", `#${target.id}`);
  }
};

const setMenuState = ({ loading = false, empty = false }) => {
  elements.menuLoading.classList.toggle("hidden", !loading);
  elements.menuLoading.setAttribute("aria-hidden", loading ? "false" : "true");
  elements.menuEmpty.classList.toggle("hidden", !empty);
  elements.menuEmpty.setAttribute("aria-hidden", empty ? "false" : "true");
  elements.menuGrid.classList.toggle("hidden", loading || empty);
};

const setOrdersLoadingState = (loading) => {
  if (!elements.ordersList) return;
  if (!loading) return;
  elements.ordersList.innerHTML = `
    <div class="state state--loading state--loading-list" aria-hidden="false">
      <div class="skeleton skeleton--line"></div>
      <div class="skeleton skeleton--line"></div>
      <div class="skeleton skeleton--line"></div>
    </div>
  `;
};

const setStatsLoadingState = (loading) => {
  if (!elements.salesList || !elements.popularList) return;
  if (!loading) return;
  const loadingHtml = `
    <div class="state state--loading state--loading-list" aria-hidden="false">
      <div class="skeleton skeleton--line"></div>
      <div class="skeleton skeleton--line"></div>
      <div class="skeleton skeleton--line"></div>
    </div>
  `;
  elements.salesList.innerHTML = loadingHtml;
  elements.popularList.innerHTML = loadingHtml;
};

const getCategory = (item) => {
  if (item.category_name) return item.category_name;
  if (item.category) return item.category;
  if (!item.description) return "Plats";
  const text = item.description.toLowerCase();
  if (text.includes("boisson")) return "Boissons";
  if (text.includes("dessert")) return "Desserts";
  if (text.includes("entree") || text.includes("entrée")) return "Entrées";
  return "Plats";
};

const getFilteredMenu = () => {
  if (state.menuFilter === "Tous") return state.menu;
  return state.menu.filter((item) => getCategory(item) === state.menuFilter);
};

const normalizeLabel = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const DISH_IMAGE_BY_NAME = {
  "pastels au thon": "https://i.pinimg.com/736x/32/4c/5d/324c5dd3a1de97f5a230626eb6e60cff.jpg",
  "salade sahelienne": "https://i.pinimg.com/1200x/a7/3a/ea/a73aea6086a453958d9b3ddfb9a06470.jpg",
  "brochettes de foie": "https://i.pinimg.com/1200x/81/b2/e4/81b2e460fadc8dfc91b038dc1888daf3.jpg",
  dambou: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRYJhqoviQaGDM4OnD2UBIm3bzeg94kJaTvFQ&s",
  "to de mil & sauce arachide": "https://i.pinimg.com/736x/fd/7a/c3/fd7ac351c82606b3886a1a12ff64d900.jpg",
  "riz gras nigerien": "https://i.pinimg.com/1200x/3b/fe/7b/3bfe7bc3ef1eafe5b600412c513c1809.jpg",
  "sauce gombo & poulet": "https://i.pinimg.com/736x/54/29/df/5429dff7ad0f2e81296d2824bffead7a.jpg",
  "poulet bicyclette": "https://images.unsplash.com/photo-1518492104633-130d0cc84637?q=80&w=1200&auto=format&fit=crop",
  "sauce feuilles & mil": "https://i.pinimg.com/1200x/e9/8d/4e/e98d4ea0d4a22e9cac2902e221329437.jpg",
  "jus de bissap": "https://i.pinimg.com/1200x/07/61/8a/07618a34682837e6026c9be2984ab540.jpg",
  "jus de gingembre": "https://i.pinimg.com/1200x/ff/a1/85/ffa185bf422b6153ef7413972dddb670.jpg",
  "fura da nono": "https://i.pinimg.com/736x/89/8c/1f/898c1f770cbf6a5202feaf9da4f9f072.jpg",
  "jus de tamarin": "https://i.pinimg.com/1200x/c4/31/a7/c431a7964c91512478f0c51056652238.jpg",
  "zomkom (eau de mil)": "https://i.pinimg.com/736x/30/5c/aa/305caab57e3e3428ba9b2a7de86fa6c2.jpg",
  "beignets de mil": "https://i.pinimg.com/1200x/3f/d8/db/3fd8db91fb9bd68a38bf6b13db186c36.jpg",
  "galettes de niebe": "https://i.pinimg.com/736x/a1/d6/fd/a1d6fd34961092e836fdf563c36a2282.jpg",
  "dambou sucre": "https://i.pinimg.com/1200x/1c/fd/2f/1cfd2f1f165dcae74eb93705828b5299.jpg",
  "kuli-kuli": "https://i.pinimg.com/1200x/13/e0/fa/13e0fa39260a63080852e8afe6c0edac.jpg",
  "masa (crepes de riz)": "https://i.pinimg.com/736x/69/20/2b/69202bd829ed89573221b2ca4f018ade.jpg"
};

const buildDishFallbackImage = (item) => {
  const title = String(item?.name || "Plat");
  const category = String(getCategory(item) || "Menu");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1f3a5f" />
          <stop offset="100%" stop-color="#2b5876" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#g)" />
      <circle cx="980" cy="140" r="120" fill="rgba(255,255,255,0.08)" />
      <circle cx="140" cy="690" r="180" fill="rgba(255,255,255,0.07)" />
      <text x="80" y="390" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="64" font-weight="700">${title}</text>
      <text x="80" y="455" fill="#dbeafe" font-family="Segoe UI, Arial, sans-serif" font-size="34">${category}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const getImageSource = (item) => {
  const mapped = DISH_IMAGE_BY_NAME[normalizeLabel(item?.name)];
  if (mapped) return mapped;
  const src = String(item?.image_url || "").trim();
  return src || buildDishFallbackImage(item);
};

const renderMenu = () => {
  const filteredMenu = getFilteredMenu();
  setMenuState({ loading: false, empty: !filteredMenu.length });
  if (!filteredMenu.length) return;

  const menuTemplate = (item, admin = false) => `
    <article class="menu-card" aria-label="${item.name}">
      <div class="menu-card__media">
        <img class="menu-card__image" src="${getImageSource(item)}" alt="${item.name}" loading="lazy" data-fallback="${buildDishFallbackImage(item)}">
      </div>
      <div class="menu-card__body">
        <h3 class="menu-card__title">${item.name}</h3>
        <p>${item.description}</p>
        <p class="muted">Stock: ${item.stock ?? 0}</p>
        <div class="menu-card__price">${formatMoney(item.price)}</div>
        <div class="menu-card__actions">
          ${
            admin
              ? `
              <button class="btn btn--outline" data-edit="${item.id}"><i class="fa-solid fa-pen"></i> Modifier</button>
              <button class="btn btn--ghost" data-delete="${item.id}"><i class="fa-solid fa-trash"></i> Supprimer</button>
            `
              : `
              <button class="btn btn--primary" data-add="${item.id}" ${(item.stock ?? 0) <= 0 ? "disabled" : ""}>
                <i class="fa-solid fa-plus"></i> ${(item.stock ?? 0) <= 0 ? "Indisponible" : "Ajouter au panier"}
              </button>
            `
          }
        </div>
      </div>
    </article>
  `;

  elements.menuGrid.innerHTML = filteredMenu.map((item) => menuTemplate(item, false)).join("");
  elements.adminMenuList.innerHTML = state.menu.map((item) => menuTemplate(item, true)).join("");

  elements.menuGrid.querySelectorAll("button[data-add]").forEach((button) => {
    button.addEventListener("click", () => addToCart(Number(button.dataset.add)));
  });
  elements.adminMenuList.querySelectorAll("button[data-edit]").forEach((button) => {
    button.addEventListener("click", () => editMenuItem(Number(button.dataset.edit)));
  });
  elements.adminMenuList.querySelectorAll("button[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteMenuItem(Number(button.dataset.delete)));
  });

  document.querySelectorAll("img[data-fallback]").forEach((img) => {
    img.addEventListener("error", () => {
      const fallback = img.getAttribute("data-fallback");
      if (fallback && img.src !== fallback) {
        img.src = fallback;
      }
    });
  });
};

const addToCart = (menuItemId) => {
  const item = state.menu.find((m) => m.id === menuItemId);
  if (!item) return;
  if ((item.stock ?? 0) <= 0) {
    showToast("Indisponible", "Ce plat n'est plus en stock.", "error");
    return;
  }
  const existing = state.cart.find((c) => c.menu_item_id === menuItemId);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ menu_item_id: menuItemId, name: item.name, price: item.price, quantity: 1 });
  }
  renderCart();
  showToast("Panier mis a jour", `${item.name} ajoute au panier.`);
};

const renderCart = () => {
  if (!state.cart.length) {
    elements.cartItems.innerHTML = `
      <div class="state state--empty">
        <div class="state__media" aria-hidden="true">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="22" y="30" width="76" height="50" rx="12" stroke="#C1440E" stroke-width="3" />
            <path d="M38 50h44" stroke="#D4AF37" stroke-width="3" stroke-linecap="round" />
            <path d="M48 62h24" stroke="#1B5E20" stroke-width="3" stroke-linecap="round" />
          </svg>
        </div>
        <div>
          <h3>Votre panier est vide</h3>
          <p>Ajoutez vos plats favoris pour lancer la commande.</p>
        </div>
      </div>
    `;
  } else {
    elements.cartItems.innerHTML = state.cart
      .map(
        (item) => `
      <article class="cart-item">
        <div class="cart-item__info">
          <strong>${item.name}</strong>
          <div>${formatMoney(item.price)} x ${item.quantity}</div>
        </div>
        <div class="cart-item__actions">
          <button class="btn btn--outline btn--icon" data-dec="${item.menu_item_id}" aria-label="Retirer une portion"><i class="fa-solid fa-minus"></i></button>
          <button class="btn btn--primary btn--icon" data-inc="${item.menu_item_id}" aria-label="Ajouter une portion"><i class="fa-solid fa-plus"></i></button>
        </div>
      </article>
    `
      )
      .join("");

    elements.cartItems.querySelectorAll("button[data-inc]").forEach((button) => {
      button.addEventListener("click", () => updateCart(button.dataset.inc, 1));
    });
    elements.cartItems.querySelectorAll("button[data-dec]").forEach((button) => {
      button.addEventListener("click", () => updateCart(button.dataset.dec, -1));
    });
  }

  const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  elements.cartTotal.textContent = formatMoney(total);
};

const updateCart = (menuItemId, delta) => {
  const item = state.cart.find((c) => c.menu_item_id === Number(menuItemId));
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    state.cart = state.cart.filter((c) => c.menu_item_id !== Number(menuItemId));
  }
  renderCart();
};

const placeOrder = async () => {
  if (!state.user) {
    openModal("login");
    showToast("Connexion requise", "Connectez-vous pour passer une commande.", "error");
    return;
  }
  if (!state.cart.length) {
    showToast("Panier vide", "Ajoutez un plat avant de commander.", "error");
    return;
  }

  const accepted = await askConfirmation("Valider cette commande maintenant ?");
  if (!accepted) return;

  try {
    await apiFetch("/orders", {
      method: "POST",
      body: JSON.stringify({
        items: state.cart.map((item) => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity
        }))
      })
    });
    state.cart = [];
    renderCart();
    await loadOrders();
    await loadStats();
    showToast("Commande validee", "Votre commande est en preparation.");
  } catch (error) {
    showToast("Erreur", error.message, "error");
  }
};

const payOrderOnline = async () => {
  if (!state.user) {
    openModal("login");
    showToast("Connexion requise", "Connectez-vous pour payer une commande.", "error");
    return;
  }
  if (!state.cart.length) {
    showToast("Panier vide", "Ajoutez un plat avant de payer.", "error");
    return;
  }
  const provider = elements.paymentProvider?.value || "stripe";
  if (
    state.paymentProviders.loaded &&
    !state.paymentProviders[provider]
  ) {
    showToast(
      "Paiement indisponible",
      `Le moyen ${provider === "flutterwave" ? "Flutterwave" : "Stripe"} n'est pas configuré côté serveur.`,
      "error"
    );
    return;
  }
  const providerLabel = provider === "flutterwave" ? "Flutterwave" : "Stripe";
  const accepted = await askConfirmation(`Continuer vers ${providerLabel} pour payer cette commande ?`);
  if (!accepted) return;

  setSubmitPending(
    elements.btnPayOrder,
    true,
    "Redirection...",
    '<i class="fa-solid fa-credit-card"></i> Payer en ligne'
  );
  try {
    const response = await apiFetch("/payments/checkout", {
      method: "POST",
      body: JSON.stringify({
        provider,
        name: state.user.name,
        email: state.user.email,
        items: state.cart.map((item) => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity
        }))
      })
    });
    if (!response.checkout_url) {
      throw new Error("URL de paiement introuvable.");
    }
    window.location.href = response.checkout_url;
  } catch (error) {
    showToast("Paiement", error.message, "error");
    setSubmitPending(
      elements.btnPayOrder,
      false,
      "Redirection...",
      '<i class="fa-solid fa-credit-card"></i> Payer en ligne'
    );
  }
};

const handlePaymentReturn = async () => {
  const params = new URLSearchParams(window.location.search);
  const provider = params.get("payment_provider");
  const orderId = Number(params.get("order_id"));
  if (!provider || !orderId || Number.isNaN(orderId)) return;
  if (params.get("payment") === "cancelled") {
    showToast("Paiement annulé", "Le paiement a été annulé.", "error");
    params.delete("payment");
    params.delete("payment_provider");
    params.delete("order_id");
    params.delete("session_id");
    params.delete("transaction_id");
    const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", cleanUrl);
    return;
  }

  try {
    const payload = { provider, order_id: orderId };
    if (provider === "stripe") {
      payload.session_id = params.get("session_id");
    } else if (provider === "flutterwave") {
      payload.transaction_id = params.get("transaction_id");
    }
    const order = await apiFetch("/payments/verify", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    state.cart = [];
    renderCart();
    await loadOrders();
    await loadStats();
    showToast("Paiement confirmé", `Commande #${order.id} validée avec succès.`);
  } catch (error) {
    showToast("Paiement", error.message || "Vérification du paiement impossible.", "error");
  } finally {
    params.delete("payment");
    params.delete("payment_provider");
    params.delete("order_id");
    params.delete("session_id");
    params.delete("transaction_id");
    params.delete("status");
    params.delete("tx_ref");
    const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", cleanUrl);
  }
};

const loadPaymentProviders = async () => {
  if (!elements.paymentProvider || !elements.btnPayOrder) return;
  try {
    const data = await apiFetch("/payments/providers");
    const providers = data.providers || {};
    const stripeEnabled = Boolean(providers.stripe?.enabled);
    const flutterwaveEnabled = Boolean(providers.flutterwave?.enabled);
    state.paymentProviders = {
      stripe: stripeEnabled,
      flutterwave: flutterwaveEnabled,
      loaded: true
    };
    const stripeOption = elements.paymentProvider.querySelector('option[value="stripe"]');
    const flutterOption = elements.paymentProvider.querySelector('option[value="flutterwave"]');
    if (stripeOption) stripeOption.textContent = stripeEnabled ? "Stripe (Carte)" : "Stripe (Carte) - indisponible";
    if (flutterOption) flutterOption.textContent = flutterwaveEnabled
      ? "Flutterwave (Carte / Mobile Money)"
      : "Flutterwave (Carte / Mobile Money) - indisponible";
    if (!stripeEnabled && flutterwaveEnabled) elements.paymentProvider.value = "flutterwave";
    if (stripeEnabled && !flutterwaveEnabled) elements.paymentProvider.value = "stripe";
    if (!stripeEnabled && !flutterwaveEnabled) {
      elements.btnPayOrder.disabled = false;
      elements.btnPayOrder.title = "Paiement non configuré côté serveur.";
    } else {
      elements.btnPayOrder.disabled = false;
      elements.btnPayOrder.title = "";
    }
  } catch (error) {
    state.paymentProviders = {
      stripe: false,
      flutterwave: false,
      loaded: false
    };
    elements.btnPayOrder.disabled = false;
    elements.btnPayOrder.title = "Impossible de vérifier les moyens de paiement.";
  }
};

const loadMenu = async () => {
  setMenuState({ loading: true, empty: false });
  try {
    state.menu = await apiFetch("/menu");
    renderMenu();
  } catch (error) {
    setMenuState({ loading: false, empty: true });
    showToast("Erreur", error.message, "error");
  }
};

const loadOrders = async () => {
  if (!state.user) {
    elements.ordersList.innerHTML = `
      <div class="state">
        <div class="state__media" aria-hidden="true">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="34" stroke="#1B5E20" stroke-width="3" />
            <path d="M60 42v20l12 8" stroke="#C1440E" stroke-width="3" stroke-linecap="round" />
          </svg>
        </div>
        <div>
          <h3>Connectez-vous pour voir vos commandes</h3>
          <p>Accedez a votre historique et au suivi en direct.</p>
        </div>
      </div>
    `;
    return;
  }

  try {
    setOrdersLoadingState(true);
    const query = buildDateQuery(state.filters.ordersDateFrom, state.filters.ordersDateTo);
    const orders = await apiFetch(`/orders${query}`);
    const summary = { en_preparation: 0, prete: 0, livree: 0 };
    orders.forEach((order) => {
      summary[order.status] += 1;
    });

    elements.statusSummary.innerHTML = `
      <div><strong>${summary.en_preparation}</strong><span>En préparation</span></div>
      <div><strong>${summary.prete}</strong><span>Prêtes</span></div>
      <div><strong>${summary.livree}</strong><span>Livrées</span></div>
    `;

    elements.ordersList.innerHTML = orders.map((order) => renderOrderCard(order, false)).join("");
    bindExportPdfButtons(elements.ordersList, orders);

    if (["admin", "staff", "server"].includes(state.user?.role)) {
      elements.staffOrders.innerHTML = orders.map((order) => renderOrderCard(order, true)).join("");
      bindExportPdfButtons(elements.staffOrders, orders);
      elements.staffOrders.querySelectorAll("select").forEach((select) => {
        select.addEventListener("change", () => updateOrderStatus(select.dataset.id, select.value));
      });
    }
  } catch (error) {
    showToast("Erreur", error.message, "error");
  }
};

const renderOrderCard = (order, editable) => {
  const items = order.items.map((item) => `${item.menu_item?.name || "Plat"} x${item.quantity}`).join(", ");
  const paymentMeta = order.payment_status && order.payment_status !== "not_required"
    ? `<span class="order-status ${paymentStatusClass(order.payment_status)}">Paiement: ${paymentStatusLabel(order.payment_status)}</span>`
    : "";
  return `
    <article class="order-card">
      <div class="order-card__meta">
        <span>Commande #${order.id}</span>
        ${editable ? "" : `<span class="order-status ${statusClass(order.status)}">${statusLabel(order.status)}</span>`}
        ${paymentMeta}
      </div>
      <div class="order-card__items">${items}</div>
      <div class="order-card__total">Total: ${formatMoney(order.total)}</div>
      <div>
        <button class="btn btn-outline-secondary btn-sm" data-export-pdf="${order.id}" type="button">
          <i class="fa-solid fa-file-pdf"></i> Exporter PDF
        </button>
      </div>
      ${
        editable
          ? `
        <label class="form__field form__field--full">Statut
          <select data-id="${order.id}">
            <option value="en_preparation" ${order.status === "en_preparation" ? "selected" : ""}>En préparation</option>
            <option value="prete" ${order.status === "prete" ? "selected" : ""}>Prête</option>
            <option value="livree" ${order.status === "livree" ? "selected" : ""}>Livrée</option>
          </select>
        </label>
      `
          : ""
      }
    </article>
  `;
};

const statusLabel = (status) => {
  if (status === "en_preparation") return "En préparation";
  if (status === "prete") return "Prête";
  if (status === "livree") return "Livrée";
  if (status === "draft") return "Brouillon";
  return status;
};

const statusClass = (status) => {
  if (status === "en_preparation") return "badge--info";
  if (status === "prete") return "badge--success";
  if (status === "livree") return "badge--success";
  return "badge--warning";
};

const paymentStatusLabel = (status) => {
  if (status === "pending") return "En attente";
  if (status === "paid") return "Payé";
  if (status === "failed") return "Échoué";
  return status || "N/A";
};

const paymentStatusClass = (status) => {
  if (status === "paid") return "badge--success";
  if (status === "failed") return "badge--warning";
  return "badge--info";
};

const exportOrderPdf = (order) => {
  const jsPdfObj = window.jspdf;
  if (!jsPdfObj || !order) {
    showToast("Erreur", "Export PDF indisponible.", "error");
    return;
  }
  const { jsPDF } = jsPdfObj;
  const doc = new jsPDF();
  let y = 20;
  doc.setFontSize(16);
  doc.text("Facture - Sahel Kitchen", 14, y);
  y += 10;
  doc.setFontSize(11);
  doc.text(`Commande: #${order.id}`, 14, y);
  y += 7;
  doc.text(`Date: ${new Date(order.created_at).toLocaleString("fr-FR")}`, 14, y);
  y += 7;
  doc.text(`Statut: ${statusLabel(order.status)}`, 14, y);
  y += 10;
  doc.text("Articles:", 14, y);
  y += 8;
  order.items.forEach((item) => {
    const line = `- ${item.menu_item?.name || "Plat"} x${item.quantity} : ${formatMoney(item.unit_price * item.quantity)}`;
    doc.text(line, 14, y);
    y += 7;
  });
  y += 4;
  doc.setFontSize(12);
  doc.text(`Total: ${formatMoney(order.total)}`, 14, y);
  doc.save(`facture_commande_${order.id}.pdf`);
};

const bindExportPdfButtons = (container, orders) => {
  container.querySelectorAll("button[data-export-pdf]").forEach((button) => {
    button.addEventListener("click", () => {
      const order = orders.find((o) => o.id === Number(button.dataset.exportPdf));
      exportOrderPdf(order);
    });
  });
};

const updateOrderStatus = async (orderId, status) => {
  try {
    await apiFetch(`/orders/${orderId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status })
    });
    await loadOrders();
    showToast("Statut mis a jour", `Commande #${orderId} mise a jour.`);
  } catch (error) {
    showToast("Erreur", error.message, "error");
  }
};

const editMenuItem = (id) => {
  const item = state.menu.find((m) => m.id === id);
  if (!item) return;
  elements.menuId.value = item.id;
  elements.menuName.value = item.name;
  elements.menuDesc.value = item.description;
  elements.menuPrice.value = item.price;
  elements.menuImage.value = item.image_url || "";
  elements.menuName.scrollIntoView({ behavior: "smooth" });
  showToast("Edition", `Modification de "${item.name}".`);
};

const deleteMenuItem = async (id) => {
  const accepted = await askConfirmation("Supprimer ce plat du menu ?");
  if (!accepted) return;
  try {
    await apiFetch(`/menu/${id}`, { method: "DELETE" });
    await loadMenu();
    showToast("Plat supprimé", "Le menu a été actualisé.");
  } catch (error) {
    showToast("Erreur", error.message, "error");
  }
};

const saveMenuItem = async (event) => {
  event.preventDefault();
  const payload = {
    name: elements.menuName.value,
    description: elements.menuDesc.value,
    price: Number(elements.menuPrice.value),
    image_url: elements.menuImage.value
  };

  try {
    if (elements.menuId.value) {
      await apiFetch(`/menu/${elements.menuId.value}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      showToast("Plat modifié", "Les informations ont été enregistrées.");
    } else {
      await apiFetch("/menu", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      showToast("Plat ajouté", "Nouveau plat disponible dans le menu.");
    }
    elements.menuForm.reset();
    elements.menuId.value = "";
    await loadMenu();
  } catch (error) {
    showToast("Erreur", error.message, "error");
  }
};

const loadStats = async () => {
  if (!["admin", "staff", "server"].includes(state.user?.role)) return;
  try {
    setStatsLoadingState(true);
    const query = buildDateQuery(state.filters.statsDateFrom, state.filters.statsDateTo);
    const sales = await apiFetch(`/stats/sales${query}`);
    const popular = await apiFetch("/stats/popular");

    elements.salesList.innerHTML =
      sales
        .map(
          (row) => `
      <div class="stat-item"><span>${row.day}</span><span>${formatMoney(row.total)}</span></div>
    `
        )
        .join("") ||
      `
      <div class="state">
        <div>
          <h3>Aucune donnée</h3>
          <p>Les ventes apparaîtront ici dès qu'elles seront disponibles.</p>
        </div>
      </div>
    `;

    elements.popularList.innerHTML =
      popular
        .map(
          (row) => `
      <div class="stat-item"><span>${row.name}</span><span>${row.quantity}</span></div>
    `
        )
        .join("") ||
      `
      <div class="state">
        <div>
          <h3>Aucun plat populaire</h3>
          <p>Les tendances se mettront à jour automatiquement.</p>
        </div>
      </div>
    `;
    renderCharts(sales, popular);
  } catch (error) {
    showToast("Erreur", "Impossible de charger les statistiques.", "error");
  }
};

const renderCharts = (sales, popular) => {
  const salesCanvas = document.getElementById("sales-chart");
  const popularCanvas = document.getElementById("popular-chart");
  if (!salesCanvas || !popularCanvas || typeof Chart === "undefined") return;

  const salesLabels = [...sales].reverse().map((row) => row.day);
  const salesValues = [...sales].reverse().map((row) => row.total);
  const popularLabels = popular.map((row) => row.name);
  const popularValues = popular.map((row) => row.quantity);

  if (state.charts.sales) state.charts.sales.destroy();
  if (state.charts.popular) state.charts.popular.destroy();

  state.charts.sales = new Chart(salesCanvas, {
    type: "line",
    data: {
      labels: salesLabels,
      datasets: [
        {
          label: "Ventes (FCFA)",
          data: salesValues,
          borderColor: "#1f3a5f",
          backgroundColor: "rgba(31,58,95,0.15)",
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });

  state.charts.popular = new Chart(popularCanvas, {
    type: "bar",
    data: {
      labels: popularLabels,
      datasets: [
        {
          label: "Quantité",
          data: popularValues,
          backgroundColor: "rgba(46,125,50,0.75)"
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
};

const sortOrdersTable = () => {
  const table = document.querySelector(".table table tbody");
  if (!table) return;
  const rows = Array.from(table.querySelectorAll("tr"));
  rows.sort((a, b) => {
    const amountA = parseMoney(a.cells[3]?.textContent || "");
    const amountB = parseMoney(b.cells[3]?.textContent || "");
    return state.isOrderSortAsc ? amountA - amountB : amountB - amountA;
  });
  rows.forEach((row) => table.appendChild(row));
  state.isOrderSortAsc = !state.isOrderSortAsc;
};

const bindMenuFilters = () => {
  elements.menuFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.menuFilter = button.textContent.trim();
      elements.menuFilterButtons.forEach((chip) => chip.classList.remove("chip--active"));
      button.classList.add("chip--active");
      renderMenu();
    });
  });
};

const bindSidebarNav = () => {
  elements.sectionNavLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (!href.startsWith("#")) return;
    const sectionId = href.replace("#", "").trim();
    if (!sectionId) return;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      activateSection(sectionId);
    });
  });
  window.addEventListener("hashchange", () => {
    activateSection(window.location.hash.replace("#", "") || "menu-section");
  });
};

const init = async () => {
  await hydrateSessionUser();
  const isLoginPath = window.location.pathname === "/login";
  if (state.user && isLoginPath) {
    window.location.replace("/dashboard");
    return;
  }
  if (!state.user && !isLoginPath) {
    window.location.replace("/login");
    return;
  }
  bindSidebarNav();
  bindMenuFilters();
  bindAuthRealtimeValidation();
  if (state.user) {
    await loadPaymentProviders();
    await handlePaymentReturn();
    await loadMenu();
    await loadOrders();
    await loadStats();
    renderCart();
    activateSection(window.location.hash.replace("#", "") || "menu-section");
  }
};

elements.btnOpenLogin.addEventListener("click", () => openModal("login"));
if (elements.btnOpenRegister) elements.btnOpenRegister.addEventListener("click", () => openModal("register"));
if (elements.btnOpenLoginMobile) elements.btnOpenLoginMobile.addEventListener("click", () => openModal("login"));
if (elements.btnOpenRegisterMobile) elements.btnOpenRegisterMobile.addEventListener("click", () => openModal("register"));
elements.closeModal.addEventListener("click", closeModal);

elements.authModal.addEventListener("click", (event) => {
  if (isAuthLocked()) return;
  if (event.target === elements.authModal) closeModal();
});

if (elements.tabLogin) elements.tabLogin.addEventListener("click", () => switchTab("login"));
if (elements.tabRegister) elements.tabRegister.addEventListener("click", () => switchTab("register"));

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateLoginForm()) return;
  setSubmitPending(elements.loginSubmit, true, "Connexion...", '<i class="fa-solid fa-user"></i> Se connecter');
  try {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: elements.loginEmail.value.trim(),
        password: elements.loginPassword.value
      })
    });
    setAuth(data.user);
    elements.loginForm.reset();
    closeModal();
    await loadOrders();
    await loadStats();
    showToast("Connexion réussie", "Bienvenue sur votre espace.");
    window.location.replace("/dashboard");
  } catch (error) {
    if (elements.loginFormError) {
      elements.loginFormError.textContent = error.message || "Impossible de se connecter.";
      elements.loginFormError.classList.remove("hidden");
    }
    showToast("Erreur de connexion", error.message, "error");
  } finally {
    setSubmitPending(elements.loginSubmit, false, "Connexion...", '<i class="fa-solid fa-user"></i> Se connecter');
  }
});

elements.registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateRegisterForm()) return;
  setSubmitPending(elements.registerSubmit, true, "Création...", '<i class="fa-solid fa-user-plus"></i> Créer un compte');
  try {
    const data = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: elements.registerName.value.trim(),
        email: elements.registerEmail.value.trim(),
        password: elements.registerPassword.value
      })
    });
    setAuth(data.user);
    elements.registerForm.reset();
    closeModal();
    showToast("Compte créé", "Votre compte professionnel est actif.");
    window.location.replace("/dashboard");
  } catch (error) {
    if (elements.registerFormError) {
      elements.registerFormError.textContent = error.message || "Impossible de créer le compte.";
      elements.registerFormError.classList.remove("hidden");
    }
    showToast("Erreur", error.message, "error");
  } finally {
    setSubmitPending(elements.registerSubmit, false, "Création...", '<i class="fa-solid fa-user-plus"></i> Créer un compte');
  }
});

elements.btnLogout.addEventListener("click", async () => {
  const accepted = await askConfirmation("Voulez-vous vous déconnecter ?");
  if (!accepted) return;
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch (error) {
    // Ignore API logout errors and force local auth clear.
  }
  clearAuth();
  window.location.replace("/login");
});

elements.menuForm.addEventListener("submit", saveMenuItem);
elements.btnPlaceOrder.addEventListener("click", placeOrder);
if (elements.btnPayOrder) elements.btnPayOrder.addEventListener("click", payOrderOnline);
if (elements.btnSortOrders) elements.btnSortOrders.addEventListener("click", sortOrdersTable);
if (elements.btnApplyOrdersFilter) {
  elements.btnApplyOrdersFilter.addEventListener("click", async () => {
    state.filters.ordersDateFrom = elements.ordersDateFrom?.value || "";
    state.filters.ordersDateTo = elements.ordersDateTo?.value || "";
    await loadOrders();
  });
}
if (elements.btnApplyStatsFilter) {
  elements.btnApplyStatsFilter.addEventListener("click", async () => {
    state.filters.statsDateFrom = elements.statsDateFrom?.value || "";
    state.filters.statsDateTo = elements.statsDateTo?.value || "";
    await loadStats();
  });
}

init();
