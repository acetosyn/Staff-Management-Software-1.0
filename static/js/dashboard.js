/* ============================================================
   STAFF MANAGEMENT SOFTWARE — DASHBOARD JS
   Real CSV Data Dashboard
============================================================ */

document.addEventListener("DOMContentLoaded", function () {
  initDashboardCounters();
  initModuleSearch();
  initDashboardRefresh();
  initRoadmapToggle();
});


function initDashboardCounters() {
  const counters = document.querySelectorAll(".counter");

  counters.forEach((counter) => {
    const target = Number(counter.dataset.count || 0);
    const duration = 900;
    const startTime = performance.now();

    function updateCounter(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const value = Math.floor(progress * target);

      counter.textContent = value.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        counter.textContent = target.toLocaleString();
      }
    }

    requestAnimationFrame(updateCounter);
  });
}


function initModuleSearch() {
  const input = document.getElementById("moduleSearchInput");
  const modules = document.querySelectorAll(".module-tile");

  if (!input || !modules.length) return;

  input.addEventListener("input", function () {
    const query = input.value.toLowerCase().trim();

    modules.forEach((module) => {
      const text = module.textContent.toLowerCase();

      if (text.includes(query)) {
        module.classList.remove("hide-module");
      } else {
        module.classList.add("hide-module");
      }
    });
  });
}


function initDashboardRefresh() {
  const btn = document.getElementById("refreshDashboardBtn");
  const shell = document.querySelector(".dashboard-shell");

  if (!btn || !shell) return;

  btn.addEventListener("click", async function () {
    shell.classList.add("is-refreshing");

    const icon = btn.querySelector("i");
    if (icon) icon.classList.add("fa-spin");

    await refreshDashboardStats(shell);

    setTimeout(() => {
      shell.classList.remove("is-refreshing");
      if (icon) icon.classList.remove("fa-spin");
      initDashboardCounters();
    }, 550);
  });
}


async function refreshDashboardStats(shell) {
  const statsUrl = shell.dataset.statsUrl;

  if (!statsUrl) return;

  try {
    const response = await fetch(statsUrl, {
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("Dashboard stats request failed");
    }

    const data = await response.json();

    updateCounterTarget("totalStudentsCounter", data.total_students);
    updateCounterTarget("classArmsCounter", data.total_class_arms);
    updateCounterTarget("levelsCounter", data.total_levels);
    updateCounterTarget("contactsCounter", data.complete_phone_count);

  } catch (error) {
    console.error("Unable to refresh dashboard stats:", error);
  }
}


function updateCounterTarget(id, value) {
  const counter = document.getElementById(id);

  if (!counter) return;

  counter.dataset.count = Number(value || 0);
  counter.textContent = "0";
}


function initRoadmapToggle() {
  const buttons = document.querySelectorAll(".roadmap-title");

  buttons.forEach((button) => {
    button.addEventListener("click", function () {
      const block = button.closest(".roadmap-block");
      const table = block ? block.querySelector(".roadmap-table") : null;
      const icon = button.querySelector("i");

      if (!table) return;

      const isHidden = table.style.display === "none";

      table.style.display = isHidden ? "block" : "none";

      if (icon) {
        icon.className = isHidden
          ? "fa-solid fa-chevron-up"
          : "fa-solid fa-chevron-down";
      }
    });
  });
}