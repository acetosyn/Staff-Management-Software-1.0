/* ============================================================
   ATTENDANCE MARKING STUDIO JS
   Load students, mark attendance, save CSV, holiday mode
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
    summary: studio.dataset.summaryUrl
  };

  const state = {
    students: [],
    activeFilter: "ALL",
    loadedClassArm: "",
    loadedClassCategory: ""
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
    backdrop: document.getElementById("attendanceModalBackdrop"),
    holidayModal: document.getElementById("holidayConfirmModal"),
    studentModal: document.getElementById("attendanceStudentModal")
  };

  let classArms = {};
  try {
    classArms = JSON.parse(els.classArmsData?.textContent || "{}");
  } catch {
    classArms = {};
  }

  bindEvents();
  updateArmOptions();
  updateCounters();

  function bindEvents() {
    els.level?.addEventListener("change", updateArmOptions);

    els.session?.addEventListener("change", updateChips);
    els.term?.addEventListener("change", updateChips);

    els.loadBtn?.addEventListener("click", loadStudents);
    els.refreshBtn?.addEventListener("click", loadStudents);
    els.saveBtn?.addEventListener("click", saveAttendance);

    els.search?.addEventListener("input", applyFilters);

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
    document.getElementById("clearMarksBtn")?.addEventListener("click", clearMarks);

    document.getElementById("markHolidayBtn")?.addEventListener("click", openHolidayModal);
    document.getElementById("cancelHolidayBtn")?.addEventListener("click", closeModals);
    document.getElementById("confirmHolidayBtn")?.addEventListener("click", saveHoliday);

    document.getElementById("printRegisterBtn")?.addEventListener("click", () => window.print());

    document.getElementById("closeStudentModal")?.addEventListener("click", closeModals);
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
  }

  function updateArmOptions() {
    const level = els.level?.value || "";
    const arms = classArms[level] || [];

    els.arm.innerHTML = `<option value="">Select arm</option>`;

    arms.forEach((arm) => {
      const option = document.createElement("option");
      option.value = arm;
      option.textContent = arm.replace("_", " ");
      els.arm.appendChild(option);
    });
  }

  function updateChips() {
    if (els.chipSession) els.chipSession.textContent = els.session.value;
    if (els.chipTerm) els.chipTerm.textContent = els.term.value;
  }

  async function loadStudents() {
    const classArm = els.arm.value;
    const level = els.level.value;
    const dateValue = els.date.value;

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

      const response = await fetch(`${urls.students}?${params.toString()}`, {
        headers: { Accept: "application/json" }
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Unable to load students.");
      }

      state.students = data.students || [];
      state.loadedClassArm = data.class_arm || classArm;
      state.loadedClassCategory = data.class_category || level;

      renderStudents(state.students);
      updateCounters();
      updateSelectedCount();
      updateChips();

      els.saveBtn.disabled = state.students.length === 0;
      els.registerTitle.textContent = `${classArm.replace("_", " ")} Attendance Register`;
      els.registerSubtitle.textContent = `${state.students.length} students loaded for ${formatDate(dateValue)}.`;

      if (data.existing_count > 0) {
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
    const status = student.status || "UNMARKED";
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
          <button type="button" class="attendance-student-cell view-attendance-student">
            <span>${escapeHTML(initials)}</span>
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
          <span class="class-pill">${escapeHTML(student.class_arm).replace("_", " ")}</span>
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
          </div>
        </td>
      </tr>
    `;
  }

  function statusOption(value, current, label) {
    return `<option value="${value}" ${value === current ? "selected" : ""}>${label}</option>`;
  }

  function setRowStatus(row, status) {
    if (!row) return;

    const select = row.querySelector(".status-select");
    if (select) select.value = status;

    syncRowStatus(row, status);
    updateCounters();
    applyFilters();
  }

  function syncRowStatus(row, status) {
    row.dataset.status = status;
    row.className = `attendance-row status-${status.toLowerCase()}`;

    if (status === "ABSENT" && !row.querySelector(".reason-input").value.trim()) {
      row.querySelector(".reason-input").value = "Absent";
    }

    if (status === "SICK" && !row.querySelector(".reason-input").value.trim()) {
      row.querySelector(".reason-input").value = "Sick";
    }

    if (status === "LATE" && !row.querySelector(".reason-input").value.trim()) {
      row.querySelector(".reason-input").value = "Late arrival";
    }

    syncRowData(row);
  }

  function syncRowData(row) {
    if (!row) return;

    row.dataset.reason = row.querySelector(".reason-input")?.value || "";
    row.dataset.note = row.querySelector(".note-input")?.value || "";
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
    getVisibleRows().forEach((row) => {
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

  async function saveAttendance() {
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
      session: els.session.value,
      term: els.term.value,
      class_arm: state.loadedClassArm || els.arm.value,
      class_category: state.loadedClassCategory || els.level.value,
      date: els.date.value,
      overwrite: els.overwrite.checked,
      records
    };

    try {
      els.saveBtn.disabled = true;
      els.saveBtn.classList.add("saving");

      const response = await fetch(urls.save, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Unable to save attendance.");
      }

      els.chipTimestamp.textContent = data.saved_at || "Saved";
      toast("Attendance saved", `${data.saved_count || records.length} record(s) saved to CSV.`, "success");
    } catch (error) {
      toast("Save failed", error.message, "error");
    } finally {
      els.saveBtn.disabled = false;
      els.saveBtn.classList.remove("saving");
    }
  }

  function openHolidayModal() {
    if (!els.arm.value || !els.level.value) {
      toast("Select class", "Select class level and arm before marking holiday.", "warning");
      return;
    }

    document.getElementById("holidayReason").value = "";
    els.backdrop?.classList.add("show");
    els.holidayModal?.classList.add("show");
    els.holidayModal?.setAttribute("aria-hidden", "false");
    document.body.classList.add("command-open");
  }

  async function saveHoliday() {
    const payload = {
      session: els.session.value,
      term: els.term.value,
      class_arm: els.arm.value,
      class_category: els.level.value,
      date: els.date.value,
      overwrite: els.overwrite.checked,
      reason: document.getElementById("holidayReason").value.trim() || "Public holiday"
    };

    try {
      const response = await fetch(urls.holiday, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Unable to save holiday.");
      }

      closeModals();
      els.chipTimestamp.textContent = data.saved_at || "Saved";
      toast("Holiday saved", data.message || "Holiday record saved successfully.", "success");
    } catch (error) {
      toast("Holiday failed", error.message, "error");
    }
  }

  function openStudentModal(row) {
    setText("modalStudentAvatar", getInitials(row.dataset.firstName, row.dataset.lastName));
    setText("modalStudentName", row.dataset.name || "Student");
    setText("modalStudentAdmission", row.dataset.admission || "—");
    setText("modalStudentClass", (row.dataset.class || "—").replace("_", " "));
    setText("modalStudentStatus", row.dataset.status || "UNMARKED");
    setText("modalStudentReason", row.dataset.reason || "—");
    setText("modalStudentNote", row.dataset.note || "—");

    els.backdrop?.classList.add("show");
    els.studentModal?.classList.add("show");
    els.studentModal?.setAttribute("aria-hidden", "false");
    document.body.classList.add("command-open");
  }

  function closeModals() {
    els.backdrop?.classList.remove("show");

    [els.holidayModal, els.studentModal].forEach((modal) => {
      if (!modal) return;
      modal.classList.remove("show");
      modal.setAttribute("aria-hidden", "true");
    });

    document.body.classList.remove("command-open");
  }

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
      els.loadBtn.disabled = true;
      els.refreshBtn.disabled = true;
      if (icon) icon.classList.add("fa-spin");
    } else {
      els.loadBtn.disabled = false;
      els.refreshBtn.disabled = false;
      if (icon) icon.classList.remove("fa-spin");
    }
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

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}