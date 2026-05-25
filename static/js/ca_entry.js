/* ==========================================================
   CA ENTRY — FULL INTERACTIVE ENGINE
   Handles:
   - JSS / SS dynamic structures
   - class arm dropdowns
   - subject dropdowns
   - live table rendering
   - score validation
   - save / load / reload / delete records
   - CSV template download
   - visible export
   - modals
   - bulk tools
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initCA();
});


/* ==========================================================
   GLOBAL STATE
========================================================== */

let students = [];
let activeStructure = null;
let currentStudentId = null;
let savedRecordsCache = [];


/* ==========================================================
   STRUCTURE DEFINITIONS
========================================================== */

const STRUCTURES = {
  JSS: [
    { key: "ca1", label: "CA1", backend: "CA1", max: 10 },
    { key: "ca2", label: "CA2", backend: "CA2", max: 10 },
    { key: "test1", label: "Test 1", backend: "TEST1", max: 20 },
    { key: "test2", label: "Test 2", backend: "TEST2", max: 20 }
  ],

  SS: [
    { key: "ass1", label: "1st Ass.", backend: "ASS1", max: 5 },
    { key: "ass2", label: "2nd Ass.", backend: "ASS2", max: 5 },
    { key: "test", label: "Test", backend: "TEST", max: 20 }
  ]
};


const CLASS_ARMS = {
  JSS1: ["JSS1A", "JSS1B", "JSS1C"],
  JSS2: ["JSS2A", "JSS2B", "JSS2C"],
  JSS3: ["JSS3A", "JSS3B", "JSS3C"],

  SS1: ["SS1B", "SS1_GOLD", "SS1_SILVER", "SS1_DIAMOND"],
  SS2: ["SS2B", "SS2_GOLD", "SS2_SILVER", "SS2_DIAMOND"],
  SS3: ["SS3B", "SS3_GOLD", "SS3_SILVER"]
};


const SUBJECTS_BY_LEVEL = {
  JSS1: [
    "Yoruba Language",
    "History",
    "IRK",
    "CCA",
    "Arabic Language",
    "Business Studies",
    "Mathematics",
    "English Language",
    "Poise",
    "Islamiyyah",
    "Hort & Crop Production",
    "Digital Tech.",
    "Inter Science",
    "Garment Making",
    "Soc. & Cit. Std",
    "P.H.E"
  ],

  JSS2: [
    "Yoruba Language",
    "History",
    "IRK",
    "CCA",
    "Arabic Language",
    "Business Studies",
    "Mathematics",
    "English Language",
    "BST",
    "National Value",
    "PVS",
    "Poise",
    "Islamiyyah"
  ],

  JSS3: [
    "History",
    "IRK",
    "Hausa Language",
    "CCA",
    "Arabic Language",
    "Business Studies",
    "Mathematics",
    "English Language",
    "BST",
    "National Value",
    "PVS",
    "Poise",
    "Islamiyyah"
  ],

  SS1: [
    "Biology",
    "IRS",
    "Physics",
    "Geography",
    "Mathematics",
    "English Language",
    "Chemistry",
    "Poise",
    "Islamiyyah",
    "Digital Tech.",
    "Cit & Her. Std",
    "Garment Making"
  ],

  SS2: [
    "Civic Education",
    "Mathematics",
    "English Language",
    "Economics",
    "Poise",
    "Islamiyyah",
    "Arabic Language",
    "IRS",
    "Commerce",
    "Financial Account",
    "Marketing",
    "Government"
  ],

  SS3: [
    "Islamiyyah",
    "Poise",
    "Chemistry",
    "English Language",
    "Further Mathematics",
    "Mathematics",
    "Civic Education",
    "Physics",
    "Biology",
    "Agricultural Science",
    "Economics",
    "Marketing",
    "Government",
    "Commerce",
    "Financial Account"
  ]
};


/* ==========================================================
   INIT
========================================================== */

function initCA() {
  bindControls();
  bindModals();
  resetClassArmDropdown();
  resetSubjectDropdown();
  renderLegend();
  updateStats();
}


/* ==========================================================
   URL HELPERS
========================================================== */

function getCAUrls() {
  const page = document.querySelector(".ca-page");

  return {
    students: page?.dataset.studentsUrl || "/ca-test/api/students",
    save: page?.dataset.saveUrl || "/ca-test/api/save",
    records: page?.dataset.recordsUrl || "/ca-test/api/records",
    delete: page?.dataset.deleteUrl || "/ca-test/api/delete"
  };
}


/* ==========================================================
   CONTROLS
========================================================== */

function bindControls() {
  const loadBtn = document.getElementById("loadCAStudentsBtn");
  const levelSelect = document.getElementById("caClassLevel");
  const armSelect = document.getElementById("caClassArm");
  const subjectSelect = document.getElementById("caSubject");
  const sessionSelect = document.getElementById("caSession");
  const termSelect = document.getElementById("caTerm");
  const searchInput = document.getElementById("caSearchInput");

  if (loadBtn) loadBtn.addEventListener("click", loadStudents);
  if (levelSelect) levelSelect.addEventListener("change", detectStructure);
  if (armSelect) armSelect.addEventListener("change", updateTableSubtext);
  if (subjectSelect) subjectSelect.addEventListener("change", updateSubjectFocus);
  if (sessionSelect) sessionSelect.addEventListener("change", updateTableSubtext);
  if (termSelect) termSelect.addEventListener("change", updateTableSubtext);
  if (searchInput) searchInput.addEventListener("input", filterTable);

  bindClick("fillZerosBtn", fillZeros);
  bindClick("clearCAScoresBtn", clearScores);
  bindClick("exportCAVisibleBtn", exportVisibleRows);
  bindClick("downloadTemplateBtn", downloadTemplate);

  bindClick("openBulkModalBtn", () => openModal("caBulkModal"));
  bindClick("openStructureModalBtn", () => openModal("caStructureModal"));
  bindClick("openSaveConfirmBtn", openSaveSummary);
  bindClick("openImportModalBtn", () => openModal("caImportModal"));
  bindClick("openAuditModalBtn", () => openModal("caAuditModal"));

  bindClick("bulkFillZeroFromModal", () => {
    fillZeros();
    closeModal("caBulkModal");
  });

  bindClick("bulkClearVisibleModal", () => {
    clearVisibleScores();
    closeModal("caBulkModal");
  });

  bindClick("bulkMarkCompleteModal", () => {
    highlightCompleteRows();
    closeModal("caBulkModal");
  });

  bindClick("saveCAScoresBtn", saveCAScores);
  bindClick("loadSavedRecordsBtn", loadSavedRecords);
  bindClick("editSavedModeBtn", loadSavedRecords);
  bindClick("deleteSubjectRecordsBtn", deleteSubjectRecords);
  bindClick("deleteSelectedSavedRecordBtn", deleteSelectedSavedRecord);
  bindClick("reloadSelectedSavedRecordBtn", reloadSelectedSavedRecord);
  bindClick("processImportBtn", processImportPlaceholder);
  bindClick("previewReportMergeBtn", previewReportMerge);
  bindClick("autoPopulateTestBtn", autoPopulateTestData);
}


function bindClick(id, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener("click", handler);
}


/* ==========================================================
   STRUCTURE / DROPDOWNS
========================================================== */

function detectStructure() {
  const level = getValue("caClassLevel");

  resetClassArmDropdown();
  resetSubjectDropdown();
  students = [];
  savedRecordsCache = [];
  renderEmptyTable("Select a class arm and subject, then load students.");

  if (!level) {
    activeStructure = null;
    setText("caStructureLabel", "Select Class");
    setText("caStructureHint", "JSS: /60 CA + /40 Exam • SS: /30 CA + /70 Exam");
    toggleModeCards();
    renderLegend();
    updateSubjectFocus();
    updateStats();
    return;
  }

  activeStructure = level.startsWith("JSS") ? "JSS" : "SS";

  setText(
    "caStructureLabel",
    activeStructure === "JSS" ? "JSS FORMAT" : "SS FORMAT"
  );

  setText(
    "caStructureHint",
    activeStructure === "JSS"
      ? "CA1 /10 + CA2 /10 + Test1 /20 + Test2 /20 + Exam /40"
      : "1st Ass /5 + 2nd Ass /5 + Test /20 + Exam /70"
  );

  toggleModeCards();
  renderLegend();
  populateClassArms(level);
  populateSubjects(level);
  updateTableSubtext();
  updateSubjectFocus();
  updateStats();
}


function populateClassArms(level) {
  const armSelect = document.getElementById("caClassArm");
  if (!armSelect) return;

  const arms = CLASS_ARMS[level] || [];

  arms.forEach((arm) => {
    const option = document.createElement("option");
    option.value = arm;
    option.textContent = formatArmName(arm);
    armSelect.appendChild(option);
  });
}


function populateSubjects(level) {
  const subjectSelect = document.getElementById("caSubject");
  if (!subjectSelect) return;

  const subjects = SUBJECTS_BY_LEVEL[level] || [];

  subjects.forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject;
    option.textContent = subject;
    subjectSelect.appendChild(option);
  });
}


function resetClassArmDropdown() {
  const armSelect = document.getElementById("caClassArm");
  if (!armSelect) return;

  armSelect.innerHTML = `<option value="">Select arm</option>`;
}


function resetSubjectDropdown() {
  const subjectSelect = document.getElementById("caSubject");
  if (!subjectSelect) return;

  subjectSelect.innerHTML = `<option value="">Select subject</option>`;
}


function toggleModeCards() {
  const jss = document.getElementById("jssModeCard");
  const ss = document.getElementById("ssModeCard");

  if (jss) jss.classList.toggle("active", activeStructure === "JSS");
  if (ss) ss.classList.toggle("active", activeStructure === "SS");
}


function renderLegend() {
  const el = document.getElementById("caScoreLegend");
  if (!el) return;

  if (!activeStructure) {
    el.innerHTML = `<span>Waiting for class</span>`;
    return;
  }

  const structure = STRUCTURES[activeStructure];

  el.innerHTML = structure
    .map((c) => `<span>${c.label} /${c.max}</span>`)
    .join("");
}


/* ==========================================================
   LOAD STUDENTS
========================================================== */

async function loadStudents() {
  const level = getValue("caClassLevel");
  const arm = getValue("caClassArm");
  const subject = getValue("caSubject");

  if (!activeStructure || !level) {
    showMessage("Please select class level first.", "error");
    return;
  }

  if (!arm) {
    showMessage("Please select class arm.", "error");
    return;
  }

  if (!subject) {
    showMessage("Please select subject.", "error");
    return;
  }

  try {
    setButtonLoading("loadCAStudentsBtn", true, "Loading...");
    showMessage("Loading students from CSV database...", "success");

    const urls = getCAUrls();
    const params = new URLSearchParams({ class_arm: arm });

    const response = await fetch(`${urls.students}?${params.toString()}`);
    const data = await safeJson(response);

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "Unable to load students.");
    }

    students = (data.students || []).map((student, index) => ({
      id: index + 1,
      admission: student.admission_number,
      name: student.full_name,
      class: student.class_arm,
      level: student.class_category,
      subject,
      scores: {}
    }));

    renderTable();
    updateStats();
    updateTableSubtext();
    updateSubjectFocus();

    showMessage(`${students.length} student(s) loaded from ${formatArmName(arm)}.`, "success");
    addAuditItem("Students Loaded", `${students.length} student(s) loaded for ${formatArmName(arm)} • ${subject}`);

  } catch (error) {
    students = [];
    renderEmptyTable("Could not load students from CSV database.");
    updateStats();
    showMessage(error.message, "error");
  } finally {
    setButtonLoading("loadCAStudentsBtn", false);
  }
}


/* ==========================================================
   TABLE RENDERING
========================================================== */

function renderTable() {
  const head = document.getElementById("caTableHead");
  const body = document.getElementById("caTableBody");

  if (!head || !body) return;

  const structure = STRUCTURES[activeStructure];

  if (!structure || !students.length) {
    renderEmptyTable("No students available for this selection.");
    return;
  }

  head.innerHTML = `
    <tr>
      <th>#</th>
      <th>Admission No</th>
      <th>Student Name</th>
      <th>Class</th>
      ${structure.map((col) => `<th>${col.label} <small>/${col.max}</small></th>`).join("")}
      <th>Total</th>
      <th>Status</th>
      <th>Action</th>
    </tr>
  `;

  body.innerHTML = students.map((student, index) => {
    return `
      <tr data-id="${student.id}">
        <td>${index + 1}</td>
        <td>${escapeHtml(student.admission)}</td>
        <td>${escapeHtml(student.name)}</td>
        <td>${escapeHtml(formatArmName(student.class))}</td>

        ${structure.map((col) => `
          <td>
            <input
              class="ca-score-input"
              type="number"
              min="0"
              max="${col.max}"
              step="0.5"
              data-student-id="${student.id}"
              data-key="${col.key}"
              data-max="${col.max}"
              value="${student.scores[col.key] ?? ""}"
              placeholder="0"
            >
          </td>
        `).join("")}

        <td><span class="ca-total-pill">0</span></td>
        <td><span class="ca-status-pill incomplete">Incomplete</span></td>
        <td>
          <button type="button" class="ca-row-action" data-edit-student="${student.id}" title="Quick edit">
            <i class="fa-solid fa-pen"></i>
          </button>
        </td>
      </tr>
    `;
  }).join("");

  bindTableInputs();
  refreshAllRows();
}


/* ==========================================================
   INPUT EVENTS
========================================================== */

function bindTableInputs() {
  document.querySelectorAll(".ca-score-input").forEach((input) => {
    input.addEventListener("input", handleScoreInput);
    input.addEventListener("blur", sanitizeInput);
  });

  document.querySelectorAll("[data-edit-student]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openStudentModal(Number(btn.dataset.editStudent));
    });
  });
}


function handleScoreInput(event) {
  const input = event.target;
  syncStudentScoreFromInput(input);
  updateRow(input.closest("tr"));
  updateStats();
}


function sanitizeInput(event) {
  const input = event.target;

  if (input.value === "") return;

  let value = Number(input.value);
  const max = Number(input.dataset.max);

  if (Number.isNaN(value) || value < 0) value = 0;

  if (value > max) {
    value = max;
    input.classList.add("invalid");
    showMessage(`${input.dataset.key.toUpperCase()} cannot exceed ${max}. It has been corrected.`, "error");
  }

  input.value = trimScore(value);
  syncStudentScoreFromInput(input);
  updateRow(input.closest("tr"));
  updateStats();
}


function syncStudentScoreFromInput(input) {
  const studentId = Number(input.dataset.studentId);
  const key = input.dataset.key;
  const student = students.find((item) => item.id === studentId);

  if (!student) return;

  student.scores[key] = input.value;
}


/* ==========================================================
   ROW / STATS UPDATE
========================================================== */

function refreshAllRows() {
  document.querySelectorAll("#caTableBody tr[data-id]").forEach(updateRow);
  updateStats();
}


function updateRow(row) {
  if (!row || !row.matches("tr[data-id]")) return;

  const inputs = row.querySelectorAll(".ca-score-input");

  let total = 0;
  let valid = true;
  let filled = true;

  inputs.forEach((input) => {
    const max = Number(input.dataset.max);
    const value = input.value === "" ? null : Number(input.value);

    input.classList.remove("invalid");

    if (input.value === "") filled = false;

    if (value !== null) {
      if (Number.isNaN(value) || value < 0 || value > max) {
        valid = false;
        input.classList.add("invalid");
      } else {
        total += value;
      }
    }
  });

  const totalEl = row.querySelector(".ca-total-pill");
  const statusEl = row.querySelector(".ca-status-pill");

  if (totalEl) totalEl.textContent = trimScore(total);

  if (!statusEl) return;

  if (!valid) {
    statusEl.textContent = "Invalid";
    statusEl.className = "ca-status-pill invalid";
  } else if (filled) {
    statusEl.textContent = "Complete";
    statusEl.className = "ca-status-pill complete";
  } else {
    statusEl.textContent = "Incomplete";
    statusEl.className = "ca-status-pill incomplete";
  }
}


function updateStats() {
  setText("loadedStudentsCount", students.length);

  const rows = [...document.querySelectorAll("#caTableBody tr[data-id]")];
  const totalEls = [...document.querySelectorAll(".ca-total-pill")];

  const totals = totalEls.map((el) => Number(el.textContent) || 0);
  const average = totals.length
    ? (totals.reduce((sum, value) => sum + value, 0) / totals.length).toFixed(1)
    : "--";

  const completeRows = rows.filter((row) =>
    row.querySelector(".ca-status-pill.complete")
  ).length;

  setText("classAverageScore", average);
  setText(
    "reportReadyStatus",
    rows.length && completeRows === rows.length ? "Ready" : rows.length ? "In Progress" : "Waiting"
  );
}


/* ==========================================================
   SEARCH
========================================================== */

function filterTable() {
  const query = getValue("caSearchInput").toLowerCase();

  document.querySelectorAll("#caTableBody tr[data-id]").forEach((row) => {
    row.style.display = row.innerText.toLowerCase().includes(query) ? "" : "none";
  });
}


/* ==========================================================
   BULK ACTIONS
========================================================== */

function fillZeros() {
  if (!students.length) {
    showMessage("Load students before using bulk tools.", "error");
    return;
  }

  document.querySelectorAll(".ca-score-input").forEach((input) => {
    if (input.value === "") {
      input.value = "0";
      syncStudentScoreFromInput(input);
    }
  });

  refreshAllRows();
  showMessage("Empty score fields filled with 0.", "success");
  addAuditItem("Bulk Fill", "Empty score fields filled with 0.");
}


function clearScores() {
  if (!students.length) {
    showMessage("No scores to clear.", "error");
    return;
  }

  if (!confirm("Clear all scores currently on this table?")) return;

  document.querySelectorAll(".ca-score-input").forEach((input) => {
    input.value = "";
    syncStudentScoreFromInput(input);
  });

  refreshAllRows();
  showMessage("All table scores cleared.", "error");
  addAuditItem("Scores Cleared", "All visible table scores were cleared.");
}


function clearVisibleScores() {
  if (!students.length) {
    showMessage("No visible scores to clear.", "error");
    return;
  }

  document.querySelectorAll("#caTableBody tr[data-id]").forEach((row) => {
    if (row.style.display === "none") return;

    row.querySelectorAll(".ca-score-input").forEach((input) => {
      input.value = "";
      syncStudentScoreFromInput(input);
    });

    updateRow(row);
  });

  updateStats();
  showMessage("Visible scores cleared.", "error");
  addAuditItem("Visible Scores Cleared", "Only visible filtered rows were cleared.");
}


function highlightCompleteRows() {
  document.querySelectorAll("#caTableBody tr[data-id]").forEach((row) => {
    const isComplete = !!row.querySelector(".ca-status-pill.complete");
    row.style.outline = isComplete ? "2px solid rgba(22, 163, 74, 0.35)" : "";
    row.style.borderRadius = isComplete ? "18px" : "";
  });

  showMessage("Complete rows highlighted.", "success");
}


/* ==========================================================
   SAVE / LOAD / DELETE RECORDS
========================================================== */

function openSaveSummary() {
  if (!students.length) {
    showMessage("Load students before saving.", "error");
    return;
  }

  const invalidRows = document.querySelectorAll(".ca-status-pill.invalid").length;

  if (invalidRows) {
    showMessage("Fix invalid scores before saving.", "error");
    return;
  }

  setText("saveSummaryClass", `${getValue("caClassLevel")} • ${formatArmName(getValue("caClassArm"))}`);
  setText("saveSummarySubject", getValue("caSubject") || "--");
  setText("saveSummaryStudents", students.length);

  openModal("caSaveConfirmModal");
}


function buildCASavePayload() {
  return {
    session: getValue("caSession"),
    term: getValue("caTerm"),
    class_arm: getValue("caClassArm"),
    subject: getValue("caSubject"),
    students: students.map((student) => ({
      admission_number: student.admission,
      student_name: student.name,
      full_name: student.name,
      class_arm: student.class,
      class_category: student.level,
      subject: student.subject,
      scores: normalizeStudentScoresForSave(student.scores)
    }))
  };
}


function normalizeStudentScoresForSave(scores) {
  const clean = {};

  const structure = STRUCTURES[activeStructure] || [];

  structure.forEach((col) => {
    clean[col.key] = scoreValue(scores[col.key]);
  });

  return clean;
}


async function saveCAScores() {
  if (!students.length) {
    showMessage("Load students before saving.", "error");
    return;
  }

  try {
    setButtonLoading("saveCAScoresBtn", true, "Saving...");

    const urls = getCAUrls();
    const payload = buildCASavePayload();

    const response = await fetch(urls.save, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await safeJson(response);

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "Unable to save CA/Test scores.");
    }

    closeModal("caSaveConfirmModal");
    setText("savedRecordsCount", data.saved_count || students.length);

    showMessage(data.message || "CA/Test scores saved successfully.", "success");
    addAuditItem("Scores Saved", `${payload.class_arm} • ${payload.subject} • ${data.saved_count || students.length} student(s)`);

  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    setButtonLoading("saveCAScoresBtn", false);
  }
}


async function loadSavedRecords() {
  const body = document.getElementById("savedRecordsTableBody");

  openModal("caSavedRecordsModal");

  if (body) {
    body.innerHTML = `
      <tr>
        <td colspan="7">Loading saved records...</td>
      </tr>
    `;
  }

  renderSavedRecordPreview(null);

  try {
    const urls = getCAUrls();

    const params = new URLSearchParams();

    if (getValue("caSession")) params.append("session", getValue("caSession"));
    if (getValue("caTerm")) params.append("term", getValue("caTerm"));

    /*
      IMPORTANT:
      We intentionally do NOT force class_arm and subject here.
      This allows the modal to show all saved records for the selected
      session/term, even when class/subject dropdowns are empty.
    */

    const response = await fetch(`${urls.records}?${params.toString()}`);
    const data = await safeJson(response);

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "Unable to load saved records.");
    }

    savedRecordsCache = data.records || [];
    renderSavedRecords(savedRecordsCache);

    setText("savedRecordsCount", data.count || 0);
    showMessage("Saved records loaded.", "success");
    addAuditItem("Saved Records Viewed", `${savedRecordsCache.length} saved group(s) found.`);

  } catch (error) {
    savedRecordsCache = [];

    if (body) {
      body.innerHTML = `
        <tr>
          <td colspan="7">
            Could not load saved records: ${escapeHtml(error.message)}
          </td>
        </tr>
      `;
    }

    renderSavedRecordPreview(null);
    showMessage(error.message, "error");
  }
}

function renderSavedRecords(records) {
  const body = document.getElementById("savedRecordsTableBody");
  if (!body) return;

  if (!records.length) {
    body.innerHTML = `
      <tr>
        <td colspan="7">No saved record found for this selection.</td>
      </tr>
    `;
    renderSavedRecordPreview(null);
    return;
  }

  body.innerHTML = records.map((record, index) => `
    <tr class="saved-record-row" data-saved-index="${index}">
      <td>
        <input type="radio" name="selectedSavedRecord" value="${index}">
      </td>
      <td>${escapeHtml(record.session || "")}</td>
      <td>${escapeHtml(record.term || "")}</td>
      <td>${escapeHtml(formatArmName(record.class_arm || ""))}</td>
      <td>${escapeHtml(record.subject || "")}</td>
      <td>${escapeHtml(record.students_count || 0)}</td>
      <td>${escapeHtml(record.saved_at || "--")}</td>
    </tr>
  `).join("");

  document.querySelectorAll(".saved-record-row").forEach((row) => {
    row.addEventListener("click", () => {
      const index = Number(row.dataset.savedIndex);
      const radio = row.querySelector('input[type="radio"]');

      if (radio) radio.checked = true;

      document.querySelectorAll(".saved-record-row").forEach((item) => {
        item.classList.remove("active");
      });

      row.classList.add("active");
      renderSavedRecordPreview(savedRecordsCache[index]);
    });
  });

  const firstRadio = body.querySelector('input[type="radio"]');
  const firstRow = body.querySelector(".saved-record-row");

  if (firstRadio && firstRow) {
    firstRadio.checked = true;
    firstRow.classList.add("active");
    renderSavedRecordPreview(records[0]);
  }
}




function renderSavedRecordPreview(record) {
  const panel = document.getElementById("savedRecordPreviewPanel");
  if (!panel) return;

  if (!record) {
    panel.innerHTML = `
      <div class="saved-preview-empty">
        <i class="fa-solid fa-table-list"></i>
        <strong>No saved record selected</strong>
        <span>Select a saved record above to view full student score details here.</span>
      </div>
    `;
    return;
  }

  const rows = record.records || [];
  const level = getLevelFromClassArm(record.class_arm);
  const mode = level.startsWith("JSS") ? "JSS" : "SS";

  const scoreColumns = mode === "JSS"
    ? [
        { label: "CA1", key: "CA1" },
        { label: "CA2", key: "CA2" },
        { label: "TEST1", key: "TEST1" },
        { label: "TEST2", key: "TEST2" },
      ]
    : [
        { label: "ASS1", key: "ASS1" },
        { label: "ASS2", key: "ASS2" },
        { label: "TEST", key: "TEST" },
      ];

  const totals = rows.map((row) => Number(row.TOTAL) || 0);
  const average = totals.length
    ? (totals.reduce((sum, value) => sum + value, 0) / totals.length).toFixed(1)
    : "0";

  panel.innerHTML = `
    <div class="saved-preview-head">
      <div>
        <span>Selected Saved Record</span>
        <strong>${escapeHtml(record.subject || "")}</strong>
        <small>${escapeHtml(record.session || "")} • ${escapeHtml(record.term || "")} • ${escapeHtml(formatArmName(record.class_arm || ""))}</small>
      </div>

      <div class="saved-preview-metrics">
        <article>
          <span>Students</span>
          <strong>${rows.length}</strong>
        </article>
        <article>
          <span>Average</span>
          <strong>${average}</strong>
        </article>
        <article>
          <span>Mode</span>
          <strong>${mode}</strong>
        </article>
      </div>
    </div>

    <div class="saved-preview-table-wrap">
      <table class="saved-preview-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Admission No</th>
            <th>Student Name</th>
            ${scoreColumns.map((col) => `<th>${col.label}</th>`).join("")}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(row.Admission_number || "")}</td>
              <td>${escapeHtml(row.Student_name || "")}</td>
              ${scoreColumns.map((col) => `<td>${escapeHtml(row[col.key] || "0")}</td>`).join("")}
              <td><span class="saved-total-pill">${escapeHtml(row.TOTAL || "0")}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}



function getSelectedSavedRecord() {
  const selected = document.querySelector('input[name="selectedSavedRecord"]:checked');

  if (!selected) {
    showMessage("Please select a saved record first.", "error");
    return null;
  }

  const index = Number(selected.value);
  return savedRecordsCache[index] || null;
}


function reloadSelectedSavedRecord() {
  const record = getSelectedSavedRecord();
  if (!record) return;

  const savedRows = record.records || [];

  if (!savedRows.length) {
    showMessage("Selected record has no student rows.", "error");
    return;
  }

  const level = getLevelFromClassArm(record.class_arm);
  activeStructure = level.startsWith("JSS") ? "JSS" : "SS";

  setSelectValue("caSession", record.session);
  setSelectValue("caTerm", record.term);
  setSelectValue("caClassLevel", level);

  resetClassArmDropdown();
  resetSubjectDropdown();
  populateClassArms(level);
  populateSubjects(level);

  setSelectValue("caClassArm", record.class_arm);
  setSelectValue("caSubject", record.subject);

  students = savedRows.map((row, index) => {
    return {
      id: index + 1,
      admission: row.Admission_number || row.admission_number || "",
      name: row.Student_name || row.student_name || "",
      class: row.Class_arm || row.class_arm || record.class_arm,
      level: row.Class_category || row.class_category || level,
      subject: row.Subject || row.subject || record.subject,
      scores: buildScoresFromSavedRow(row)
    };
  });

  closeModal("caSavedRecordsModal");

  toggleModeCards();
  renderLegend();
  renderTable();
  updateStats();
  updateTableSubtext();
  updateSubjectFocus();

  showMessage("Saved record reloaded for editing.", "success");
  addAuditItem("Record Reloaded", `${record.class_arm} • ${record.subject}`);
}


function buildScoresFromSavedRow(row) {
  if (activeStructure === "JSS") {
    return {
      ca1: normalizeLoadedScore(row.CA1),
      ca2: normalizeLoadedScore(row.CA2),
      test1: normalizeLoadedScore(row.TEST1),
      test2: normalizeLoadedScore(row.TEST2)
    };
  }

  return {
    ass1: normalizeLoadedScore(row.ASS1),
    ass2: normalizeLoadedScore(row.ASS2),
    test: normalizeLoadedScore(row.TEST)
  };
}


async function deleteSubjectRecords() {
  const payload = {
    session: getValue("caSession"),
    term: getValue("caTerm"),
    class_arm: getValue("caClassArm"),
    subject: getValue("caSubject")
  };

  if (!payload.session || !payload.term || !payload.class_arm || !payload.subject) {
    showMessage("Select session, term, class arm and subject before deleting.", "error");
    return;
  }

  if (!confirm("Delete all saved CA/Test records for this selected subject?")) return;

  await deleteRecordsRequest(payload);
}


async function deleteSelectedSavedRecord() {
  const record = getSelectedSavedRecord();
  if (!record) return;

  if (!confirm("Delete the selected saved record?")) return;

  await deleteRecordsRequest({
    session: record.session,
    term: record.term,
    class_arm: record.class_arm,
    subject: record.subject
  });

  closeModal("caSavedRecordsModal");
  await loadSavedRecords();
}


async function deleteRecordsRequest(payload) {
  try {
    const urls = getCAUrls();

    const response = await fetch(urls.delete, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await safeJson(response);

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "Unable to delete records.");
    }

    setText("savedRecordsCount", "0");
    showMessage(data.message || "Records deleted successfully.", "success");
    addAuditItem("Record Deleted", `${payload.class_arm} • ${payload.subject}`);

  } catch (error) {
    showMessage(error.message, "error");
  }
}


/* ==========================================================
   EXPORT / TEMPLATE / IMPORT
========================================================== */

function exportVisibleRows() {
  if (!students.length) {
    showMessage("Load students before exporting.", "error");
    return;
  }

  const structure = STRUCTURES[activeStructure] || [];
  const rows = [];

  rows.push([
    "Session",
    "Term",
    "Class",
    "Subject",
    "Admission Number",
    "Student Name",
    ...structure.map((col) => col.label),
    "Total",
    "Status"
  ]);

  document.querySelectorAll("#caTableBody tr[data-id]").forEach((row) => {
    if (row.style.display === "none") return;

    const studentId = Number(row.dataset.id);
    const student = students.find((item) => item.id === studentId);
    if (!student) return;

    rows.push([
      getValue("caSession"),
      getValue("caTerm"),
      student.class,
      student.subject,
      student.admission,
      student.name,
      ...structure.map((col) => scoreValue(student.scores[col.key])),
      row.querySelector(".ca-total-pill")?.textContent || "0",
      row.querySelector(".ca-status-pill")?.textContent || "Incomplete"
    ]);
  });

  downloadCsv(rows, buildFileName("visible-ca-export"));
  showMessage("Visible rows exported successfully.", "success");
}


function downloadTemplate() {
  const level = getValue("caClassLevel");
  const arm = getValue("caClassArm");
  const subject = getValue("caSubject");

  if (!activeStructure || !level || !arm || !subject) {
    showMessage("Select class level, arm and subject before downloading template.", "error");
    return;
  }

  const structure = STRUCTURES[activeStructure] || [];

  const rows = [
    [
      "Admission Number",
      "Student Name",
      "Class",
      "Subject",
      ...structure.map((col) => col.label)
    ]
  ];

  if (students.length) {
    students.forEach((student) => {
      rows.push([
        student.admission,
        student.name,
        student.class,
        student.subject,
        ...structure.map(() => "")
      ]);
    });
  }

  downloadCsv(rows, buildFileName("ca-template"));
  showMessage("CA/Test template downloaded.", "success");
}


function processImportPlaceholder() {
  showMessage("CSV import UI is ready. Backend parser can be connected next.", "success");
}


function previewReportMerge() {
  if (!students.length) {
    showMessage("Load students and scores before previewing report merge.", "error");
    return;
  }

  const completeRows = document.querySelectorAll(".ca-status-pill.complete").length;

  showMessage(
    `Merge preview: ${completeRows}/${students.length} student(s) have complete CA/Test scores.`,
    completeRows === students.length ? "success" : "error"
  );
}


/* ==========================================================
   MODALS
========================================================== */

function bindModals() {
  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.closeModal));
  });

  document.querySelectorAll(".ca-modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal(modal.id);
    });
  });

  bindClick("applyStudentScoresBtn", applyModalScores);
}


function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}


function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}


/* ==========================================================
   STUDENT MODAL
========================================================== */

function openStudentModal(id) {
  currentStudentId = id;

  const student = students.find((item) => item.id === id);
  const grid = document.getElementById("modalScoreGrid");
  const structure = STRUCTURES[activeStructure];

  if (!student || !grid || !structure) return;

  grid.innerHTML = structure.map((col) => `
    <div class="modal-score-field">
      <label>${col.label} /${col.max}</label>
      <input
        type="number"
        min="0"
        max="${col.max}"
        step="0.5"
        data-key="${col.key}"
        data-max="${col.max}"
        value="${student.scores[col.key] ?? ""}"
        placeholder="0"
      >
    </div>
  `).join("");

  setText("modalStudentName", student.name);
  setText("modalStudentMeta", `${student.admission} • ${formatArmName(student.class)} • ${student.subject}`);
  updateModalTotal();

  grid.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", updateModalTotal);
  });

  openModal("caStudentModal");
}


function updateModalTotal() {
  const inputs = document.querySelectorAll("#modalScoreGrid input");
  let total = 0;

  inputs.forEach((input) => {
    const value = Number(input.value);
    if (!Number.isNaN(value)) total += value;
  });

  setText("modalStudentTotal", trimScore(total));
}


function applyModalScores() {
  const student = students.find((item) => item.id === currentStudentId);
  if (!student) return;

  let valid = true;

  document.querySelectorAll("#modalScoreGrid input").forEach((input) => {
    const value = input.value === "" ? "" : Number(input.value);
    const max = Number(input.dataset.max);

    input.classList.remove("invalid");

    if (value !== "" && (Number.isNaN(value) || value < 0 || value > max)) {
      input.classList.add("invalid");
      valid = false;
      return;
    }

    student.scores[input.dataset.key] = value === "" ? "" : trimScore(value);
  });

  if (!valid) {
    showMessage("One or more modal scores exceed the allowed marks.", "error");
    return;
  }

  renderTable();
  closeModal("caStudentModal");
  showMessage("Student scores applied.", "success");
}


/* ==========================================================
   EMPTY STATE / SUBJECT FOCUS / MESSAGES
========================================================== */

function renderEmptyTable(message) {
  const head = document.getElementById("caTableHead");
  const body = document.getElementById("caTableBody");

  if (head) {
    head.innerHTML = `
      <tr>
        <th>#</th>
        <th>Admission No</th>
        <th>Student Name</th>
        <th>Class</th>
        <th>Score Columns</th>
        <th>Total</th>
        <th>Status</th>
        <th>Action</th>
      </tr>
    `;
  }

  if (body) {
    body.innerHTML = `
      <tr>
        <td colspan="8" class="ca-empty">
          <i class="fa-solid fa-clipboard-list"></i>
          <strong>No class loaded yet</strong>
          <span>${message}</span>
        </td>
      </tr>
    `;
  }
}


function updateTableSubtext() {
  const level = getValue("caClassLevel");
  const arm = getValue("caClassArm");
  const subject = getValue("caSubject");

  const text = level
    ? `${level}${arm ? " • " + formatArmName(arm) : ""}${subject ? " • " + subject : ""}`
    : "Load a class to begin score entry.";

  setText("caTableSubtext", text);
}


function updateSubjectFocus() {
  const level = getValue("caClassLevel");
  const arm = getValue("caClassArm");
  const subject = getValue("caSubject");

  setText("subjectFocusTitle", subject || "No subject selected");
  setText("subjectFocusClass", arm ? formatArmName(arm) : "Select class");

  if (!level) {
    setText("subjectFocusStructure", "Assessment mode waiting");
    return;
  }

  const mode = level.startsWith("JSS") ? "JSS" : "SS";
  setText("subjectFocusStructure", mode === "JSS" ? "JSS CA/Test Mode" : "SS CA/Test Mode");
}


function showMessage(message, type = "success") {
  const box = document.getElementById("caSaveMessage");
  if (!box) return;

  box.className = `ca-save-message ${type}`;
  box.innerHTML = `<i class="fa-solid ${type === "error" ? "fa-triangle-exclamation" : "fa-circle-check"}"></i> ${escapeHtml(message)}`;
}


function addAuditItem(title, text) {
  const list = document.getElementById("caAuditList");
  if (!list) return;

  const empty = list.querySelector("article");
  if (empty && empty.innerText.includes("No activity yet")) {
    list.innerHTML = "";
  }

  const item = document.createElement("article");
  item.innerHTML = `
    <i class="fa-solid fa-clock"></i>
    <div>
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(text)} • ${new Date().toLocaleString()}</span>
    </div>
  `;

  list.prepend(item);
}


/* ==========================================================
   CSV HELPERS
========================================================== */

function downloadCsv(rows, filename) {
  const csv = rows
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}


function csvEscape(value) {
  const text = String(value ?? "");
  const escaped = text.replaceAll('"', '""');
  return `"${escaped}"`;
}


function buildFileName(prefix) {
  const session = getValue("caSession").replaceAll("/", "-") || "session";
  const term = getValue("caTerm").replaceAll(" ", "-") || "term";
  const arm = getValue("caClassArm") || "class";
  const subject = (getValue("caSubject") || "subject").replaceAll(" ", "-");

  return `${prefix}_${session}_${term}_${arm}_${subject}.csv`;
}




/* ==========================================================
  auto-populate test data (for development/testing purposes only)
========================================================== */


function autoPopulateTestData() {
  if (!students.length) {
    showMessage("Load students first before auto-populating test data.", "error");
    return;
  }

  const structure = STRUCTURES[activeStructure] || [];

  if (!structure.length) {
    showMessage("Select a valid class structure first.", "error");
    return;
  }

  students.forEach((student, index) => {
    structure.forEach((col, colIndex) => {
      let minScore = Math.ceil(col.max * 0.55);
      let maxScore = col.max;

      let generatedScore = minScore + ((index + colIndex * 3) % (maxScore - minScore + 1));

      student.scores[col.key] = String(generatedScore);
    });
  });

  renderTable();
  refreshAllRows();
  updateStats();

  showMessage("Test scores auto-populated successfully. Remember to remove before deployment.", "success");
  addAuditItem("Test Data Generated", `${students.length} student score records auto-populated for testing.`);
}


/* ==========================================================
   UTILITIES
========================================================== */

function getValue(id) {
  const el = document.getElementById(id);
  return el ? String(el.value || "").trim() : "";
}


function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}


function setSelectValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;

  const stringValue = String(value || "");

  const exists = [...el.options].some((option) => option.value === stringValue);

  if (!exists && stringValue) {
    const option = document.createElement("option");
    option.value = stringValue;
    option.textContent = stringValue;
    el.appendChild(option);
  }

  el.value = stringValue;
}


function trimScore(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "";
  return Number.isInteger(num) ? String(num) : String(Number(num.toFixed(1)));
}


function scoreValue(value) {
  if (value === "" || value === null || value === undefined) return "";
  const num = Number(value);
  if (Number.isNaN(num)) return "";
  return trimScore(num);
}


function normalizeLoadedScore(value) {
  if (value === null || value === undefined || value === "") return "";
  return trimScore(value);
}


function formatArmName(value) {
  return String(value || "").replaceAll("_", " ");
}


function getLevelFromClassArm(classArm) {
  const arm = String(classArm || "").toUpperCase();

  if (arm.startsWith("JSS1")) return "JSS1";
  if (arm.startsWith("JSS2")) return "JSS2";
  if (arm.startsWith("JSS3")) return "JSS3";
  if (arm.startsWith("SS1")) return "SS1";
  if (arm.startsWith("SS2")) return "SS2";
  if (arm.startsWith("SS3")) return "SS3";

  return "";
}


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


async function safeJson(response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      message: text || "Server returned an invalid response."
    };
  }
}

function setButtonLoading(id, isLoading, loadingText = "Working...") {
  const btn = document.getElementById(id);
  if (!btn) return;

  if (isLoading) {
    btn.dataset.originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${loadingText}`;
    return;
  }

  btn.disabled = false;

  if (btn.dataset.originalHtml) {
    btn.innerHTML = btn.dataset.originalHtml;
    delete btn.dataset.originalHtml;
  }
}