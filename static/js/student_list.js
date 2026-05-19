/* ============================================================
   STUDENT RECORDS STUDIO JS
   Add, Edit, Delete, Bulk Delete, Transfer, Search, Sort, Export
============================================================ */

document.addEventListener("DOMContentLoaded", function () {
  initStudentStudio();
});

function initStudentStudio() {
  const studio = document.querySelector(".students-studio");
  if (!studio) return;

  const urls = {
    list: studio.dataset.listUrl,
    create: studio.dataset.createUrl,
    updateTemplate: studio.dataset.updateUrlTemplate,
    deleteTemplate: studio.dataset.deleteUrlTemplate,
    bulkDelete: studio.dataset.bulkDeleteUrl
  };

  const state = {
    activeLevel: "ALL",
    sortAsc: true,
    selectedRow: null,
    confirmAction: null
  };

  const els = {
    tbody: document.getElementById("studentsTableBody"),
    table: document.getElementById("studentsTable"),
    levelTabs: document.querySelectorAll(".level-capsule"),
    search: document.getElementById("studentSearchInput"),
    armFilter: document.getElementById("armFilter"),
    bulkClassSelect: document.getElementById("bulkClassSelect"),
    resultCount: document.getElementById("tableResultCount"),
    activeLevelLabel: document.getElementById("activeLevelLabel"),
    emptyState: document.getElementById("emptyState"),
    selectAll: document.getElementById("selectAllStudents"),
    selectionStrip: document.getElementById("selectionStrip"),
    selectedCount: document.getElementById("selectedCount")
  };

  populateArmFilter();
  applyFilters();
  bindToolbar();
  bindTableEvents();
  bindModalEvents();
  bindFormEvents();

  /* ================= TOOLBAR ================= */

  function bindToolbar() {
    els.levelTabs.forEach((btn) => {
      btn.addEventListener("click", function () {
        els.levelTabs.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        state.activeLevel = btn.dataset.level || "ALL";
        els.activeLevelLabel.textContent =
          state.activeLevel === "ALL" ? "All Students" : `${state.activeLevel} Students`;

        els.armFilter.value = "ALL";
        populateArmFilter();
        applyFilters();
      });
    });

    els.search?.addEventListener("input", applyFilters);
    els.armFilter?.addEventListener("change", applyFilters);

    document.getElementById("refreshStudentsBtn")?.addEventListener("click", refreshFromServer);
    document.getElementById("exportStudentsBtn")?.addEventListener("click", exportVisibleRowsToCSV);

    document.getElementById("densityBtn")?.addEventListener("click", function () {
      els.table.classList.toggle("compact-table");
      this.classList.toggle("active");
      toast("Table density changed", "Compact table mode toggled.", "success");
    });

    document.getElementById("sortNameBtn")?.addEventListener("click", function () {
      sortRowsByName(state.sortAsc);
      state.sortAsc = !state.sortAsc;
      applyFilters();
      toast("Sorted", "Student names have been rearranged.", "success");
    });

    document.getElementById("openAddStudentModal")?.addEventListener("click", openAddForm);

    document.getElementById("bulkDeleteBtn")?.addEventListener("click", function () {
      const selected = getSelectedAdmissions();

      if (!selected.length) {
        toast("No selection", "Select at least one student to delete.", "warning");
        return;
      }

      openConfirm(
        "Delete Selected Records?",
        `You are about to remove ${selected.length} student record(s) from the CSV database.`,
        async function () {
          await bulkDeleteStudents(selected);
        }
      );
    });

    document.getElementById("clearSelectionBtn")?.addEventListener("click", clearSelection);

    els.selectAll?.addEventListener("change", function () {
      getVisibleRows().forEach((row) => {
        const check = row.querySelector(".row-check");
        if (check) {
          check.checked = els.selectAll.checked;
          row.classList.toggle("selected", check.checked);
        }
      });

      updateSelectionUI();
    });

    els.bulkClassSelect?.addEventListener("change", async function () {
      const targetArm = this.value;
      const selected = getSelectedRows();

      if (!targetArm) return;

      if (!selected.length) {
        toast("No selection", "Select student records before moving them.", "warning");
        this.value = "";
        return;
      }

      const targetLevel = getLevelFromArm(targetArm);

      openConfirm(
        "Move Selected Students?",
        `Move ${selected.length} student record(s) to ${targetArm}?`,
        async function () {
          await bulkMoveStudents(selected, targetArm, targetLevel);
          els.bulkClassSelect.value = "";
        }
      );
    });
  }

  /* ================= TABLE EVENTS ================= */

  function bindTableEvents() {
    els.tbody.addEventListener("click", function (event) {
      const row = event.target.closest(".student-row");
      if (!row) return;

      if (event.target.closest(".row-check")) {
        row.classList.toggle("selected", event.target.checked);
        updateSelectionUI();
        return;
      }

      if (event.target.closest(".view-student-btn")) {
        openViewModal(row);
        return;
      }

      if (event.target.closest(".edit-student-btn")) {
        openEditForm(row);
        return;
      }

      if (event.target.closest(".duplicate-student-btn")) {
        openDuplicateForm(row);
        return;
      }

      if (event.target.closest(".delete-student-btn")) {
        openConfirm(
          "Delete Student?",
          `Delete ${row.dataset.name || "this student"} from the CSV database?`,
          async function () {
            await deleteStudent(row.dataset.admission);
          }
        );
      }
    });
  }

  /* ================= MODALS ================= */

  function bindModalEvents() {
    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", closeAllModals);
    });

    document.getElementById("studentModalBackdrop")?.addEventListener("click", closeAllModals);
    document.getElementById("cancelConfirmBtn")?.addEventListener("click", closeAllModals);

    document.getElementById("confirmActionBtn")?.addEventListener("click", async function () {
      if (typeof state.confirmAction === "function") {
        await state.confirmAction();
      }

      closeAllModals();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeAllModals();
    });

    document.getElementById("viewCopyBtn")?.addEventListener("click", copyViewedStudent);
    document.getElementById("viewEditBtn")?.addEventListener("click", function () {
      if (state.selectedRow) {
        closeAllModals();
        openEditForm(state.selectedRow);
      }
    });
  }

  function openViewModal(row) {
    state.selectedRow = row;

    setText("viewFullName", row.dataset.name || "Student");
    setText("viewAdmission", row.dataset.admission || "—");
    setText("viewLastName", row.dataset.lastName || "—");
    setText("viewFirstName", row.dataset.firstName || "—");
    setText("viewOtherNames", row.dataset.otherNames || "—");
    setText("viewClassArm", row.dataset.arm || "—");
    setText("viewClassCategory", row.dataset.level || "—");
    setText("viewPhone", row.dataset.phone || "Not provided");
    setText("viewAvatar", getInitials(row));

    const callBtn = document.getElementById("viewCallBtn");
    if (callBtn) {
      if (row.dataset.phone) {
        callBtn.href = `tel:${row.dataset.phone}`;
        callBtn.style.opacity = "1";
        callBtn.style.pointerEvents = "auto";
      } else {
        callBtn.href = "#";
        callBtn.style.opacity = "0.55";
        callBtn.style.pointerEvents = "none";
      }
    }

    showModal("studentViewModal");
  }

  function openAddForm() {
    clearForm();
    setText("formModeText", "Create Record");
    setText("studentFormTitle", "Add New Student");
    document.getElementById("originalAdmission").value = "";
    showModal("studentFormModal");
  }

  function openEditForm(row) {
    clearForm();

    setText("formModeText", "Update Record");
    setText("studentFormTitle", "Edit Student Record");

    document.getElementById("originalAdmission").value = row.dataset.admission || "";
    document.getElementById("admissionNumber").value = row.dataset.admission || "";
    document.getElementById("lastName").value = row.dataset.lastName || "";
    document.getElementById("firstName").value = row.dataset.firstName || "";
    document.getElementById("otherNames").value = row.dataset.otherNames || "";
    document.getElementById("phoneNumber").value = row.dataset.phone || "";
    document.getElementById("classArm").value = row.dataset.arm || "";
    document.getElementById("classCategory").value = row.dataset.level || "";

    showModal("studentFormModal");
  }

  function openDuplicateForm(row) {
    clearForm();

    setText("formModeText", "Duplicate Record");
    setText("studentFormTitle", "Duplicate Student");

    document.getElementById("originalAdmission").value = "";
    document.getElementById("admissionNumber").value = `${row.dataset.admission || "std"}_copy`;
    document.getElementById("lastName").value = row.dataset.lastName || "";
    document.getElementById("firstName").value = row.dataset.firstName || "";
    document.getElementById("otherNames").value = row.dataset.otherNames || "";
    document.getElementById("phoneNumber").value = row.dataset.phone || "";
    document.getElementById("classArm").value = row.dataset.arm || "";
    document.getElementById("classCategory").value = row.dataset.level || "";

    showModal("studentFormModal");
  }

  function openConfirm(title, message, action) {
    setText("confirmTitle", title);
    setText("confirmMessage", message);
    state.confirmAction = action;
    showModal("confirmModal");
  }

  function showModal(id) {
    document.getElementById("studentModalBackdrop")?.classList.add("show");
    document.getElementById(id)?.classList.add("show");
    document.getElementById(id)?.setAttribute("aria-hidden", "false");
    document.body.classList.add("command-open");
  }

  function closeAllModals() {
    document.getElementById("studentModalBackdrop")?.classList.remove("show");

    ["studentViewModal", "studentFormModal", "confirmModal"].forEach((id) => {
      const modal = document.getElementById(id);
      if (modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
      }
    });

    document.body.classList.remove("command-open");
    state.confirmAction = null;
  }

  /* ================= FORM SAVE ================= */

  function bindFormEvents() {
    const form = document.getElementById("studentRecordForm");
    if (!form) return;

    document.getElementById("classArm")?.addEventListener("change", function () {
      const category = getLevelFromArm(this.value);
      if (category) document.getElementById("classCategory").value = category;
    });

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const originalAdmission = document.getElementById("originalAdmission").value.trim();
      const payload = getFormPayload();

      if (!payload.Admission_number || !payload.Last_name || !payload.First_name || !payload.Class || !payload.Class_category) {
        toast("Missing fields", "Please complete all required fields.", "warning");
        return;
      }

      if (!payload.Class.startsWith(payload.Class_category)) {
        toast("Class mismatch", "Class arm must match the class category.", "error");
        return;
      }

      if (originalAdmission) {
        await updateStudent(originalAdmission, payload);
      } else {
        await createStudent(payload);
      }
    });
  }

  function getFormPayload() {
    return {
      Admission_number: document.getElementById("admissionNumber").value.trim(),
      Last_name: document.getElementById("lastName").value.trim(),
      First_name: document.getElementById("firstName").value.trim(),
      Other_names: document.getElementById("otherNames").value.trim(),
      Phone: document.getElementById("phoneNumber").value.trim(),
      Class: document.getElementById("classArm").value.trim(),
      Class_category: document.getElementById("classCategory").value.trim()
    };
  }

  function clearForm() {
    document.getElementById("studentRecordForm")?.reset();
    document.getElementById("originalAdmission").value = "";
  }

  /* ================= API ACTIONS ================= */

  async function createStudent(payload) {
    const result = await apiRequest(urls.create, "POST", payload);
    if (!result) return;

    addOrUpdateRow(result.student);
    updateStats(result.stats);
    closeAllModals();
    populateArmFilter();
    applyFilters();
    toast("Student added", result.message || "Record saved successfully.", "success");
  }

  async function updateStudent(admission, payload) {
    const url = urls.updateTemplate.replace("__ADM__", encodeURIComponent(admission));
    const result = await apiRequest(url, "PUT", payload);
    if (!result) return;

    addOrUpdateRow(result.student, admission);
    updateStats(result.stats);
    closeAllModals();
    populateArmFilter();
    applyFilters();
    toast("Student updated", result.message || "Record updated successfully.", "success");
  }

  async function deleteStudent(admission) {
    const url = urls.deleteTemplate.replace("__ADM__", encodeURIComponent(admission));
    const result = await apiRequest(url, "DELETE");
    if (!result) return;

    const row = findRowByAdmission(admission);
    if (row) row.remove();

    updateStats(result.stats);
    populateArmFilter();
    applyFilters();
    updateSelectionUI();
    toast("Student deleted", result.message || "Record removed.", "success");
  }

  async function bulkDeleteStudents(admissions) {
    const result = await apiRequest(urls.bulkDelete, "POST", {
      admission_numbers: admissions
    });

    if (!result) return;

    admissions.forEach((admission) => {
      const row = findRowByAdmission(admission);
      if (row) row.remove();
    });

    updateStats(result.stats);
    populateArmFilter();
    applyFilters();
    updateSelectionUI();
    toast("Bulk delete complete", result.message || "Selected records removed.", "success");
  }

  async function bulkMoveStudents(rows, targetArm, targetLevel) {
    let completed = 0;

    for (const row of rows) {
      const payload = rowToPayload(row);
      payload.Class = targetArm;
      payload.Class_category = targetLevel;

      const url = urls.updateTemplate.replace("__ADM__", encodeURIComponent(row.dataset.admission));
      const result = await apiRequest(url, "PUT", payload, false);

      if (result?.ok) {
        addOrUpdateRow(result.student, row.dataset.admission);
        updateStats(result.stats);
        completed += 1;
      }
    }

    clearSelection();
    populateArmFilter();
    applyFilters();

    if (completed) {
      toast("Students moved", `${completed} record(s) moved to ${targetArm}.`, "success");
    } else {
      toast("Move failed", "No record was moved.", "error");
    }
  }

  async function refreshFromServer() {
    const icon = document.querySelector("#refreshStudentsBtn i");

    studio.classList.add("is-refreshing");
    if (icon) icon.classList.add("fa-spin");

    try {
      const response = await fetch(urls.list, { headers: { Accept: "application/json" } });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Unable to refresh records.");
      }

      els.tbody.innerHTML = "";
      data.students.forEach((student) => addOrUpdateRow(student));
      updateStats(data.stats);
      populateArmFilter();
      applyFilters();
      toast("Table refreshed", "Latest CSV records loaded.", "success");
    } catch (error) {
      toast("Refresh failed", error.message, "error");
    } finally {
      setTimeout(() => {
        studio.classList.remove("is-refreshing");
        if (icon) icon.classList.remove("fa-spin");
      }, 450);
    }
  }

  async function apiRequest(url, method, payload = null, showErrors = true) {
    try {
      const options = {
        method,
        headers: { Accept: "application/json" }
      };

      if (payload) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(payload);
      }

      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok || data.ok === false) {
        throw new Error(data.message || "Request failed.");
      }

      return data;
    } catch (error) {
      if (showErrors) toast("Action failed", error.message, "error");
      return null;
    }
  }

  /* ================= ROW RENDERING ================= */

  function addOrUpdateRow(student, oldAdmission = null) {
    const admission = student.admission_number || student.Admission_number;
    let row = findRowByAdmission(oldAdmission || admission);

    if (!row) {
      row = document.createElement("tr");
      row.className = "student-row";
      els.tbody.appendChild(row);
    }

    const normalized = normalizeStudent(student);
    row.dataset.admission = normalized.admission_number;
    row.dataset.lastName = normalized.last_name;
    row.dataset.firstName = normalized.first_name;
    row.dataset.otherNames = normalized.other_names;
    row.dataset.phone = normalized.phone;
    row.dataset.arm = normalized.class_arm;
    row.dataset.level = normalized.class_category;
    row.dataset.name = normalized.full_name;

    row.innerHTML = buildRowHTML(normalized);
  }

  function buildRowHTML(student) {
    const initials = getInitialsFromStudent(student);
    const phoneHTML = student.phone
      ? `<a href="tel:${escapeHTML(student.phone)}" class="phone-chip">
           <i class="fa-solid fa-phone"></i>${escapeHTML(student.phone)}
         </a>`
      : `<span class="phone-chip missing">
           <i class="fa-solid fa-triangle-exclamation"></i>Missing
         </span>`;

    const stateHTML = student.phone
      ? `<span class="record-state complete">
           <i class="fa-solid fa-circle-check"></i>Complete
         </span>`
      : `<span class="record-state warning">
           <i class="fa-solid fa-screwdriver-wrench"></i>Needs Update
         </span>`;

    return `
      <td><input type="checkbox" class="row-check" value="${escapeHTML(student.admission_number)}"></td>
      <td class="serial">0</td>
      <td>
        <button type="button" class="identity-card view-student-btn">
          <span class="student-avatar">${escapeHTML(initials)}</span>
          <span>
            <strong>${escapeHTML(student.full_name || "Student")}</strong>
            <small><i class="fa-solid fa-id-card"></i>${escapeHTML(student.admission_number)}</small>
          </span>
        </button>
      </td>
      <td><span class="admission-chip">${escapeHTML(student.admission_number)}</span></td>
      <td><span class="class-chip">${escapeHTML(student.class_arm)}</span></td>
      <td><span class="level-chip">${escapeHTML(student.class_category)}</span></td>
      <td>${phoneHTML}</td>
      <td>${stateHTML}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="icon-action view-student-btn" title="View">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button type="button" class="icon-action edit-student-btn" title="Edit">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button type="button" class="icon-action duplicate-student-btn" title="Duplicate">
            <i class="fa-solid fa-copy"></i>
          </button>
          <button type="button" class="icon-action delete-student-btn danger" title="Delete">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </td>
    `;
  }

  /* ================= FILTER / SORT / SELECT ================= */

  function applyFilters() {
    const query = (els.search?.value || "").toLowerCase().trim();
    const selectedArm = els.armFilter?.value || "ALL";
    let visible = 0;

    getAllRows().forEach((row, index) => {
      const level = row.dataset.level || "";
      const arm = row.dataset.arm || "";
      const text = [
        row.dataset.name,
        row.dataset.admission,
        row.dataset.phone,
        row.dataset.arm,
        row.dataset.level
      ].join(" ").toLowerCase();

      const matchesLevel = state.activeLevel === "ALL" || level === state.activeLevel;
      const matchesArm = selectedArm === "ALL" || arm === selectedArm;
      const matchesSearch = !query || text.includes(query);
      const show = matchesLevel && matchesArm && matchesSearch;

      row.style.display = show ? "" : "none";

      if (show) {
        visible += 1;
        row.querySelector(".serial").textContent = visible;
        row.style.animationDelay = `${Math.min(index * 0.012, 0.2)}s`;
      }
    });

    els.resultCount.textContent = `${visible.toLocaleString()} records showing`;
    els.emptyState?.classList.toggle("show", visible === 0);

    updateSelectionUI();
  }

  function populateArmFilter() {
    if (!els.armFilter) return;

    const currentValue = els.armFilter.value || "ALL";

    const arms = [...new Set(
      getAllRows()
        .filter((row) => state.activeLevel === "ALL" || row.dataset.level === state.activeLevel)
        .map((row) => row.dataset.arm)
        .filter(Boolean)
    )].sort();

    els.armFilter.innerHTML = `<option value="ALL">All Arms</option>`;

    arms.forEach((arm) => {
      const option = document.createElement("option");
      option.value = arm;
      option.textContent = arm;
      els.armFilter.appendChild(option);
    });

    els.armFilter.value = arms.includes(currentValue) ? currentValue : "ALL";
  }

  function sortRowsByName(asc = true) {
    const rows = getAllRows();

    rows.sort((a, b) => {
      const aName = (a.dataset.name || "").toLowerCase();
      const bName = (b.dataset.name || "").toLowerCase();

      return asc ? aName.localeCompare(bName) : bName.localeCompare(aName);
    });

    rows.forEach((row) => els.tbody.appendChild(row));
  }

  function updateSelectionUI() {
    const selected = getSelectedRows();
    const visibleRows = getVisibleRows();

    els.selectedCount.textContent = selected.length;
    els.selectionStrip?.classList.toggle("show", selected.length > 0);

    if (els.selectAll) {
      els.selectAll.checked = visibleRows.length > 0 && visibleRows.every((row) => {
        return row.querySelector(".row-check")?.checked;
      });
    }
  }

  function clearSelection() {
    getAllRows().forEach((row) => {
      row.classList.remove("selected");
      const check = row.querySelector(".row-check");
      if (check) check.checked = false;
    });

    if (els.selectAll) els.selectAll.checked = false;
    updateSelectionUI();
  }

  /* ================= STATS ================= */

  function updateStats(stats) {
    if (!stats) return;

    setText("statTotalStudents", stats.total_students);
    setText("heroTotalStudents", stats.total_students);
    setText("statTotalLevels", stats.total_levels);
    setText("statTotalArms", stats.total_arms);
    setText("statMissingPhone", stats.missing_phone);

    setText("countALL", stats.total_students);

    if (stats.level_counts) {
      Object.keys(stats.level_counts).forEach((level) => {
        setText(`count${level}`, stats.level_counts[level]);
      });
    }
  }

  /* ================= EXPORT ================= */

  function exportVisibleRowsToCSV() {
    const rows = getVisibleRows();

    if (!rows.length) {
      toast("Nothing to export", "No visible student records found.", "warning");
      return;
    }

    const headers = [
      "Admission_number",
      "Last_name",
      "First_name",
      "Other_names",
      "Phone",
      "Class",
      "Class_category"
    ];

    const lines = [headers.join(",")];

    rows.forEach((row) => {
      const values = [
        row.dataset.admission || "",
        row.dataset.lastName || "",
        row.dataset.firstName || "",
        row.dataset.otherNames || "",
        row.dataset.phone || "",
        row.dataset.arm || "",
        row.dataset.level || ""
      ];

      lines.push(values.map(escapeCSV).join(","));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "filtered_students.csv";
    link.click();

    URL.revokeObjectURL(url);
    toast("Export complete", `${rows.length} visible record(s) exported.`, "success");
  }

  /* ================= HELPERS ================= */

  function getAllRows() {
    return Array.from(document.querySelectorAll(".student-row"));
  }

  function getVisibleRows() {
    return getAllRows().filter((row) => row.style.display !== "none");
  }

  function getSelectedRows() {
    return getAllRows().filter((row) => row.querySelector(".row-check")?.checked);
  }

  function getSelectedAdmissions() {
    return getSelectedRows().map((row) => row.dataset.admission).filter(Boolean);
  }

  function findRowByAdmission(admission) {
    if (!admission) return null;

    return getAllRows().find((row) => {
      return (row.dataset.admission || "").toLowerCase() === String(admission).toLowerCase();
    });
  }

  function rowToPayload(row) {
    return {
      Admission_number: row.dataset.admission || "",
      Last_name: row.dataset.lastName || "",
      First_name: row.dataset.firstName || "",
      Other_names: row.dataset.otherNames || "",
      Phone: row.dataset.phone || "",
      Class: row.dataset.arm || "",
      Class_category: row.dataset.level || ""
    };
  }

  function normalizeStudent(student) {
    const lastName = student.last_name || student.Last_name || "";
    const firstName = student.first_name || student.First_name || "";
    const otherNames = student.other_names || student.Other_names || "";
    const admission = student.admission_number || student.Admission_number || "";
    const phone = student.phone || student.Phone || "";
    const classArm = student.class_arm || student.Class || "";
    const classCategory = student.class_category || student.Class_category || getLevelFromArm(classArm);

    return {
      admission_number: admission,
      last_name: lastName,
      first_name: firstName,
      other_names: otherNames,
      phone: phone,
      class_arm: classArm,
      class_category: classCategory,
      full_name: [lastName, firstName, otherNames].filter(Boolean).join(" ")
    };
  }

  function getInitials(row) {
    return `${(row.dataset.firstName || "S").charAt(0)}${(row.dataset.lastName || "").charAt(0)}`.toUpperCase();
  }

  function getInitialsFromStudent(student) {
    return `${(student.first_name || "S").charAt(0)}${(student.last_name || "").charAt(0)}`.toUpperCase();
  }

  function getLevelFromArm(arm) {
    const value = String(arm || "").toUpperCase();

    if (value.startsWith("JSS1")) return "JSS1";
    if (value.startsWith("JSS2")) return "JSS2";
    if (value.startsWith("JSS3")) return "JSS3";
    if (value.startsWith("SS1")) return "SS1";
    if (value.startsWith("SS2")) return "SS2";
    if (value.startsWith("SS3")) return "SS3";

    return "";
  }

  async function copyViewedStudent() {
    const text = [
      `Name: ${document.getElementById("viewFullName").textContent}`,
      `Admission No: ${document.getElementById("viewAdmission").textContent}`,
      `Class Arm: ${document.getElementById("viewClassArm").textContent}`,
      `Category: ${document.getElementById("viewClassCategory").textContent}`,
      `Phone: ${document.getElementById("viewPhone").textContent}`
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      toast("Copied", "Student details copied to clipboard.", "success");
    } catch {
      toast("Copy failed", "Your browser blocked clipboard access.", "error");
    }
  }

  function toast(title, message, type = "success") {
    const host = document.getElementById("studentToastHost");
    if (!host) return;

    const icons = {
      success: "fa-circle-check",
      error: "fa-circle-xmark",
      warning: "fa-triangle-exclamation",
      info: "fa-circle-info"
    };

    const item = document.createElement("div");
    item.className = `student-toast ${type}`;
    item.innerHTML = `
      <i class="fa-solid ${icons[type] || icons.info}"></i>
      <div>
        <strong>${escapeHTML(title)}</strong>
        <span>${escapeHTML(message)}</span>
      </div>
    `;

    host.appendChild(item);

    setTimeout(() => {
      item.style.opacity = "0";
      item.style.transform = "translateX(24px)";
      setTimeout(() => item.remove(), 260);
    }, 3000);
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? "—";
  }

  function escapeCSV(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}