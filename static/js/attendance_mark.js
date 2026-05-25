/* ============================================================
   ATTENDANCE MARKING STUDIO JS
   Daily marking + CSV save + attendance history + student profile
============================================================ */

document.addEventListener("DOMContentLoaded", function () {
  initAttendanceStudio();
});

function initAttendanceStudio() {
  const studio = document.querySelector(".attendance-studio");
  if (!studio) return;

  const urls = {
    students: studio.dataset.studentsUrl,
    save: studio.dataset.saveUrl,
    holiday: studio.dataset.holidayUrl,
    summary: studio.dataset.summaryUrl,
    history: studio.dataset.historyUrl,
    delete: studio.dataset.deleteUrl,
    studentHistory: studio.dataset.studentHistoryUrl,
    reportAttendance: studio.dataset.reportAttendanceUrl,
    dates: studio.dataset.datesUrl
  };

  const state = {
    students: [],
    activeFilter: "ALL",
    loadedClassArm: "",
    loadedClassCategory: "",
    activeStudentAdmission: "",
    activeStudentRow: null,
    historyRecords: [],
    historyDaily: [],
    historyStudents: [],
    historyDates: [],
    dirty: false,
    autoSaveEnabled: false,
    autoSaveTimer: null,
    autoUpdateTimer: null,
    lastLoadedSignature: ""
  };

  const els = {
    classArmsData: document.getElementById("classArmsData"),

    session: document.getElementById("sessionSelect"),
    term: document.getElementById("termSelect"),
    level: document.getElementById("levelSelect"),
    arm: document.getElementById("armSelect"),
    date: document.getElementById("attendanceDate"),

    loadBtn: document.getElementById("loadStudentsBtn"),
    refreshBtn: document.getElementById("refreshAttendanceBtn"),
    saveBtn: document.getElementById("saveAttendanceBtn"),
    overwrite: document.getElementById("overwriteExisting"),

    deleteCurrentBtn: document.getElementById("deleteCurrentAttendanceBtn"),
    tbody: document.getElementById("attendanceTableBody"),
    table: document.getElementById("attendanceTable"),
    search: document.getElementById("attendanceSearchInput"),
    selectAll: document.getElementById("selectAllStudents"),

    selectedCount: document.getElementById("selectedCount"),
    registerTitle: document.getElementById("registerTitle"),
    registerSubtitle: document.getElementById("registerSubtitle"),
    chipSession: document.getElementById("chipSession"),
    chipTerm: document.getElementById("chipTerm"),
    chipTimestamp: document.getElementById("chipTimestamp"),
    existingRecordCount: document.getElementById("existingRecordCount"),

    activeDateChip: document.getElementById("activeDateChip"),
    loadedClassChip: document.getElementById("loadedClassChip"),
    reportReadyChip: document.getElementById("reportReadyChip"),

    backdrop: document.getElementById("attendanceModalBackdrop"),
    holidayModal: document.getElementById("holidayConfirmModal"),
    studentModal: document.getElementById("attendanceStudentModal"),
    historyModal: document.getElementById("attendanceHistoryModal"),

    historySession: document.getElementById("historySessionSelect"),
    historyTerm: document.getElementById("historyTermSelect"),
    historyLevel: document.getElementById("historyLevelSelect"),
    historyArm: document.getElementById("historyArmSelect"),
    historyStartDate: document.getElementById("historyStartDate"),
    historyEndDate: document.getElementById("historyEndDate"),
    historyStatus: document.getElementById("historyStatusSelect"),
    historySearch: document.getElementById("historySearchInput"),

    historyRecordsBody: document.getElementById("historyRecordsBody"),
    historyDailyBody: document.getElementById("historyDailyBody"),
    historyStudentsBody: document.getElementById("historyStudentsBody"),
    historyDatesBody: document.getElementById("historyDatesBody"),

    studentHistoryBody: document.getElementById("studentHistoryTableBody")
  };

  let classArms = {};
  try {
    classArms = JSON.parse(els.classArmsData?.textContent || "{}");
  } catch {
    classArms = {};
  }

  hydrateAutoSaveToggle();
  ensureTodayDate();
  bindEvents();
  updateArmOptions();
  updateHistoryArmOptions();
  updateChips();
  updateCounters();
  updateMiniDashboard();

  function bindEvents() {
    els.level?.addEventListener("change", updateArmOptions);
    els.historyLevel?.addEventListener("change", updateHistoryArmOptions);

    els.session?.addEventListener("change", function () {
      updateChips();
      updateMiniDashboard();
      scheduleAutoUpdate();
    });

    els.term?.addEventListener("change", function () {
      updateChips();
      updateMiniDashboard();
      scheduleAutoUpdate();
    });

    els.date?.addEventListener("change", function () {
      updateMiniDashboard();
      if (state.loadedClassArm && els.arm?.value === state.loadedClassArm) {
        loadStudents();
      }
    });

    els.loadBtn?.addEventListener("click", loadStudents);
    els.refreshBtn?.addEventListener("click", loadStudents);
    els.saveBtn?.addEventListener("click", saveAttendance);

    els.search?.addEventListener("input", applyFilters);

    els.deleteCurrentBtn?.addEventListener("click", deleteCurrentAttendance);

    document.addEventListener("keydown", keyboardShortcuts);
    document.getElementById("autoSaveToggle")?.addEventListener("change", toggleAutoSave);
    window.addEventListener("beforeunload", function (event) {
      if (!state.dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });

    document.querySelectorAll(".filter-pill").forEach((btn) => {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".filter-pill").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.activeFilter = btn.dataset.filter || "ALL";
        applyFilters();
      });
    });

    document.getElementById("markAllPresentBtn")?.addEventListener("click", () => markAll("PRESENT"));
    document.getElementById("markAllAbsentBtn")?.addEventListener("click", () => markAll("ABSENT"));
    document.getElementById("markSelectedLateBtn")?.addEventListener("click", () => markSelected("LATE"));
    document.getElementById("markSelectedSickBtn")?.addEventListener("click", () => markSelected("SICK"));
    document.getElementById("markSelectedExcusedBtn")?.addEventListener("click", () => markSelected("EXCUSED"));
    document.getElementById("clearMarksBtn")?.addEventListener("click", clearMarks);

    document.getElementById("markHolidayBtn")?.addEventListener("click", openHolidayModal);
    document.getElementById("cancelHolidayBtn")?.addEventListener("click", closeModals);
    document.getElementById("confirmHolidayBtn")?.addEventListener("click", saveHoliday);

    document.getElementById("printRegisterBtn")?.addEventListener("click", () => window.print());
    document.getElementById("printHistoryBtn")?.addEventListener("click", () => window.print());

    document.getElementById("openHistoryBtn")?.addEventListener("click", openHistoryModal);
    document.getElementById("viewSummaryBtn")?.addEventListener("click", openSummaryModal);
    document.getElementById("viewCurrentClassHistoryBtn")?.addEventListener("click", openHistoryForCurrentClass);
    document.getElementById("closeHistoryModal")?.addEventListener("click", closeModals);
    document.getElementById("loadHistoryBtn")?.addEventListener("click", loadHistory);
    document.getElementById("resetHistoryBtn")?.addEventListener("click", resetHistoryFilters);
    document.getElementById("exportHistoryCsvBtn")?.addEventListener("click", exportHistoryCsv);

    document.getElementById("closeStudentModal")?.addEventListener("click", closeModals);
    document.getElementById("loadStudentHistoryBtn")?.addEventListener("click", loadActiveStudentHistory);

    els.backdrop?.addEventListener("click", closeModals);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeModals();
    });

    els.selectAll?.addEventListener("change", function () {
      getVisibleRows().forEach((row) => {
        const check = row.querySelector(".attendance-check");
        if (check) check.checked = els.selectAll.checked;
      });
      updateSelectedCount();
    });

    els.tbody?.addEventListener("change", function (event) {
      if (event.target.classList.contains("status-select")) {
        const row = event.target.closest(".attendance-row");
        syncRowStatus(row, event.target.value);
        updateCounters();
        applyFilters();
      }

      if (event.target.classList.contains("attendance-check")) {
        updateSelectedCount();
      }
    });

    els.tbody?.addEventListener("input", function (event) {
      if (
        event.target.classList.contains("reason-input") ||
        event.target.classList.contains("note-input")
      ) {
        const row = event.target.closest(".attendance-row");
        syncRowData(row);
      }
    });

    els.tbody?.addEventListener("click", function (event) {
      const row = event.target.closest(".attendance-row");
      if (!row) return;

      if (event.target.closest(".view-attendance-student")) {
        openStudentModal(row);
        return;
      }

      const actionBtn = event.target.closest("[data-mark]");
      if (actionBtn) {
        setRowStatus(row, actionBtn.dataset.mark);
      }
    });

    document.querySelectorAll(".history-tab").forEach((tab) => {
      tab.addEventListener("click", function () {
        switchHistoryTab(tab.dataset.historyTab || "records");
      });
    });

    els.historyDatesBody?.addEventListener("click", function (event) {
      const loadBtn = event.target.closest("[data-load-date]");
      const deleteBtn = event.target.closest("[data-delete-date]");

      if (loadBtn) {
        const selectedDate = loadBtn.dataset.loadDate;
        if (!selectedDate) return;

        if (els.historyStartDate) els.historyStartDate.value = selectedDate;
        if (els.historyEndDate) els.historyEndDate.value = selectedDate;

        loadHistory();
        return;
      }

      if (deleteBtn) {
        const selectedDate = deleteBtn.dataset.deleteDate;
        if (!selectedDate) return;

        deleteAttendanceDate(selectedDate);
      }
    });
  }

  /* ================= CLASS ARMS ================= */

  function updateArmOptions() {
    const level = els.level?.value || "";
    const arms = classArms[level] || [];

    if (!els.arm) return;

    els.arm.innerHTML = `<option value="">Select arm</option>`;

    arms.forEach((arm) => {
      const option = document.createElement("option");
      option.value = arm;
      option.textContent = arm.replaceAll("_", " ");
      els.arm.appendChild(option);
    });
  }

  function updateHistoryArmOptions() {
    const level = els.historyLevel?.value || "";
    const arms = classArms[level] || [];

    if (!els.historyArm) return;

    els.historyArm.innerHTML = `<option value="">Select arm</option>`;

    arms.forEach((arm) => {
      const option = document.createElement("option");
      option.value = arm;
      option.textContent = arm.replaceAll("_", " ");
      els.historyArm.appendChild(option);
    });
  }

  function setHistoryClass(level, arm) {
    if (els.historyLevel) {
      els.historyLevel.value = level || "";
    }

    updateHistoryArmOptions();

    if (els.historyArm) {
      els.historyArm.value = arm || "";
    }
  }

  /* ================= CHIPS / MINI DASHBOARD ================= */

  function updateChips() {
    setText("chipSession", els.session?.value || "—");
    setText("chipTerm", els.term?.value || "—");
  }

  function updateMiniDashboard() {
    setText("activeDateChip", els.date?.value || "—");
    setText("loadedClassChip", state.loadedClassArm ? state.loadedClassArm.replaceAll("_", " ") : "None");

    if (state.loadedClassArm && state.students.length) {
      setText("reportReadyChip", "Ready");
    } else {
      setText("reportReadyChip", "Waiting");
    }
  }

  function updateExistingRecordCount(count) {
    setText("existingRecordCount", count || 0);
  }

  /* ================= LOAD STUDENTS ================= */

  async function loadStudents() {
    const classArm = els.arm?.value || "";
    const level = els.level?.value || "";
    const dateValue = els.date?.value || "";

    if (!level || !classArm || !dateValue) {
      toast("Missing selection", "Select class level, class arm and date first.", "warning");
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams({
        class_arm: classArm,
        date: dateValue
      });

      const data = await fetchJSON(`${urls.students}?${params.toString()}`);

      state.students = data.students || [];
      state.loadedClassArm = data.class_arm || classArm;
      state.loadedClassCategory = data.class_category || level;

      renderStudents(state.students);
      updateCounters();
      updateSelectedCount();
      updateChips();
      updateMiniDashboard();
      updateExistingRecordCount(data.existing_count || 0);
      markClean();

      if (els.deleteCurrentBtn) {
        els.deleteCurrentBtn.disabled = !(data.existing_count > 0);
      }

      if (els.saveBtn) {
        els.saveBtn.disabled = state.students.length === 0;
      }

      if (els.registerTitle) {
        els.registerTitle.textContent = `${classArm.replaceAll("_", " ")} Attendance Register`;
      }

      if (els.registerSubtitle) {
        els.registerSubtitle.textContent = `${state.students.length} students loaded for ${formatDate(dateValue)}.`;
      }

      await loadQuickReportSummary();

      if ((data.existing_count || 0) > 0) {
        toast("Existing record found", `${data.existing_count} attendance record(s) already exist for this date.`, "warning");
      } else {
        toast("Class loaded", `${state.students.length} students loaded successfully.`, "success");
      }
    } catch (error) {
      toast("Load failed", error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  function renderStudents(students) {
    if (!students.length) {
      els.tbody.innerHTML = `
        <tr class="empty-row">
          <td colspan="9">
            <div class="attendance-empty-state">
              <i class="fa-solid fa-user-slash"></i>
              <h3>No students found</h3>
              <p>No record exists for this selected class arm.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    els.tbody.innerHTML = students.map((student, index) => buildRow(student, index)).join("");
    applyFilters();
  }

  function buildRow(student, index) {
    const status = normalizeStatus(student.status || "UNMARKED");
    const reason = student.reason || "";
    const note = student.note || "";
    const initials = getInitials(student.first_name, student.last_name);
    const fullName = student.full_name || `${student.last_name} ${student.first_name} ${student.other_names || ""}`.trim();

    return `
      <tr class="attendance-row status-${status.toLowerCase()}"
          data-admission="${escapeHTML(student.admission_number)}"
          data-last-name="${escapeHTML(student.last_name)}"
          data-first-name="${escapeHTML(student.first_name)}"
          data-other-names="${escapeHTML(student.other_names || "")}"
          data-name="${escapeHTML(fullName)}"
          data-class="${escapeHTML(student.class_arm)}"
          data-level="${escapeHTML(student.class_category)}"
          data-status="${escapeHTML(status)}"
          data-reason="${escapeHTML(reason)}"
          data-note="${escapeHTML(note)}">

        <td>
          <input type="checkbox" class="attendance-check">
        </td>

        <td class="serial">${index + 1}</td>

        <td>
          <button type="button" class="attendance-student-cell view-attendance-student" title="View student attendance history">
            <span class="attendance-avatar">${escapeHTML(initials)}</span>
            <div>
              <strong>${escapeHTML(fullName)}</strong>
              <small>${escapeHTML(student.admission_number)}</small>
            </div>
          </button>
        </td>

        <td>
          <span class="admission-pill">${escapeHTML(student.admission_number)}</span>
        </td>

        <td>
          <span class="class-pill">${escapeHTML(student.class_arm).replaceAll("_", " ")}</span>
        </td>

        <td>
          <div class="status-picker">
            <select class="status-select">
              ${statusOption("UNMARKED", status, "Unmarked")}
              ${statusOption("PRESENT", status, "Present")}
              ${statusOption("ABSENT", status, "Absent")}
              ${statusOption("LATE", status, "Late")}
              ${statusOption("SICK", status, "Sick")}
              ${statusOption("EXCUSED", status, "Excused")}
            </select>
          </div>
        </td>

        <td>
          <input type="text" class="reason-input" value="${escapeHTML(reason)}" placeholder="Reason...">
        </td>

        <td>
          <input type="text" class="note-input" value="${escapeHTML(note)}" placeholder="Optional note...">
        </td>

        <td>
          <div class="mark-actions">
            <button type="button" data-mark="PRESENT" title="Present"><i class="fa-solid fa-check"></i></button>
            <button type="button" data-mark="ABSENT" title="Absent"><i class="fa-solid fa-xmark"></i></button>
            <button type="button" data-mark="LATE" title="Late"><i class="fa-solid fa-person-running"></i></button>
            <button type="button" data-mark="SICK" title="Sick"><i class="fa-solid fa-kit-medical"></i></button>
            <button type="button" data-mark="EXCUSED" title="Excused"><i class="fa-solid fa-handshake-angle"></i></button>
          </div>
        </td>
      </tr>
    `;
  }

  function statusOption(value, current, label) {
    return `<option value="${value}" ${value === current ? "selected" : ""}>${label}</option>`;
  }

  /* ================= MARKING ================= */

  function setRowStatus(row, status) {
    if (!row) return;

    status = normalizeStatus(status);

    const select = row.querySelector(".status-select");
    if (select) select.value = status;

    syncRowStatus(row, status);
    updateCounters();
    applyFilters();
  }

  function syncRowStatus(row, status) {
    if (!row) return;

    status = normalizeStatus(status);
    row.dataset.status = status;
    row.className = `attendance-row status-${status.toLowerCase()}`;

    const reason = row.querySelector(".reason-input");

    if (reason && !reason.value.trim()) {
      if (status === "ABSENT") reason.value = "Absent";
      if (status === "SICK") reason.value = "Sick";
      if (status === "LATE") reason.value = "Late arrival";
      if (status === "EXCUSED") reason.value = "Excused";
    }

    syncRowData(row);
  }

  function syncRowData(row) {
    if (!row) return;

    row.dataset.reason = row.querySelector(".reason-input")?.value || "";
    row.dataset.note = row.querySelector(".note-input")?.value || "";
    markDirty();
  }

  function markAll(status) {
    const rows = getVisibleRows();

    if (!rows.length) {
      toast("No students", "Load a class first.", "warning");
      return;
    }

    rows.forEach((row) => setRowStatus(row, status));
    toast("Marked", `${rows.length} visible student(s) marked ${status.toLowerCase()}.`, "success");
  }

  function markSelected(status) {
    const rows = getSelectedRows();

    if (!rows.length) {
      toast("No selection", "Select students first.", "warning");
      return;
    }

    rows.forEach((row) => setRowStatus(row, status));
    toast("Selected updated", `${rows.length} selected student(s) marked ${status.toLowerCase()}.`, "success");
  }

  function clearMarks() {
    const rows = getVisibleRows();

    if (!rows.length) {
      toast("No students", "Load a class first.", "warning");
      return;
    }

    rows.forEach((row) => {
      const select = row.querySelector(".status-select");
      const reason = row.querySelector(".reason-input");
      const note = row.querySelector(".note-input");

      if (select) select.value = "UNMARKED";
      if (reason) reason.value = "";
      if (note) note.value = "";

      syncRowStatus(row, "UNMARKED");
    });

    toast("Cleared", "Visible attendance marks have been cleared.", "success");
    updateCounters();
    applyFilters();
  }

  /* ================= SAVE ================= */

 async function saveAttendance(options = {}) {
  const silent = !!options.silent;
  const rows = getAllRows();

  if (!rows.length || rows[0].classList.contains("empty-row")) {
    toast("No register", "Load a class before saving.", "warning");
    return;
  }

  const records = rows.map((row) => ({
    admission_number: row.dataset.admission || "",
    last_name: row.dataset.lastName || "",
    first_name: row.dataset.firstName || "",
    other_names: row.dataset.otherNames || "",
    status: row.dataset.status || "UNMARKED",
    reason: row.dataset.reason || "",
    note: row.dataset.note || ""
  }));

  const payload = {
    session: els.session?.value || "",
    term: els.term?.value || "",
    class_arm: state.loadedClassArm || els.arm?.value || "",
    class_category: state.loadedClassCategory || els.level?.value || "",
    date: els.date?.value || "",
    overwrite: !!els.overwrite?.checked,
    records
  };

  try {
    setBusy(els.saveBtn, true, options.source === "auto" ? "Auto saving..." : "Saving...");

    const data = await postJSON(urls.save, payload);

    const savedCount = data.saved_count || records.length;
    const className = (state.loadedClassArm || els.arm?.value || "class").replaceAll("_", " ");
    const dateText = formatDate(els.date?.value);

    setText("chipTimestamp", data.saved_at || "Saved");
    updateExistingRecordCount(savedCount);

    if (data.class_summary) {
      updateClassSummaryCounters(data.class_summary);
    }

    markClean();

    if (els.deleteCurrentBtn) els.deleteCurrentBtn.disabled = savedCount <= 0;

    await autoUpdateAfterMutation({ refreshHistory: true });

    if (!silent) {
      toast(
        "Attendance Saved",
        `${savedCount} record(s) saved for ${className}.`,
        "success"
      );

      successFlash(
        "Attendance Saved Successfully",
        `${savedCount} record(s) saved for ${className} on ${dateText}.`
      );
    }

  } catch (error) {
    toast("Save failed", error.message, "error");
  } finally {
    setBusy(els.saveBtn, false);
    if (els.saveBtn) els.saveBtn.disabled = state.students.length === 0;
  }
}

  /* ================= DELETE CURRENT ATTENDANCE ================= */

  async function deleteCurrentAttendance() {
    const classArm = state.loadedClassArm || els.arm?.value || "";
    const classCategory = state.loadedClassCategory || els.level?.value || "";
    const dateValue = els.date?.value || "";

    if (!urls.delete) {
      toast("Delete unavailable", "Delete API URL is missing on the page. Add data-delete-url to .attendance-studio.", "error");
      return;
    }

    if (!classArm || !classCategory || !dateValue) {
      toast("Missing selection", "Select/load class level, arm and date before deleting attendance.", "warning");
      return;
    }

    const className = classArm.replaceAll("_", " ");
    const dateText = formatDate(dateValue) || dateValue;

    const approved = confirm(
      `Delete attendance for ${className} on ${dateText}?\n\nThis will remove the saved attendance records for this date and cannot be undone.`
    );

    if (!approved) return;

    try {
      setBusy(els.deleteCurrentBtn, true, "Deleting...");

      const data = await postJSON(urls.delete, {
        session: els.session?.value || "",
        term: els.term?.value || "",
        class_arm: classArm,
        class_category: classCategory,
        date: dateValue
      });

      updateExistingRecordCount(0);
      setText("chipTimestamp", "Deleted");
      markClean();

      if (els.saveBtn) els.saveBtn.disabled = state.students.length === 0;
      if (els.deleteCurrentBtn) els.deleteCurrentBtn.disabled = true;

      await autoUpdateAfterMutation({ refreshStudents: true, refreshHistory: true });

      toast("Attendance deleted", data.message || `${className} attendance for ${dateText} deleted successfully.`, "success");
      successFlash("Attendance Deleted", `${className} attendance for ${dateText} was deleted successfully.`);
    } catch (error) {
      toast("Delete failed", error.message, "error");
    } finally {
      setBusy(els.deleteCurrentBtn, false);
    }
  }

  function markDirty() {
    state.dirty = true;
    studio.classList.add("has-unsaved-changes");

    if (els.saveBtn && state.students.length) {
      els.saveBtn.disabled = false;
    }

    scheduleAutoSave();
  }

  function markClean() {
    state.dirty = false;
    studio.classList.remove("has-unsaved-changes");
  }

  function hydrateAutoSaveToggle() {
    const saved = localStorage.getItem("attendanceAutoSaveEnabled");
    state.autoSaveEnabled = saved === "1";

    const toggle = document.getElementById("autoSaveToggle");
    if (toggle) toggle.checked = state.autoSaveEnabled;
  }

  function toggleAutoSave(event) {
    state.autoSaveEnabled = !!event.target.checked;
    localStorage.setItem("attendanceAutoSaveEnabled", state.autoSaveEnabled ? "1" : "0");

    if (state.autoSaveEnabled) {
      toast("Auto save enabled", "Changes will auto-save shortly after marking.", "success");
      scheduleAutoSave();
    } else {
      clearTimeout(state.autoSaveTimer);
      toast("Auto save disabled", "Use the Save Attendance button when you are done.", "info");
    }
  }

  function scheduleAutoSave() {
    clearTimeout(state.autoSaveTimer);

    if (!state.autoSaveEnabled || !state.dirty) return;

    state.autoSaveTimer = setTimeout(async () => {
      if (!state.dirty) return;
      try {
        await saveAttendance({ silent: true, source: "auto" });
        toast("Auto saved", "Attendance changes were saved automatically.", "success");
      } catch {
        /* saveAttendance already shows the error */
      }
    }, 9000);
  }

  function scheduleAutoUpdate(delay = 900) {
    clearTimeout(state.autoUpdateTimer);
    state.autoUpdateTimer = setTimeout(() => {
      loadQuickReportSummary();
      if (els.historyModal?.classList.contains("show") && els.historyArm?.value) {
        loadHistory();
      }
    }, delay);
  }

  async function autoUpdateAfterMutation(options = {}) {
    const refreshStudents = !!options.refreshStudents;
    const refreshHistory = !!options.refreshHistory;

    await loadQuickReportSummary();

    if (refreshHistory && els.historyModal?.classList.contains("show") && els.historyArm?.value) {
      await loadHistory();
    }

    if (refreshStudents && state.loadedClassArm && els.date?.value) {
      await softReloadStudents();
    }
  }

  async function softReloadStudents() {
    if (!state.loadedClassArm || !els.date?.value || !urls.students) return;

    try {
      const params = new URLSearchParams({
        class_arm: state.loadedClassArm,
        date: els.date.value
      });

      const data = await fetchJSON(`${urls.students}?${params.toString()}`);

      if (Array.isArray(data.students)) {
        state.students = data.students;
        renderStudents(state.students);
        updateCounters();
        updateSelectedCount();
        updateExistingRecordCount(data.existing_count || 0);
        if (els.deleteCurrentBtn) els.deleteCurrentBtn.disabled = !(data.existing_count > 0);
      }
    } catch {
      /* Silent reload failure; user already completed main action. */
    }
  }

  function keyboardShortcuts(event) {
    if (event.target && ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (els.saveBtn && !els.saveBtn.disabled) saveAttendance();
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r") {
      event.preventDefault();
      loadStudents();
    }

    if (event.key.toLowerCase() === "p") markSelected("PRESENT");
    if (event.key.toLowerCase() === "a") markSelected("ABSENT");
    if (event.key.toLowerCase() === "l") markSelected("LATE");
  }

  function ensureTodayDate() {
    if (els.date && !els.date.value) {
      els.date.value = new Date().toISOString().slice(0, 10);
    }
  }


  /* ================= HOLIDAY ================= */

  function openHolidayModal() {
    if (!els.arm?.value || !els.level?.value) {
      toast("Select class", "Select class level and arm before marking holiday.", "warning");
      return;
    }

    const reason = document.getElementById("holidayReason");
    if (reason) reason.value = "";

    showModal(els.holidayModal);
  }

 async function saveHoliday() {
  const payload = {
    session: els.session?.value || "",
    term: els.term?.value || "",
    class_arm: els.arm?.value || "",
    class_category: els.level?.value || "",
    date: els.date?.value || "",
    overwrite: !!els.overwrite?.checked,
    reason: document.getElementById("holidayReason")?.value.trim() || "Public holiday"
  };

  try {
    const data = await postJSON(urls.holiday, payload);

    closeModals();

    const className = (els.arm?.value || "class").replaceAll("_", " ");
    const dateText = formatDate(els.date?.value);

    setText("chipTimestamp", data.saved_at || "Saved");

    if (data.class_summary) {
      updateClassSummaryCounters(data.class_summary);
    }

    await loadQuickReportSummary();

    toast(
      "Holiday Saved",
      `${className} marked as holiday for ${dateText}.`,
      "success"
    );

    successFlash(
      "Holiday Recorded Successfully",
      `${className} has been marked as not in session (${dateText}).`
    );

  } catch (error) {
    toast("Holiday failed", error.message, "error");
  }
}

  /* ================= STUDENT MODAL ================= */

  function openStudentModal(row) {
    state.activeStudentRow = row;
    state.activeStudentAdmission = row.dataset.admission || "";

    setText("modalStudentAvatar", getInitials(row.dataset.firstName, row.dataset.lastName));
    setText("modalStudentName", row.dataset.name || "Student");
    setText("modalStudentAdmission", row.dataset.admission || "—");
    setText("modalStudentClass", (row.dataset.class || "—").replaceAll("_", " "));
    setText("modalStudentStatus", row.dataset.status || "UNMARKED");
    setText("modalStudentReason", row.dataset.reason || "—");
    setText("modalStudentNote", row.dataset.note || "—");

    setText("modalStudentDaysOpen", "—");
    setText("modalStudentDaysPresent", "—");
    setText("modalStudentDaysAbsent", "—");
    setText("modalStudentPercent", "—");

    if (els.studentHistoryBody) {
      els.studentHistoryBody.innerHTML = `
        <tr>
          <td colspan="5">Click Load Full History to view this student’s saved attendance.</td>
        </tr>
      `;
    }

    showModal(els.studentModal);
  }

  async function loadActiveStudentHistory() {
    if (!state.activeStudentAdmission) {
      toast("No student selected", "Open a student first.", "warning");
      return;
    }

    const classArm = state.loadedClassArm || state.activeStudentRow?.dataset.class || els.arm?.value || "";

    if (!classArm) {
      toast("No class selected", "Load a class first.", "warning");
      return;
    }

    try {
      const params = new URLSearchParams({
        class_arm: classArm,
        admission_number: state.activeStudentAdmission,
        session: els.session?.value || "",
        term: els.term?.value || ""
      });

      const data = await fetchJSON(`${urls.studentHistory}?${params.toString()}`);

      const summary = data.summary || {};

      setText("modalStudentDaysOpen", summary.days_school_open || 0);
      setText("modalStudentDaysPresent", summary.days_present || 0);
      setText("modalStudentDaysAbsent", summary.days_absent || 0);
      setText("modalStudentPercent", `${summary.attendance_percentage || 0}%`);

      renderStudentHistoryRows(data.records || []);

      toast("Student history loaded", `${data.records?.length || 0} record(s) found.`, "success");
    } catch (error) {
      toast("History failed", error.message, "error");
    }
  }

  function renderStudentHistoryRows(records) {
    if (!els.studentHistoryBody) return;

    if (!records.length) {
      els.studentHistoryBody.innerHTML = `
        <tr>
          <td colspan="5">No saved attendance history found for this student.</td>
        </tr>
      `;
      return;
    }

    els.studentHistoryBody.innerHTML = records.map((row) => `
      <tr>
        <td>${escapeHTML(row.Date)}</td>
        <td>${escapeHTML(row.Day || "—")}</td>
        <td>${statusBadge(row.Status)}</td>
        <td>${escapeHTML(row.Reason || "—")}</td>
        <td>${escapeHTML(row.Note || "—")}</td>
      </tr>
    `).join("");
  }

  /* ================= HISTORY MODAL ================= */

  function openHistoryModal() {
    const level = els.level?.value || "";
    const arm = els.arm?.value || "";

    if (level) setHistoryClass(level, arm);

    if (els.historySession) els.historySession.value = els.session?.value || "";
    if (els.historyTerm) els.historyTerm.value = els.term?.value || "";
    if (els.historyEndDate && !els.historyEndDate.value) els.historyEndDate.value = els.date?.value || "";

    showModal(els.historyModal);
  }

  function openHistoryForCurrentClass() {
    const level = els.level?.value || "";
    const arm = els.arm?.value || "";

    if (!level || !arm) {
      toast("Select class", "Select class level and arm first.", "warning");
      return;
    }

    setHistoryClass(level, arm);

    if (els.historySession) els.historySession.value = els.session?.value || "";
    if (els.historyTerm) els.historyTerm.value = els.term?.value || "";
    if (els.historyEndDate) els.historyEndDate.value = els.date?.value || "";

    showModal(els.historyModal);
    loadHistory();
  }

  async function loadHistory() {
    const classArm = els.historyArm?.value || "";

    if (!classArm) {
      toast("Select class arm", "Choose a class arm to view saved attendance.", "warning");
      return;
    }

    try {
      const params = new URLSearchParams({
        class_arm: classArm
      });

      appendParam(params, "session", els.historySession?.value || "");
      appendParam(params, "term", els.historyTerm?.value || "");
      appendParam(params, "start_date", els.historyStartDate?.value || "");
      appendParam(params, "end_date", els.historyEndDate?.value || "");
      appendParam(params, "status", els.historyStatus?.value || "");
      appendParam(params, "search", els.historySearch?.value || "");

      const data = await fetchJSON(`${urls.history}?${params.toString()}`);

      state.historyRecords = data.records || [];
      state.historyDaily = data.daily_breakdown || [];
      state.historyStudents = data.student_breakdown || [];

      renderHistorySummary(data.summary || {});
      renderHistoryRecords(state.historyRecords);
      renderHistoryDaily(state.historyDaily);
      renderHistoryStudents(state.historyStudents);

      await loadSavedDates(classArm);

      toast("History loaded", `${data.total_records || 0} saved record(s) found.`, "success");
    } catch (error) {
      toast("History failed", error.message, "error");
    }
  }

  async function loadSavedDates(classArm) {
    if (!urls.dates || !classArm) return;

    try {
      const params = new URLSearchParams({ class_arm: classArm });
      const data = await fetchJSON(`${urls.dates}?${params.toString()}`);

      state.historyDates = data.dates || [];
      renderHistoryDates(state.historyDates);
    } catch (error) {
      renderHistoryDates([]);
    }
  }

  function renderHistorySummary(summary) {
    setText("historyTotalRecords", summary.total_records || 0);
    setText("historyDaysOpen", summary.days_school_open || 0);
    setText("historyPresent", summary.present || 0);
    setText("historyAbsent", summary.absent || 0);
    setText("historyLate", summary.late || 0);
    setText("historySick", summary.sick || 0);
    setText("historyExcused", summary.excused || 0);
    setText("historyHoliday", summary.holiday || 0);

    setText("daysOpenCount", summary.days_school_open || 0);
    setText("savedRecordsCount", summary.total_records || 0);
  }

  function renderHistoryRecords(records) {
    if (!els.historyRecordsBody) return;

    if (!records.length) {
      els.historyRecordsBody.innerHTML = `
        <tr>
          <td colspan="10">No saved attendance record found for this filter.</td>
        </tr>
      `;
      return;
    }

    els.historyRecordsBody.innerHTML = records.map((row) => {
      const fullName = row.Full_name || `${row.Last_name || ""} ${row.First_name || ""} ${row.Other_names || ""}`.trim();

      return `
        <tr>
          <td>${escapeHTML(row.Date || "—")}</td>
          <td>${escapeHTML(row.Day || "—")}</td>
          <td>${escapeHTML(row.Week || "—")}</td>
          <td>${escapeHTML(fullName || "—")}</td>
          <td>${escapeHTML(row.Admission_number || "—")}</td>
          <td>${escapeHTML(row.Class || "—").replaceAll("_", " ")}</td>
          <td>${statusBadge(row.Status)}</td>
          <td>${escapeHTML(row.Reason || "—")}</td>
          <td>${escapeHTML(row.Note || "—")}</td>
          <td>${escapeHTML(row.Saved_at || "—")}</td>
        </tr>
      `;
    }).join("");
  }

  function renderHistoryDaily(items) {
    if (!els.historyDailyBody) return;

    if (!items.length) {
      els.historyDailyBody.innerHTML = `
        <tr>
          <td colspan="10">No daily breakdown found.</td>
        </tr>
      `;
      return;
    }

    els.historyDailyBody.innerHTML = items.map((item) => {
      const summary = item.summary || {};

      return `
        <tr>
          <td>${escapeHTML(item.date || "—")}</td>
          <td>${escapeHTML(item.day || "—")}</td>
          <td>${escapeHTML(item.month || "—")}</td>
          <td>${escapeHTML(item.week || "—")}</td>
          <td>${summary.total_records || 0}</td>
          <td>${summary.present || 0}</td>
          <td>${summary.absent || 0}</td>
          <td>${summary.late || 0}</td>
          <td>${summary.sick || 0}</td>
          <td>${summary.holiday || 0}</td>
        </tr>
      `;
    }).join("");
  }

  function renderHistoryStudents(students) {
    if (!els.historyStudentsBody) return;

    if (!students.length) {
      els.historyStudentsBody.innerHTML = `
        <tr>
          <td colspan="10">No student summary found.</td>
        </tr>
      `;
      return;
    }

    els.historyStudentsBody.innerHTML = students.map((item) => {
      const summary = item.summary || {};

      return `
        <tr>
          <td>${escapeHTML(item.full_name || "—")}</td>
          <td>${escapeHTML(item.admission_number || "—")}</td>
          <td>${escapeHTML(item.class_arm || "—").replaceAll("_", " ")}</td>
          <td>${summary.days_school_open || 0}</td>
          <td>${summary.days_present || 0}</td>
          <td>${summary.days_absent || 0}</td>
          <td>${summary.days_late || 0}</td>
          <td>${summary.days_sick || 0}</td>
          <td>${summary.attendance_score || 0}</td>
          <td>${summary.attendance_percentage || 0}%</td>
        </tr>
      `;
    }).join("");
  }
  

function renderHistoryDates(dates) {
  if (!els.historyDatesBody) return;

  if (!dates.length) {
    els.historyDatesBody.innerHTML = `
      <tr>
        <td colspan="10">No saved dates found for this class.</td>
      </tr>
    `;
    return;
  }

  els.historyDatesBody.innerHTML = dates.map((item) => {
    const summary = item.summary || {};

    return `
      <tr>
        <td>${escapeHTML(item.date || "—")}</td>
        <td>${escapeHTML(item.day || "—")}</td>
        <td>${escapeHTML(item.month || "—")}</td>
        <td>${escapeHTML(item.week || "—")}</td>
        <td>${item.record_count || 0}</td>
        <td>${summary.present || 0}</td>
        <td>${summary.absent || 0}</td>
        <td>${summary.late || 0}</td>
        <td>${summary.sick || 0}</td>
        <td>
          <div class="history-date-actions">
            <button type="button" class="row-action-btn" data-load-date="${escapeHTML(item.date || "")}" title="Load this date">
              <i class="fa-solid fa-eye"></i>
            </button>

            <button type="button" class="row-action-btn danger" data-delete-date="${escapeHTML(item.date || "")}" title="Delete this date">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}


  function switchHistoryTab(tabName) {
    document.querySelectorAll(".history-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.historyTab === tabName);
    });

    const panelMap = {
      records: "historyRecordsPanel",
      daily: "historyDailyPanel",
      students: "historyStudentsPanel",
      dates: "historyDatesPanel"
    };

    Object.values(panelMap).forEach((id) => {
      document.getElementById(id)?.classList.remove("active");
    });

    document.getElementById(panelMap[tabName] || panelMap.records)?.classList.add("active");
  }

  function resetHistoryFilters() {
    if (els.historySession) els.historySession.value = "";
    if (els.historyTerm) els.historyTerm.value = "";
    if (els.historyStartDate) els.historyStartDate.value = "";
    if (els.historyEndDate) els.historyEndDate.value = els.date?.value || "";
    if (els.historyStatus) els.historyStatus.value = "";
    if (els.historySearch) els.historySearch.value = "";

    toast("Filters reset", "History filters have been cleared.", "success");
  }


  async function deleteAttendanceDate(attendanceDate) {
  const classArm = els.historyArm?.value || "";

  if (!classArm) {
    toast("Select class", "Select class arm before deleting.", "warning");
    return;
  }

  if (!confirm(`Delete all attendance records for ${attendanceDate}? This cannot be undone.`)) {
    return;
  }

  try {
    const data = await postJSON(urls.delete, {
      session: els.historySession?.value || els.session?.value || "",
      term: els.historyTerm?.value || els.term?.value || "",
      class_arm: classArm,
      class_category: els.historyLevel?.value || els.level?.value || "",
      date: attendanceDate
    });

    toast("Attendance deleted", data.message || "Attendance record deleted successfully.", "success");
    successFlash("Attendance Deleted", `${classArm.replaceAll("_", " ")} record for ${attendanceDate} was deleted.`);

    await loadHistory();
    await autoUpdateAfterMutation({ refreshStudents: attendanceDate === els.date?.value, refreshHistory: false });

  } catch (error) {
    toast("Delete failed", error.message, "error");
  }
}


  function exportHistoryCsv() {
    const records = state.historyRecords || [];

    if (!records.length) {
      toast("No records", "Load attendance history before exporting.", "warning");
      return;
    }

    const headers = [
      "Date",
      "Day",
      "Month",
      "Week",
      "Session",
      "Term",
      "Class",
      "Class_category",
      "Admission_number",
      "Last_name",
      "First_name",
      "Other_names",
      "Full_name",
      "Status",
      "Reason",
      "Note",
      "Saved_at",
      "Record_type"
    ];

    const csv = [
      headers.join(","),
      ...records.map((row) => headers.map((field) => csvCell(row[field] || "")).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const classArm = els.historyArm?.value || state.loadedClassArm || "attendance";

    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance_history_${classArm}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    toast("Export ready", "Attendance history CSV downloaded.", "success");
  }

  /* ================= QUICK REPORT SUMMARY ================= */

  async function loadQuickReportSummary() {
    const classArm = state.loadedClassArm || els.arm?.value || "";

    if (!classArm || !urls.reportAttendance) return;

    try {
      const params = new URLSearchParams({
        class_arm: classArm,
        session: els.session?.value || "",
        term: els.term?.value || ""
      });

      const data = await fetchJSON(`${urls.reportAttendance}?${params.toString()}`);

      setText("daysOpenCount", data.days_school_open || 0);

      if (data.days_school_open) {
        setText("reportReadyChip", `${data.days_school_open} day(s) open`);
      }
    } catch {
      /* Silent fail so page does not disturb marking */
    }
  }

  function updateClassSummaryCounters(summary) {
    setText("daysOpenCount", summary.days_school_open || 0);
    setText("savedRecordsCount", summary.total_records || 0);
  }

  /* ================= FILTERS / COUNTERS ================= */

  function applyFilters() {
    const query = (els.search?.value || "").toLowerCase().trim();
    let visible = 0;

    getAllRows().forEach((row, index) => {
      if (row.classList.contains("empty-row")) return;

      const status = row.dataset.status || "UNMARKED";
      const text = [
        row.dataset.name,
        row.dataset.admission,
        row.dataset.class,
        row.dataset.level,
        row.dataset.reason,
        row.dataset.note,
        status
      ].join(" ").toLowerCase();

      const matchesStatus = state.activeFilter === "ALL" || status === state.activeFilter;
      const matchesQuery = !query || text.includes(query);
      const show = matchesStatus && matchesQuery;

      row.style.display = show ? "" : "none";

      if (show) {
        visible += 1;
        row.querySelector(".serial").textContent = visible;
        row.style.animationDelay = `${Math.min(index * 0.012, 0.22)}s`;
      }
    });

    updateSelectedCount();
  }

  function updateCounters() {
    const rows = getAllRows().filter((row) => !row.classList.contains("empty-row"));

    const counts = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      SICK: 0,
      EXCUSED: 0,
      UNMARKED: 0
    };

    rows.forEach((row) => {
      const status = row.dataset.status || "UNMARKED";
      counts[status] = (counts[status] || 0) + 1;
    });

    setText("presentCount", counts.PRESENT || 0);
    setText("absentCount", counts.ABSENT || 0);
    setText("lateCount", counts.LATE || 0);
    setText("sickCount", counts.SICK || 0);
    setText("pendingCount", counts.UNMARKED || 0);
    setText("totalCount", rows.length || 0);
  }

  function updateSelectedCount() {
    const selected = getSelectedRows().length;
    setText("selectedCount", selected);

    if (els.selectAll) {
      const visibleRows = getVisibleRows();
      els.selectAll.checked = visibleRows.length > 0 && visibleRows.every((row) => {
        return row.querySelector(".attendance-check")?.checked;
      });
    }
  }

  /* ================= MODALS ================= */


async function openSummaryModal() {
  const classArm = els.arm?.value;

  if (!classArm) {
    toast("Select class", "Select class before viewing summary.", "warning");
    return;
  }

  try {
    const params = new URLSearchParams({
      class_arm: classArm,
      session: els.session?.value || "",
      term: els.term?.value || ""
    });

    const data = await fetchJSON(`${urls.summary || urls.history}?${params.toString()}`);

    console.log("SUMMARY DATA:", data);

    const summary = data.summary || {};

    successFlash(
      "Class Summary",
      `Present: ${summary.present || 0}, Absent: ${summary.absent || 0}, Days Open: ${summary.days_school_open || 0}`
    );

  } catch (err) {
    toast("Summary failed", err.message, "error");
  }
}




  function showModal(modal) {
    if (!modal) return;

    els.backdrop?.classList.add("show");
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("command-open");
  }

  function closeModals() {
    els.backdrop?.classList.remove("show");

    [els.holidayModal, els.studentModal, els.historyModal].forEach((modal) => {
      if (!modal) return;
      modal.classList.remove("show");
      modal.setAttribute("aria-hidden", "true");
    });

    document.body.classList.remove("command-open");
  }

  /* ================= HELPERS ================= */

  function getAllRows() {
    return Array.from(document.querySelectorAll(".attendance-row"));
  }

  function getVisibleRows() {
    return getAllRows().filter((row) => row.style.display !== "none");
  }

  function getSelectedRows() {
    return getAllRows().filter((row) => row.querySelector(".attendance-check")?.checked);
  }

  function setLoading(isLoading) {
    const icon = els.loadBtn?.querySelector("i");

    if (isLoading) {
      studio.classList.add("is-loading");
      els.loadBtn.disabled = true;
      els.refreshBtn.disabled = true;
      if (icon) icon.classList.add("fa-spin");
    } else {
      studio.classList.remove("is-loading");
      els.loadBtn.disabled = false;
      els.refreshBtn.disabled = false;
      if (icon) icon.classList.remove("fa-spin");
    }
  }

  function setBusy(button, isBusy, label) {
    if (!button) return;

    if (isBusy) {
      button.dataset.originalHtml = button.dataset.originalHtml || button.innerHTML;
      button.disabled = true;
      button.classList.add("saving", "is-busy");

      if (label) {
        button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${escapeHTML(label)}`;
      }
    } else {
      button.classList.remove("saving", "is-busy");
      if (button.dataset.originalHtml) {
        button.innerHTML = button.dataset.originalHtml;
      }

      if (button === els.saveBtn) {
        button.disabled = state.students.length === 0;
      } else if (button === els.deleteCurrentBtn) {
        button.disabled = Number(document.getElementById("existingRecordCount")?.textContent || "0") <= 0;
      } else {
        button.disabled = false;
      }
    }
  }

  async function fetchJSON(url) {
    if (!url) throw new Error("Missing API URL for this action.");
    const response = await fetch(url, {
      headers: { Accept: "application/json" }
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "Request failed.");
    }

    return data;
  }

  async function postJSON(url, payload) {
    if (!url) throw new Error("Missing API URL for this action.");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "Request failed.");
    }

    return data;
  }

  function appendParam(params, key, value) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.append(key, value);
    }
  }


  function successFlash(title, message) {
  let flash = document.getElementById("attendanceSuccessFlash");

  if (!flash) {
    flash = document.createElement("div");
    flash.id = "attendanceSuccessFlash";
    flash.innerHTML = `
      <div class="success-flash-card">
        <span class="success-flash-icon">
          <i class="fa-solid fa-circle-check"></i>
        </span>
        <div>
          <strong id="successFlashTitle"></strong>
          <p id="successFlashMessage"></p>
        </div>
      </div>
    `;
    document.body.appendChild(flash);
  }

  document.getElementById("successFlashTitle").textContent = title;
  document.getElementById("successFlashMessage").textContent = message;

  flash.classList.remove("show");
  void flash.offsetWidth;
  flash.classList.add("show");

  setTimeout(() => {
    flash.classList.remove("show");
  }, 2600);
}



  

  function toast(title, message, type = "success") {
    const host = document.getElementById("attendanceToastHost");
    if (!host) return;

    const iconMap = {
      success: "fa-circle-check",
      error: "fa-circle-xmark",
      warning: "fa-triangle-exclamation",
      info: "fa-circle-info"
    };

    const item = document.createElement("div");
    item.className = `attendance-toast ${type}`;
    item.innerHTML = `
      <i class="fa-solid ${iconMap[type] || iconMap.info}"></i>
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
    }, 3200);
  }

  function statusBadge(status) {
    const value = normalizeStatus(status);
    const iconMap = {
      PRESENT: "fa-user-check",
      ABSENT: "fa-user-xmark",
      LATE: "fa-person-running",
      SICK: "fa-kit-medical",
      EXCUSED: "fa-handshake-angle",
      HOLIDAY: "fa-umbrella-beach",
      UNMARKED: "fa-clock"
    };

    return `
      <span class="status-pill status-${value.toLowerCase()}">
        <i class="fa-solid ${iconMap[value] || iconMap.UNMARKED}"></i>
        ${escapeHTML(value)}
      </span>
    `;
  }

  function normalizeStatus(value) {
    const status = String(value || "UNMARKED").trim().toUpperCase();

    const allowed = [
      "PRESENT",
      "ABSENT",
      "LATE",
      "SICK",
      "EXCUSED",
      "HOLIDAY",
      "UNMARKED"
    ];

    return allowed.includes(status) ? status : "UNMARKED";
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? "—";
  }

  function getInitials(first, last) {
    return `${(first || "S").charAt(0)}${(last || "").charAt(0)}`.toUpperCase();
  }

  function formatDate(value) {
    if (!value) return "";

    const date = new Date(`${value}T00:00:00`);

    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function csvCell(value) {
    const text = String(value ?? "");
    const escaped = text.replace(/"/g, '""');
    return `"${escaped}"`;
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