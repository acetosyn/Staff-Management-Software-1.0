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

function initSidebarCollapse() {
  const collapseBtn = document.getElementById("sidebarCollapseBtn");

  if (!collapseBtn) return;

  const savedState = localStorage.getItem("smsSidebarCollapsed");

  if (savedState === "true" && window.innerWidth > 900) {
    document.body.classList.add("sidebar-collapsed");
  }

  collapseBtn.addEventListener("click", function () {
    if (window.innerWidth <= 900) return;

    document.body.classList.toggle("sidebar-collapsed");

    const isCollapsed = document.body.classList.contains("sidebar-collapsed");
    localStorage.setItem("smsSidebarCollapsed", String(isCollapsed));
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