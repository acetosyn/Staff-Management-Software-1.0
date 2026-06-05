/* ============================================================
   ADMIN LOGIN JS
   Password toggle + orbit login loader
============================================================ */

document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector(".admin-login-form");
  const submitBtn = document.querySelector(".login-submit-btn");
  const passwordInput = document.getElementById("passwordInput");
  const togglePasswordBtn = document.getElementById("togglePasswordBtn");

  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener("click", function () {
      const isPassword = passwordInput.type === "password";

      passwordInput.type = isPassword ? "text" : "password";

      togglePasswordBtn.innerHTML = isPassword
        ? '<i class="fa-solid fa-eye-slash"></i>'
        : '<i class="fa-solid fa-eye"></i>';
    });
  }

  if (!form || !submitBtn) return;

  form.addEventListener("submit", function () {
    submitBtn.disabled = true;
    submitBtn.classList.add("is-loading");

    submitBtn.innerHTML = `
      <span class="login-orbit-loader" aria-hidden="true"></span>
      <span>Opening dashboard...</span>
    `;
  });
});