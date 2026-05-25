/* ============================================================
   STAFF MANAGEMENT SOFTWARE — BASE JS
   Sidebar, dropdowns, clock, theme, notifications, command palette
============================================================ */

document.addEventListener("DOMContentLoaded", function () {
//   initPagePreloader();
  initOrbitPageLoader();
  initSidebarMobile();
  initSidebarCollapse();
  initSidebarDropdowns();
  initActiveSubmenus();
  initFlashMessages();
if (typeof initSMSFlashSystem === "function") {
  initSMSFlashSystem();
}
  initLiveClock();
  initFooterYear();
  initThemeToggle();
  initFullscreenButton();
  initNotificationDropdown();
  initCommandPalette();
  initGlobalSearchShortcut();
});


/* ============================================================
   PAGE PRELOADER
   Shows full loading screen only once per browser session
============================================================ */

function initPagePreloader() {
  const preloader = document.getElementById("pagePreloader");

  if (!preloader) return;

  const hasLoadedBefore = sessionStorage.getItem("smsHasLoadedBefore");

  if (hasLoadedBefore === "true") {
    preloader.classList.add("hide");
    preloader.style.display = "none";
    return;
  }

  setTimeout(function () {
    preloader.classList.add("hide");
    sessionStorage.setItem("smsHasLoadedBefore", "true");

    setTimeout(function () {
      preloader.style.display = "none";
    }, 250);
  }, 450);
}


/* ============================================================
   MINI ORBIT PAGE LOADER
   Shows small orbit loader when moving between pages
============================================================ */

function initOrbitPageLoader() {
  injectOrbitLoaderStyles();

  const loader = document.createElement("div");
  loader.id = "smsOrbitLoader";
  loader.className = "sms-orbit-loader";
  loader.innerHTML = `
    <div class="orbit-system" aria-label="Loading page">
      <span class="orbit-core"></span>
      <span class="orbit-ring orbit-ring-one"></span>
      <span class="orbit-ring orbit-ring-two"></span>
      <span class="orbit-dot orbit-dot-one"></span>
      <span class="orbit-dot orbit-dot-two"></span>
    </div>
    <span class="orbit-text">Opening page...</span>
  `;

  document.body.appendChild(loader);

  function showOrbitLoader() {
    loader.classList.add("show");
  }

  function hideOrbitLoader() {
    loader.classList.remove("show");
  }

  window.addEventListener("pageshow", hideOrbitLoader);

  document.addEventListener("click", function (event) {
    const link = event.target.closest("a");

    if (!link) return;

    const href = link.getAttribute("href");
    const target = link.getAttribute("target");

    if (
      !href ||
      href === "#" ||
      href.startsWith("#") ||
      href.startsWith("javascript:") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      target === "_blank" ||
      link.hasAttribute("download")
    ) {
      return;
    }

    const currentHost = window.location.host;
    const nextUrl = new URL(link.href, window.location.href);

    if (nextUrl.host !== currentHost) return;

    showOrbitLoader();
  });

  window.addEventListener("beforeunload", function () {
    showOrbitLoader();
  });
}


function injectOrbitLoaderStyles() {
  if (document.getElementById("smsOrbitLoaderStyles")) return;

  const style = document.createElement("style");
  style.id = "smsOrbitLoaderStyles";
  style.textContent = `
    .sms-orbit-loader {
      position: fixed;
      right: 26px;
      bottom: 26px;
      z-index: 5000;
      min-width: 190px;
      min-height: 64px;
      padding: 12px 16px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid rgba(203, 213, 225, 0.9);
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.16);
      display: flex;
      align-items: center;
      gap: 12px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(12px) scale(0.96);
      pointer-events: none;
      transition: opacity 0.18s ease, visibility 0.18s ease, transform 0.18s ease;
      backdrop-filter: blur(14px);
    }

    .sms-orbit-loader.show {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }

    .orbit-system {
      position: relative;
      width: 42px;
      height: 42px;
      min-width: 42px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .orbit-core {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #00c7f7;
      box-shadow: 0 0 0 6px rgba(0, 199, 247, 0.12);
    }

    .orbit-ring {
      position: absolute;
      border-radius: 50%;
      border: 1.8px solid rgba(38, 43, 64, 0.24);
    }

    .orbit-ring-one {
      width: 34px;
      height: 34px;
      animation: smsOrbitSpin 0.9s linear infinite;
    }

    .orbit-ring-two {
      width: 42px;
      height: 22px;
      transform: rotate(-28deg);
      animation: smsOrbitSpinReverse 1.2s linear infinite;
    }

    .orbit-dot {
      position: absolute;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.5);
    }

    .orbit-dot-one {
      top: 2px;
      left: 18px;
      animation: smsOrbitDotOne 0.9s linear infinite;
    }

    .orbit-dot-two {
      right: 2px;
      top: 18px;
      background: #f59e0b;
      animation: smsOrbitDotTwo 1.2s linear infinite;
    }

    .orbit-text {
      color: #172033;
      font-size: 13px;
      font-weight: 900;
      white-space: nowrap;
    }

    body.dark-mode .sms-orbit-loader {
      background: rgba(28, 33, 53, 0.92);
      border-color: rgba(255, 255, 255, 0.1);
    }

    body.dark-mode .orbit-text {
      color: #ffffff;
    }

    body.dark-mode .orbit-ring {
      border-color: rgba(255, 255, 255, 0.28);
    }

    @keyframes smsOrbitSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes smsOrbitSpinReverse {
      from { transform: rotate(-28deg) rotate(0deg); }
      to { transform: rotate(-28deg) rotate(-360deg); }
    }

    @keyframes smsOrbitDotOne {
      0% { transform: rotate(0deg) translateX(17px) rotate(0deg); }
      100% { transform: rotate(360deg) translateX(17px) rotate(-360deg); }
    }

    @keyframes smsOrbitDotTwo {
      0% { transform: rotate(0deg) translateX(21px) rotate(0deg); }
      100% { transform: rotate(-360deg) translateX(21px) rotate(360deg); }
    }

    @media (max-width: 640px) {
      .sms-orbit-loader {
        right: 14px;
        bottom: 14px;
        min-width: auto;
        padding: 11px 13px;
      }

      .orbit-text {
        display: none;
      }
    }
  `;

  document.head.appendChild(style);
}


/* ============================================================
   MOBILE SIDEBAR
============================================================ */

function initSidebarMobile() {
  const sidebar = document.getElementById("smsSidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const openBtn = document.getElementById("sidebarOpenBtn");
  const closeBtn = document.getElementById("sidebarCloseBtn");

  if (!sidebar || !overlay) return;

  function openSidebar() {
    sidebar.classList.add("show");
    overlay.classList.add("show");
    document.body.classList.add("sidebar-open");
  }

  function closeSidebar() {
    sidebar.classList.remove("show");
    overlay.classList.remove("show");
    document.body.classList.remove("sidebar-open");
  }

  openBtn?.addEventListener("click", openSidebar);
  closeBtn?.addEventListener("click", closeSidebar);
  overlay.addEventListener("click", closeSidebar);

  window.addEventListener("resize", function () {
    if (window.innerWidth > 900) {
      closeSidebar();
    }
  });
}


/* ============================================================
   DESKTOP SIDEBAR COLLAPSE
============================================================ */

/* ============================================================
   DESKTOP SIDEBAR COLLAPSE + AUTO EXPAND/COLLAPSE
============================================================ */

function initSidebarCollapse() {
  const sidebar = document.getElementById("smsSidebar");
  const collapseBtn = document.getElementById("sidebarCollapseBtn");

  if (!sidebar || !collapseBtn) return;

  const AUTO_COLLAPSE_DELAY = 60 * 1000; // 1 minute
  let autoCollapseTimer = null;
  let sidebarHovered = false;

  function isDesktop() {
    return window.innerWidth > 900;
  }

  function collapseSidebar(saveState = true) {
    if (!isDesktop()) return;

    document.body.classList.add("sidebar-collapsed");

    if (saveState) {
      localStorage.setItem("smsSidebarCollapsed", "true");
    }

    closeAllSidebarSubmenus();
  }

  function expandSidebar(saveState = true) {
    if (!isDesktop()) return;

    document.body.classList.remove("sidebar-collapsed");

    if (saveState) {
      localStorage.setItem("smsSidebarCollapsed", "false");
    }

    startAutoCollapseTimer();
  }

  function clearAutoCollapseTimer() {
    if (autoCollapseTimer) {
      clearTimeout(autoCollapseTimer);
      autoCollapseTimer = null;
    }
  }

  function startAutoCollapseTimer() {
    clearAutoCollapseTimer();

    if (!isDesktop()) return;
    if (document.body.classList.contains("sidebar-collapsed")) return;
    if (sidebarHovered) return;

    autoCollapseTimer = setTimeout(function () {
      if (!sidebarHovered) {
        collapseSidebar(true);
      }
    }, AUTO_COLLAPSE_DELAY);
  }

  function closeAllSidebarSubmenus() {
    document.querySelectorAll(".sidebar-item.has-submenu").forEach(function (item) {
      item.classList.remove("open");
    });
  }

  const savedState = localStorage.getItem("smsSidebarCollapsed");

  if (isDesktop()) {
    if (savedState === "false") {
      expandSidebar(false);
    } else {
      collapseSidebar(false);
    }
  }

  collapseBtn.addEventListener("click", function () {
    if (!isDesktop()) return;

    const isCollapsed = document.body.classList.contains("sidebar-collapsed");

    if (isCollapsed) {
      expandSidebar(true);
    } else {
      collapseSidebar(true);
    }
  });

  sidebar.addEventListener("mouseenter", function () {
    if (!isDesktop()) return;

    sidebarHovered = true;
    clearAutoCollapseTimer();

    if (document.body.classList.contains("sidebar-collapsed")) {
      expandSidebar(false);
    }
  });

  sidebar.addEventListener("mouseleave", function () {
    if (!isDesktop()) return;

    sidebarHovered = false;
    startAutoCollapseTimer();
  });

  document.addEventListener("mousemove", function (event) {
    if (!isDesktop()) return;

    const isCollapsed = document.body.classList.contains("sidebar-collapsed");

    if (!isCollapsed) return;

    if (event.clientX <= 95) {
      sidebarHovered = true;
      expandSidebar(false);
    }
  });

  window.addEventListener("resize", function () {
    clearAutoCollapseTimer();

    if (!isDesktop()) {
      document.body.classList.remove("sidebar-collapsed");
      return;
    }

    const currentSavedState = localStorage.getItem("smsSidebarCollapsed");

    if (currentSavedState === "false") {
      expandSidebar(false);
    } else {
      collapseSidebar(false);
    }
  });
}

/* ============================================================
   SIDEBAR DROPDOWNS
============================================================ */

function initSidebarDropdowns() {
  const toggles = document.querySelectorAll("[data-menu-toggle]");

  toggles.forEach(function (toggle) {
    toggle.addEventListener("click", function () {
      if (document.body.classList.contains("sidebar-collapsed")) return;

      const parent = toggle.closest(".sidebar-item");
      const menuId = toggle.getAttribute("data-menu-toggle");
      const submenu = document.getElementById(menuId);

      if (!parent || !submenu) return;

      const isOpen = parent.classList.contains("open");

      closeSiblingMenus(parent);

      if (isOpen) {
        parent.classList.remove("open");
      } else {
        parent.classList.add("open");
      }
    });
  });
}


function closeSiblingMenus(currentItem) {
  const allItems = document.querySelectorAll(".sidebar-item.has-submenu");

  allItems.forEach(function (item) {
    if (item !== currentItem) {
      item.classList.remove("open");
    }
  });
}


/* ============================================================
   AUTO OPEN SUBMENU IF CURRENT PAGE IS INSIDE IT
============================================================ */

function initActiveSubmenus() {
  const currentPath = window.location.pathname;
  const submenuLinks = document.querySelectorAll(".sidebar-submenu a");

  submenuLinks.forEach(function (link) {
    const linkPath = link.getAttribute("href");

    if (!linkPath || linkPath === "#") return;

    if (currentPath === linkPath || currentPath.startsWith(linkPath + "/")) {
      const parent = link.closest(".sidebar-item.has-submenu");

      if (parent && !document.body.classList.contains("sidebar-collapsed")) {
        parent.classList.add("open");
      }

      link.classList.add("active-submenu-link");
    }
  });
}


/* ============================================================
   FLASH MESSAGE CLOSE BUTTON
============================================================ */

function initFlashMessages() {
  const flashCloseButtons = document.querySelectorAll(".flash-close");

  flashCloseButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const message = button.closest(".flash-message");

      if (!message) return;

      message.style.opacity = "0";
      message.style.transform = "translateY(-6px)";

      setTimeout(function () {
        message.remove();
      }, 180);
    });
  });
}


/* ============================================================
   GLOBAL MODERN FLASH / TOAST SYSTEM
   Usage:
   window.smsFlash("Scores saved successfully", "success");
   window.smsFlash("Something went wrong", "error");
   window.smsFlash("Loading students...", "info");
   window.smsFlash("Check this record", "warning");
============================================================ */

function initGlobalFlashSystem() {
  injectGlobalFlashStyles();

  if (!document.getElementById("smsFlashHost")) {
    const host = document.createElement("div");
    host.id = "smsFlashHost";
    host.className = "sms-flash-host";
    document.body.appendChild(host);
  }

  window.smsFlash = function (message, type = "success", options = {}) {
    const host = document.getElementById("smsFlashHost");
    if (!host) return;

    const duration = options.duration || 4200;

    const icons = {
      success: "fa-circle-check",
      error: "fa-triangle-exclamation",
      warning: "fa-circle-exclamation",
      info: "fa-circle-info",
      loading: "fa-spinner fa-spin"
    };

    const titles = {
      success: "Success",
      error: "Action Failed",
      warning: "Attention",
      info: "Notice",
      loading: "Processing"
    };

    const toast = document.createElement("div");
    toast.className = `sms-flash-toast ${type}`;
    toast.innerHTML = `
      <div class="sms-flash-icon">
        <i class="fa-solid ${icons[type] || icons.info}"></i>
      </div>

      <div class="sms-flash-content">
        <strong>${titles[type] || titles.info}</strong>
        <span>${message}</span>
      </div>

      <button type="button" class="sms-flash-close" aria-label="Close notification">
        <i class="fa-solid fa-xmark"></i>
      </button>

      <div class="sms-flash-progress"></div>
    `;

    host.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("show");
    });

    const closeToast = () => {
      toast.classList.remove("show");
      toast.classList.add("hide");

      setTimeout(() => {
        toast.remove();
      }, 260);
    };

    toast.querySelector(".sms-flash-close")?.addEventListener("click", closeToast);

    if (type !== "loading") {
      setTimeout(closeToast, duration);
    }

    return {
      close: closeToast,
      update(newMessage, newType = type) {
        toast.className = `sms-flash-toast ${newType} show`;
        toast.querySelector(".sms-flash-content span").textContent = newMessage;
      }
    };
  };
}


function injectGlobalFlashStyles() {
  if (document.getElementById("smsGlobalFlashStyles")) return;

  const style = document.createElement("style");
  style.id = "smsGlobalFlashStyles";
  style.textContent = `
    .sms-flash-host {
      position: fixed;
      top: 92px;
      right: 26px;
      z-index: 99999;
      width: min(420px, calc(100vw - 32px));
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    }

    .sms-flash-toast {
      position: relative;
      overflow: hidden;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 12px;
      padding: 14px 14px 16px;
      border-radius: 22px;
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(15, 23, 42, 0.10);
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.18);
      backdrop-filter: blur(18px);
      opacity: 0;
      transform: translateX(22px) scale(0.96);
      transition: opacity 0.25s ease, transform 0.25s ease;
      pointer-events: auto;
    }

    .sms-flash-toast.show {
      opacity: 1;
      transform: translateX(0) scale(1);
    }

    .sms-flash-toast.hide {
      opacity: 0;
      transform: translateX(22px) scale(0.96);
    }

    .sms-flash-icon {
      width: 46px;
      height: 46px;
      display: grid;
      place-items: center;
      border-radius: 16px;
      color: #ffffff;
      font-size: 1.1rem;
    }

    .sms-flash-toast.success .sms-flash-icon {
      background: linear-gradient(135deg, #16a34a, #0f766e);
    }

    .sms-flash-toast.error .sms-flash-icon {
      background: linear-gradient(135deg, #e11d48, #be123c);
    }

    .sms-flash-toast.warning .sms-flash-icon {
      background: linear-gradient(135deg, #f59e0b, #d97706);
    }

    .sms-flash-toast.info .sms-flash-icon,
    .sms-flash-toast.loading .sms-flash-icon {
      background: linear-gradient(135deg, #0ea5e9, #2563eb);
    }

    .sms-flash-content strong {
      display: block;
      color: #0f172a;
      font-size: 0.92rem;
      font-weight: 1000;
      line-height: 1.15;
    }

    .sms-flash-content span {
      display: block;
      margin-top: 3px;
      color: #64748b;
      font-size: 0.84rem;
      font-weight: 800;
      line-height: 1.35;
    }

    .sms-flash-close {
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      border: 0;
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.06);
      color: #334155;
      cursor: pointer;
      transition: 0.2s ease;
    }

    .sms-flash-close:hover {
      background: #111827;
      color: #ffffff;
    }

    .sms-flash-progress {
      position: absolute;
      left: 0;
      bottom: 0;
      height: 4px;
      width: 100%;
      transform-origin: left;
      animation: smsFlashProgress 4.2s linear forwards;
    }

    .sms-flash-toast.success .sms-flash-progress {
      background: #16a34a;
    }

    .sms-flash-toast.error .sms-flash-progress {
      background: #e11d48;
    }

    .sms-flash-toast.warning .sms-flash-progress {
      background: #f59e0b;
    }

    .sms-flash-toast.info .sms-flash-progress,
    .sms-flash-toast.loading .sms-flash-progress {
      background: #0ea5e9;
    }

    .sms-flash-toast.loading .sms-flash-progress {
      animation: none;
    }

    @keyframes smsFlashProgress {
      from { transform: scaleX(1); }
      to { transform: scaleX(0); }
    }

    body.dark-mode .sms-flash-toast {
      background: rgba(28, 33, 53, 0.96);
      border-color: rgba(255, 255, 255, 0.10);
    }

    body.dark-mode .sms-flash-content strong {
      color: #ffffff;
    }

    body.dark-mode .sms-flash-content span {
      color: rgba(255, 255, 255, 0.72);
    }

    @media (max-width: 700px) {
      .sms-flash-host {
        top: 76px;
        right: 16px;
        left: 16px;
        width: auto;
      }
    }
  `;

  document.head.appendChild(style);
}






/* ============================================================
   LIVE CLOCK / DATE
============================================================ */

function initLiveClock() {
  const liveTime = document.getElementById("liveTime");
  const liveDate = document.getElementById("liveDate");

  if (!liveTime && !liveDate) return;

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function updateClock() {
    const now = new Date();

    let hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    const ampm = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;

    const dateText = now.toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric"
    });

    if (liveTime) {
      liveTime.textContent = `${pad(hours12)}:${pad(minutes)}:${pad(seconds)} ${ampm}`;
    }

    if (liveDate) {
      liveDate.textContent = dateText;
    }
  }

  updateClock();
  setInterval(updateClock, 1000);
}


/* ============================================================
   FOOTER YEAR
============================================================ */

function initFooterYear() {
  const footerYear = document.getElementById("footerYear");

  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }
}


/* ============================================================
   THEME TOGGLE
============================================================ */

function initThemeToggle() {
  const themeBtn = document.getElementById("themeToggleBtn");

  if (!themeBtn) return;

  const savedTheme = localStorage.getItem("smsTheme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    themeBtn.innerHTML = `<i class="fa-solid fa-sun"></i>`;
  }

  themeBtn.addEventListener("click", function () {
    document.body.classList.toggle("dark-mode");

    const isDark = document.body.classList.contains("dark-mode");

    localStorage.setItem("smsTheme", isDark ? "dark" : "light");

    themeBtn.innerHTML = isDark
      ? `<i class="fa-solid fa-sun"></i>`
      : `<i class="fa-solid fa-moon"></i>`;
  });
}


/* ============================================================
   FULLSCREEN BUTTON
============================================================ */

function initFullscreenButton() {
  const fullscreenBtn = document.getElementById("fullscreenBtn");

  if (!fullscreenBtn) return;

  fullscreenBtn.addEventListener("click", function () {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      fullscreenBtn.innerHTML = `<i class="fa-solid fa-compress"></i>`;
    } else {
      document.exitFullscreen?.();
      fullscreenBtn.innerHTML = `<i class="fa-solid fa-expand"></i>`;
    }
  });

  document.addEventListener("fullscreenchange", function () {
    fullscreenBtn.innerHTML = document.fullscreenElement
      ? `<i class="fa-solid fa-compress"></i>`
      : `<i class="fa-solid fa-expand"></i>`;
  });
}


/* ============================================================
   NOTIFICATION DROPDOWN
============================================================ */

function initNotificationDropdown() {
  const notificationBtn = document.getElementById("notificationBtn");
  const notificationDropdown = document.getElementById("notificationDropdown");

  if (!notificationBtn || !notificationDropdown) return;

  notificationBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    notificationDropdown.classList.toggle("show");
  });

  notificationDropdown.addEventListener("click", function (event) {
    event.stopPropagation();
  });

  document.addEventListener("click", function () {
    notificationDropdown.classList.remove("show");
  });
}


/* ============================================================
   COMMAND PALETTE
============================================================ */

function initCommandPalette() {
  const openBtn = document.getElementById("openCommandPalette");
  const palette = document.getElementById("commandPalette");
  const closeBtn = document.getElementById("closeCommandPalette");
  const searchInput = document.getElementById("commandSearchInput");
  const commandItems = document.querySelectorAll(".command-list a");

  if (!palette) return;

  function openPalette() {
    palette.classList.add("show");
    document.body.classList.add("command-open");

    setTimeout(function () {
      searchInput?.focus();
    }, 80);
  }

  function closePalette() {
    palette.classList.remove("show");
    document.body.classList.remove("command-open");

    if (searchInput) {
      searchInput.value = "";
    }

    commandItems.forEach(function (item) {
      item.classList.remove("hide-match");
    });
  }

  openBtn?.addEventListener("click", openPalette);
  closeBtn?.addEventListener("click", closePalette);

  palette.addEventListener("click", function (event) {
    if (event.target === palette) {
      closePalette();
    }
  });

  document.addEventListener("keydown", function (event) {
    const isCtrlK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";

    if (isCtrlK) {
      event.preventDefault();
      openPalette();
    }

    if (event.key === "Escape") {
      closePalette();
    }
  });

  searchInput?.addEventListener("input", function () {
    const query = searchInput.value.trim().toLowerCase();

    commandItems.forEach(function (item) {
      const text = item.textContent.toLowerCase();

      if (!query || text.includes(query)) {
        item.classList.remove("hide-match");
      } else {
        item.classList.add("hide-match");
      }
    });
  });
}


/* ============================================================
   GLOBAL SEARCH SHORTCUT
============================================================ */

function initGlobalSearchShortcut() {
  const searchInput = document.getElementById("globalSearchInput");

  if (!searchInput) return;

  document.addEventListener("keydown", function (event) {
    const isSlash = event.key === "/";
    const isTyping =
      event.target.tagName === "INPUT" ||
      event.target.tagName === "TEXTAREA" ||
      event.target.isContentEditable;

    if (isSlash && !isTyping) {
      event.preventDefault();
      searchInput.focus();
    }
  });
}