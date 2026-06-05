/* ============================================================
   REPORT SHEET GENERATOR — MAIN APP
   Handles: filters, students table, search, pagination,
   selection, generation, saved reports, delete reports,
   editable remarks, affective traits, psychomotor ratings.
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  ReportSheetApp.init();
});

const ReportSheetApp = {
  page: null,
  urls: {},
  students: [],
  reports: [],
  filteredReports: [],
  savedReports: [],
  reportEdits: {},

  selectedIndex: 0,
  selectedAdmission: "",
  selectedStudents: new Set(),

  studentQuery: "",
  studentPage: 1,
  studentPageSize: 10,
  studentTableFilter: "all",

  activeFilter: "all",

  init() {
    this.page = document.querySelector(".report-page");
    if (!this.page) return;

    this.urls = this.buildUrls();
    this.cacheEls();
    this.bindEvents();
    this.populateArms();
    this.updateModeCards();
    this.loadStoredEdits();
    this.loadDefaultNextTerm();
    this.clearPreview();
    this.renderStudentsTable();
    this.loadDefaultNextTerm();
  },

  buildUrls() {
    const preview = this.page.dataset.previewUrl || "/reports/api/preview";
    const generate = this.page.dataset.generateUrl || "/reports/api/generate";
    const students = this.page.dataset.studentsUrl || "/reports/api/students";
    

    return {
      config: this.page.dataset.configUrl || "/reports/api/config",
      preview,
      generate,
      students,
      sourceStatus: preview.replace("/preview", "/source-status"),
      generateStudent: generate.replace("/generate", "/generate-student"),
      nextTermSettings: this.page.dataset.nextTermSettingsUrl || preview.replace("/preview", "/settings/next-term"),
      saved: this.page.dataset.savedUrl || generate.replace("/generate", "/saved"),
      deleteSaved: this.page.dataset.deleteSavedUrl || generate.replace("/generate", "/delete-saved"),
      exportCsv: this.page.dataset.exportCsvUrl || generate.replace("/generate", "/export/csv"),
      exportExcel: this.page.dataset.exportExcelUrl || generate.replace("/generate", "/export/excel")
    };
  },

  cacheEls() {
    this.els = {
      session: document.getElementById("reportSession"),
      term: document.getElementById("reportTerm"),
      level: document.getElementById("reportClassLevel"),
      arm: document.getElementById("reportClassArm"),
      formTeacher: document.getElementById("reportFormTeacher"),
      nextTerm: document.getElementById("reportNextTerm"),
      saveNextTermBtn: document.getElementById("saveNextTermBtn"),

      loadStudentsBtn: document.getElementById("loadReportStudentsBtn"),
      refreshStudentsBtn: document.getElementById("refreshReportStudentsBtn"),
      previewBtn: document.getElementById("previewReportsBtn"),
      generateSelectedBtn: document.getElementById("generateSelectedReportBtn"),
      generateBtn: document.getElementById("generateReportsBtn"),

      printSelectedBtn: document.getElementById("printSelectedReportBtn"),
      printAllBtn: document.getElementById("printAllReportsBtn"),
      viewPdfBtn: document.getElementById("viewPdfReportBtn"),
      printPdfPreviewBtn: document.getElementById("printPdfPreviewBtn"),
      exportCsvBtn: document.getElementById("exportReportsCsvBtn"),
      exportExcelBtn: document.getElementById("exportReportsExcelBtn"),
      markUsedBtn: document.getElementById("markResultsUsedBtn"),
      clearBtn: document.getElementById("clearReportPreviewBtn"),

      openRemarksTraitsBtn: document.getElementById("openRemarksTraitsBtn"),
      editCurrentReportRemarksBtn: document.getElementById("editCurrentReportRemarksBtn"),
      inspectCurrentReportBtn: document.getElementById("inspectCurrentReportBtn"),

      remarksStudentSelect: document.getElementById("remarksStudentSelect"),
      remarksStudentSummary: document.getElementById("remarksStudentSummary"),
      remarksFormTeacherInput: document.getElementById("remarksFormTeacherInput"),
      teacherRemarkInput: document.getElementById("teacherRemarkInput"),
      principalRemarkInput: document.getElementById("principalRemarkInput"),
      remarksNextTermInput: document.getElementById("remarksNextTermInput"),
      useAutoTeacherRemarkBtn: document.getElementById("useAutoTeacherRemarkBtn"),
      useAutoPrincipalRemarkBtn: document.getElementById("useAutoPrincipalRemarkBtn"),
      resetTraitsBtn: document.getElementById("resetTraitsBtn"),
      applyRemarksTraitsBtn: document.getElementById("applyRemarksTraitsBtn"),

      traitPunctuality: document.getElementById("traitPunctuality"),
      traitAttendance: document.getElementById("traitAttendance"),
      traitReliability: document.getElementById("traitReliability"),
      traitNeatness: document.getElementById("traitNeatness"),
      traitPoliteness: document.getElementById("traitPoliteness"),
      traitHonesty: document.getElementById("traitHonesty"),
      traitRelationship: document.getElementById("traitRelationship"),
      traitSelfControl: document.getElementById("traitSelfControl"),
      traitAttentiveness: document.getElementById("traitAttentiveness"),
      traitPerseverance: document.getElementById("traitPerseverance"),

      psyHandwriting: document.getElementById("psyHandwriting"),
      psyGames: document.getElementById("psyGames"),
      psySport: document.getElementById("psySport"),
      psyDrawing: document.getElementById("psyDrawing"),
      psyCrafts: document.getElementById("psyCrafts"),
      psyMusic: document.getElementById("psyMusic"),

      loadedStudentsSearch: document.getElementById("loadedStudentsSearchInput"),
      selectAllLoadedBtn: document.getElementById("selectAllLoadedStudentsBtn"),
      clearSelectedLoadedBtn: document.getElementById("clearSelectedLoadedStudentsBtn"),
      selectAllCheckbox: document.getElementById("reportSelectAllCheckbox"),
      studentsPageInfo: document.getElementById("loadedStudentsPageInfo"),
      prevStudentsPageBtn: document.getElementById("prevLoadedStudentsPageBtn"),
      nextStudentsPageBtn: document.getElementById("nextLoadedStudentsPageBtn"),
      studentsPageSize: document.getElementById("loadedStudentsPageSize"),

      loadedTotalCount: document.getElementById("loadedStudentsTotalCount"),
      loadedSelectedCount: document.getElementById("loadedStudentsSelectedCount"),
      loadedCaReadyCount: document.getElementById("loadedStudentsCaReadyCount"),
      loadedExamReadyCount: document.getElementById("loadedStudentsExamReadyCount"),
      loadedAttendanceCount: document.getElementById("loadedStudentsAttendanceCount"),

      search: document.getElementById("reportSearchInput"),
      missingExamBtn: document.getElementById("showMissingExamBtn"),
      missingAttendanceBtn: document.getElementById("showMissingAttendanceBtn"),
      missingCaBtn: document.getElementById("showMissingCaBtn"),
      readyOnlyBtn: document.getElementById("showReadyOnlyBtn"),

      statusLabel: document.getElementById("reportStatusLabel"),
      statusHint: document.getElementById("reportStatusHint"),
      previewStatus: document.getElementById("reportPreviewStatus"),
      previewSubtext: document.getElementById("reportPreviewSubtext"),

      studentsCount: document.getElementById("reportStudentsCount"),
      readyCount: document.getElementById("reportReadyCount"),
      subjectsCount: document.getElementById("reportSubjectsCount"),
      classAverage: document.getElementById("reportClassAverage"),

      studentsTableBody: document.getElementById("reportStudentsTableBody"),
      studentList: document.getElementById("reportStudentList"),
      canvas: document.getElementById("reportSheetCanvas"),
      pdfCanvas: document.getElementById("pdfPreviewCanvas"),
      savedReportsTableBody: document.getElementById("savedReportsTableBody"),

      studentSourceStatus: document.getElementById("studentSourceStatus"),
      caSourceStatus: document.getElementById("caSourceStatus"),
      examSourceStatus: document.getElementById("examSourceStatus"),
      attendanceSourceStatus: document.getElementById("attendanceSourceStatus"),
      remarksSourceStatus: document.getElementById("remarksSourceStatus"),

      jssModeCard: document.getElementById("reportJssModeCard"),
      ssModeCard: document.getElementById("reportSsModeCard"),

      rulesBtn: document.getElementById("openReportRulesBtn"),
      savedReportsBtn: document.getElementById("openSavedReportsBtn"),

      studentModalTitle: document.getElementById("studentReportModalTitle"),
      studentModalSubtext: document.getElementById("studentReportModalSubtext"),
      studentModalBody: document.getElementById("studentReportModalBody")
    };
  },

  bindEvents() {
    this.els.level?.addEventListener("change", () => {
      this.populateArms();
      this.updateModeCards();
      this.resetLoadedData();
    });

    this.els.saveNextTermBtn?.addEventListener("click", () => this.saveDefaultNextTerm());
    this.els.arm?.addEventListener("change", () => this.resetLoadedData());
    this.els.session?.addEventListener("change", () => this.resetLoadedData());
    this.els.term?.addEventListener("change", () => this.resetLoadedData());

    this.els.loadStudentsBtn?.addEventListener("click", () => this.loadStudents());
    this.els.refreshStudentsBtn?.addEventListener("click", () => this.loadStudents());

    this.els.previewBtn?.addEventListener("click", () => this.loadReports("preview"));
    this.els.generateBtn?.addEventListener("click", () => this.loadReports("generate"));
    this.els.generateSelectedBtn?.addEventListener("click", () => this.generateSelectedStudent());

    this.els.loadedStudentsSearch?.addEventListener("input", () => {
      this.studentQuery = this.els.loadedStudentsSearch.value.trim().toLowerCase();
      this.studentPage = 1;
      this.renderStudentsTable();
    });

    this.els.studentsPageSize?.addEventListener("change", () => {
      this.studentPageSize = Number(this.els.studentsPageSize.value || 10);
      this.studentPage = 1;
      this.renderStudentsTable();
    });

    document.querySelectorAll("[data-loaded-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.studentTableFilter = btn.dataset.loadedFilter || "all";
        document.querySelectorAll("[data-loaded-filter]").forEach((item) => {
          item.classList.toggle("active", item === btn);
        });
        this.studentPage = 1;
        this.renderStudentsTable();
      });
    });

    this.els.selectAllLoadedBtn?.addEventListener("click", () => this.selectVisibleStudents());
    this.els.clearSelectedLoadedBtn?.addEventListener("click", () => this.clearSelectedStudents());

    this.els.selectAllCheckbox?.addEventListener("change", () => {
      if (this.els.selectAllCheckbox.checked) this.selectVisibleStudents();
      else this.clearVisibleStudents();
    });

    this.els.prevStudentsPageBtn?.addEventListener("click", () => {
      if (this.studentPage > 1) {
        this.studentPage -= 1;
        this.renderStudentsTable();
      }
    });

    this.els.nextStudentsPageBtn?.addEventListener("click", () => {
      const totalPages = this.getStudentTotalPages();
      if (this.studentPage < totalPages) {
        this.studentPage += 1;
        this.renderStudentsTable();
      }
    });

    this.els.search?.addEventListener("input", () => this.applyFilters());

    this.els.missingExamBtn?.addEventListener("click", () => this.toggleFilter("missing_exam"));
    this.els.missingAttendanceBtn?.addEventListener("click", () => this.toggleFilter("missing_attendance"));
    this.els.missingCaBtn?.addEventListener("click", () => this.toggleFilter("missing_ca"));
    this.els.readyOnlyBtn?.addEventListener("click", () => this.toggleFilter("ready"));

    this.els.printSelectedBtn?.addEventListener("click", () => this.printSelected());
    this.els.printAllBtn?.addEventListener("click", () => this.printAll());
    this.els.viewPdfBtn?.addEventListener("click", () => this.openPdfPreview());
    this.els.printPdfPreviewBtn?.addEventListener("click", () => this.printPdfPreview());

    this.els.exportCsvBtn?.addEventListener("click", () => this.exportFromBackend("csv"));
    this.els.exportExcelBtn?.addEventListener("click", () => this.exportFromBackend("excel"));

    this.els.markUsedBtn?.addEventListener("click", () => this.markUsedNotice());
    this.els.clearBtn?.addEventListener("click", () => this.clearPreview());

    this.els.rulesBtn?.addEventListener("click", () => this.openModal("reportRulesModal"));
    this.els.savedReportsBtn?.addEventListener("click", () => this.loadSavedReports());

    this.els.openRemarksTraitsBtn?.addEventListener("click", () => this.openRemarksEditor());
    this.els.editCurrentReportRemarksBtn?.addEventListener("click", () => this.openRemarksEditor());
    this.els.inspectCurrentReportBtn?.addEventListener("click", () => {
      const report = this.getCurrentReport();
      if (report?.student?.admission_number) this.openStudentBreakdown(report.student.admission_number);
    });

    this.els.remarksStudentSelect?.addEventListener("change", () => {
      const admission = this.els.remarksStudentSelect.value;
      const index = this.filteredReports.findIndex((r) => r.student?.admission_number === admission);
      if (index >= 0) {
        this.selectedIndex = index;
        this.renderStudentList();
        this.renderSelectedReport();
      }
      this.fillRemarksEditor();
    });

    this.els.useAutoTeacherRemarkBtn?.addEventListener("click", () => {
      const report = this.getCurrentReport();
      if (report && this.els.teacherRemarkInput) {
        this.els.teacherRemarkInput.value = report.teacher_remark || this.teacherRemark(report.final_average);
      }
    });

    this.els.useAutoPrincipalRemarkBtn?.addEventListener("click", () => {
      const report = this.getCurrentReport();
      if (report && this.els.principalRemarkInput) {
        this.els.principalRemarkInput.value = report.principal_remark || this.principalRemark(report.final_average);
      }
    });

    this.els.resetTraitsBtn?.addEventListener("click", () => this.resetTraitInputs());
    this.els.applyRemarksTraitsBtn?.addEventListener("click", () => this.applyRemarksTraits());

    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", () => this.closeModal(btn.dataset.closeModal));
    });

    document.querySelectorAll(".report-modal").forEach((modal) => {
      modal.addEventListener("click", (event) => {
        if (event.target === modal) this.closeModal(modal.id);
      });
    });
  },

  populateArms() {
    const level = this.els.level?.value || "";
    const arm = this.els.arm;
    if (!arm) return;

    const arms = level.startsWith("JSS")
      ? ["A", "B", "C"]
      : ["GOLD", "SILVER", "DIAMOND"];

    arm.innerHTML = `<option value="">Select arm</option>`;

    if (!level) return;

    arms.forEach((item) => {
      const option = document.createElement("option");
      option.value = item;
      option.textContent = item;
      arm.appendChild(option);
    });
  },

  updateModeCards() {
    const level = this.els.level?.value || "";
    const isJss = level.startsWith("JSS");

    this.els.jssModeCard?.classList.toggle("active", isJss || !level);
    this.els.ssModeCard?.classList.toggle("active", !isJss && !!level);
  },

  getPayload() {
    return {
      session: this.els.session?.value || "2025/2026",
      term: this.els.term?.value || "FIRST TERM",
      level: this.els.level?.value || "",
      arm: this.els.arm?.value || "",
      form_teacher: this.els.formTeacher?.value || "",
      next_term: this.els.nextTerm?.value || ""
    };
  },

  validateFilters() {
    const payload = this.getPayload();

    if (!payload.level || !payload.arm) {
      this.setStatus("Missing Filters", "Please select class level and class arm.", "error");
      this.setPreviewStatus("Error", "error");
      return false;
    }

    return true;
  },

  buildQuery(extra = {}) {
    const payload = { ...this.getPayload(), ...extra };
    const query = new URLSearchParams();

    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") query.append(key, value);
    });

    return query.toString();
  },

  async safeJson(response) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  },

  async loadStudents() {
    if (!this.validateFilters()) return;

    const payload = this.getPayload();

    try {
      this.setButtonLoading(this.els.loadStudentsBtn, true, "Loading...");
      this.setStatus("Loading Students", "Fetching students from class CSV...", "waiting");

      const response = await fetch(`${this.urls.students}?${this.buildQuery()}`);
      const data = await this.safeJson(response);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load students.");
      }

      this.students = data.students || [];
      this.selectedStudents.clear();
      this.selectedAdmission = "";
      this.studentPage = 1;

      this.renderStudentsTable();
      this.updateStats({ students: this.students.length });
      this.setSourceText("student", `${this.students.length} student(s) loaded from ${data.class_display || payload.level}.`);

      await this.loadSourceStatus(false);

      this.setStatus("Students Loaded", `${this.students.length} student(s) ready for report merge.`, "ready");
      this.setPreviewStatus("Waiting", "waiting");

    } catch (error) {
      this.students = [];
      this.renderStudentsTable();
      this.setStatus("Student Load Failed", error.message, "error");
      this.setPreviewStatus("Error", "error");
    } finally {
      this.setButtonLoading(this.els.loadStudentsBtn, false);
    }
  },

  async loadSourceStatus(renderStudents = true) {
    if (!this.validateFilters()) return;

    try {
      const response = await fetch(`${this.urls.sourceStatus}?${this.buildQuery()}`);
      const data = await this.safeJson(response);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to fetch source status.");
      }

      if (Array.isArray(data.students) && data.students.length) {
        this.students = data.students;
        if (renderStudents) this.renderStudentsTable();
        else this.renderStudentsTable();
      }

      this.updateSourceStatus(data.source_status || {});
      this.updateStats(data.summary || {});

    } catch {
      this.setSourceText("ca", "Could not check CA/Test.");
      this.setSourceText("exam", "Could not check Supabase CBT.");
      this.setSourceText("attendance", "Could not check attendance.");
    }
  },

async loadReports(mode = "preview") {
  if (!this.validateFilters()) return;

  const payload = this.getPayload();

  try {
    this.setButtonLoading(
      mode === "generate" ? this.els.generateBtn : this.els.previewBtn,
      true,
      "Working..."
    );

    this.setStatus("Generating", "Merging students, CA/Test, CBT and attendance...", "waiting");
    this.setPreviewStatus("Loading", "waiting");

    const response = mode === "generate"
      ? await fetch(this.urls.generate, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      : await fetch(`${this.urls.preview}?${this.buildQuery()}`);

    const data = await this.safeJson(response);

    if (!response.ok || !data.success) {
      const errorMessage =
        data.error ||
        data.message ||
        "No live CBT result found for this student.";

      this.reports = [];
      this.filteredReports = [];

      this.renderEmpty(errorMessage);
      this.updateStats(data.summary || {});
      this.updateSourceStatus(data.source_status || {});

      this.setStatus("Not Ready", errorMessage, "error");
      this.setPreviewStatus("Error", "error");

      this.flash(errorMessage, "error");

      return;
    }

    this.reports = Array.isArray(data.reports) ? data.reports : [];
    this.reports = this.reports.map((report) => this.attachReportEdit(report));

    this.filteredReports = [...this.reports];
    this.students = Array.isArray(data.students) ? data.students : this.students;
    this.selectedIndex = 0;

    this.renderStudentsTable();
    this.renderStudentList();
    this.renderSelectedReport();
    this.renderSavedReportsTableFromReports();
    this.updateStats(data.summary || {});
    this.updateSourceStatus(data.source_status || {});

    const successMessage =
      mode === "generate"
        ? `${this.reports.length} report sheet(s) generated successfully.`
        : `${this.reports.length} report sheet(s) ready for preview.`;

    this.setStatus(
      mode === "generate" ? "Reports Generated" : "Preview Ready",
      successMessage,
      "ready"
    );

    this.setPreviewStatus("Ready", "ready");
    this.flash(successMessage, "success");

  } catch (error) {
    console.error(error);

    const errorMessage = "Network or server error while generating reports.";

    this.reports = [];
    this.filteredReports = [];

    this.renderEmpty(errorMessage);
    this.setStatus("Server Error", "Could not connect to report generator backend.", "error");
    this.setPreviewStatus("Error", "error");
    this.flash(errorMessage, "error");

  } finally {
    this.setButtonLoading(this.els.previewBtn, false);
    this.setButtonLoading(this.els.generateBtn, false);
  }
},

  async generateSelectedStudent() {
  if (!this.validateFilters()) return;

  const admissions = [...this.selectedStudents];

  if (!admissions.length && this.selectedAdmission) {
    admissions.push(this.selectedAdmission);
  }

  if (!admissions.length) {
    const message = "Please select at least one student first.";
    this.flash(message, "error");
    return;
  }

  try {
    this.setButtonLoading(this.els.generateSelectedBtn, true, "Generating...");
    this.setStatus("Generating Selected", `Generating ${admissions.length} selected report(s)...`, "waiting");
    this.setPreviewStatus("Loading", "waiting");

    const generated = [];
    const blocked = [];

    for (const admission of admissions) {
      const response = await fetch(this.urls.generateStudent, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...this.getPayload(),
          admission_number: admission
        })
      });

      const data = await this.safeJson(response);

      if (response.ok && data.success && Array.isArray(data.reports) && data.reports.length) {
        generated.push(...data.reports.map((report) => this.attachReportEdit(report)));
        continue;
      }

      if (Array.isArray(data.blocked_students) && data.blocked_students.length) {
        blocked.push(...data.blocked_students);
      } else {
        blocked.push({
          admission_number: admission,
          full_name: admission,
          reason: data.error || data.message || "No matching CA/Test and live Supabase CBT result found."
        });
      }
    }

    if (!generated.length) {
      const blockedMessage =
        blocked.length
          ? blocked.map((student) => `${student.full_name || student.admission_number}: ${student.reason}`).join("\n")
          : "No selected student report could be generated.";

      this.reports = [];
      this.filteredReports = [];
      this.renderEmpty(blockedMessage);

      this.setStatus("Generate Failed", "No selected student has matching CA/Test and live Supabase CBT result.", "error");
      this.setPreviewStatus("Error", "error");

      this.flash("No report generated. Student has no matching CA/Test and live Supabase CBT result.", "error");

      blocked.slice(0, 5).forEach((student) => {
        this.flash(
          `${student.full_name || student.admission_number}: ${student.reason}`,
          "error"
        );
      });

      return;
    }

    this.reports = generated;
    this.filteredReports = [...this.reports];
    this.selectedIndex = 0;

    this.renderStudentList();
    this.renderSelectedReport();
    this.updateStats({
      students: this.students.length,
      generated: this.reports.length,
      blocked: blocked.length,
      subjects: this.countSubjects(),
      class_average: this.averageOfReports()
    });

    const successMessage = `${generated.length} selected report(s) generated successfully.`;

    this.setStatus("Selected Generated", successMessage, "ready");
    this.setPreviewStatus("Ready", "ready");
    this.flash(successMessage, "success");

    if (blocked.length) {
      this.flash(`${blocked.length} selected student(s) blocked because CBT/CA is missing.`, "error");
    }

  } catch (error) {
    console.error(error);

    this.setStatus("Generate Failed", error.message, "error");
    this.setPreviewStatus("Error", "error");
    this.flash(error.message || "Selected report generation failed.", "error");

  } finally {
    this.setButtonLoading(this.els.generateSelectedBtn, false);
  }
},

getFilteredStudents() {
  let list = [...this.students];

  if (this.studentQuery) {
    list = list.filter((student) => {
      const text = [
        student.full_name,
        student.admission_number,
        student.class_display,
        student.class_arm,
        student.phone,
        student.status_label
      ].join(" ").toLowerCase();

      return text.includes(this.studentQuery);
    });
  }

  if (this.studentTableFilter === "selected") {
    list = list.filter((student) => this.selectedStudents.has(student.admission_number));
  }

  if (this.studentTableFilter === "missing_ca") {
    list = list.filter((student) => !student.has_ca);
  }

  if (this.studentTableFilter === "missing_exam") {
    list = list.filter((student) => !student.has_exam);
  }

  if (this.studentTableFilter === "ready") {
    list = list.filter((student) => student.has_ca && student.has_exam);
  }

  return list;
},

getStudentTotalPages(rows = null) {
  const list = rows || this.getFilteredStudents();
  return Math.max(1, Math.ceil(list.length / this.studentPageSize));
},

  renderStudentsTable() {
  const body = this.els.studentsTableBody;
  if (!body) return;

  const rows = this.getFilteredStudents();
  const totalPages = this.getStudentTotalPages(rows);

  if (this.studentPage > totalPages) this.studentPage = totalPages;

  const start = (this.studentPage - 1) * this.studentPageSize;
  const visibleRows = rows.slice(start, start + this.studentPageSize);

  this.updateLoadedStudentCounters(rows);

  if (!this.students.length) {
    body.innerHTML = `
      <tr>
        <td colspan="9" class="report-table-empty">
          <i class="fa-solid fa-users"></i>
          <strong>No students loaded yet</strong>
          <span>Select a class and click Load Students.</span>
        </td>
      </tr>
    `;
    this.updateStudentPagination(0, 1, 1);
    return;
  }

  if (!visibleRows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="9" class="report-table-empty">
          <i class="fa-solid fa-magnifying-glass"></i>
          <strong>No matching student</strong>
          <span>Try another search or filter.</span>
        </td>
      </tr>
    `;
    this.updateStudentPagination(rows.length, this.studentPage, totalPages);
    return;
  }

  body.innerHTML = visibleRows.map((student, index) => {
    const globalIndex = start + index + 1;
    const selected = this.selectedStudents.has(student.admission_number);
    const active = student.admission_number === this.selectedAdmission;

    const hasCa = !!student.has_ca;
    const hasExam = !!student.has_exam;
    const hasAttendance = !!student.has_attendance;
    const isReady = hasCa && hasExam;

    const caLabel = hasCa ? "CA Ready" : "No CA/Test";
    const caState = hasCa ? "ready" : "missing";

    const examLabel = hasExam ? "CBT Found" : "No CBT Result";
    const examState = hasExam ? "ready" : "missing";

    const attendanceLabel = hasAttendance ? "Found" : "Missing";
    const attendanceState = hasAttendance ? "ready" : "waiting";

    const rowStatusClass = isReady ? "ready-row" : "blocked-row";

    const generateDisabled = !isReady
      ? `disabled aria-disabled="true" title="Cannot generate: missing ${!hasExam ? "live CBT result" : "CA/Test"}"`
      : `title="Generate"`;

    return `
      <tr class="${active ? "active" : ""} ${selected ? "selected" : ""} ${rowStatusClass}"
          data-admission="${this.escape(student.admission_number)}">
        <td>
          <input type="checkbox"
                 class="report-student-checkbox"
                 data-student-checkbox="${this.escape(student.admission_number)}"
                 ${selected ? "checked" : ""}>
        </td>

        <td>${globalIndex}</td>

        <td>
          <strong>${this.escape(student.admission_number || "--")}</strong>
        </td>

        <td>
          <strong>${this.escape(student.full_name || "Unnamed Student")}</strong>
          <small class="report-student-mini-status">
            ${isReady ? "Ready for report generation" : "Blocked: missing required result source"}
          </small>
        </td>

        <td>${this.escape(student.class_display || student.class_arm || "--")}</td>

        <td>${this.statusPill(caLabel, caState)}</td>

        <td>${this.statusPill(examLabel, examState)}</td>

        <td>${this.statusPill(attendanceLabel, attendanceState)}</td>

        <td>
          <div class="report-row-actions">
            <button type="button"
                    class="report-row-btn"
                    data-select-student="${this.escape(student.admission_number)}"
                    title="Select">
              <i class="fa-solid fa-check"></i>
            </button>

            <button type="button"
                    class="report-row-btn blue"
                    data-view-student="${this.escape(student.admission_number)}"
                    title="View details">
              <i class="fa-solid fa-eye"></i>
            </button>

            <button type="button"
                    class="report-row-btn green"
                    data-edit-remarks="${this.escape(student.admission_number)}"
                    title="Remarks">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>

            <button type="button"
                    class="report-row-btn red ${!isReady ? "disabled" : ""}"
                    data-generate-student="${this.escape(student.admission_number)}"
                    data-student-ready="${isReady ? "yes" : "no"}"
                    data-missing-reason="${this.escape(!hasExam ? "No live CBT/Supabase result found for this student." : "No CA/Test record found for this student.")}"
                    ${generateDisabled}>
              <i class="fa-solid fa-wand-magic-sparkles"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  body.querySelectorAll("[data-student-checkbox]").forEach((box) => {
    box.addEventListener("change", () => {
      const admission = box.dataset.studentCheckbox;

      if (box.checked) {
        this.selectedStudents.add(admission);
        this.selectedAdmission = admission;
      } else {
        this.selectedStudents.delete(admission);
        if (this.selectedAdmission === admission) {
          this.selectedAdmission = [...this.selectedStudents][0] || "";
        }
      }

      this.syncSelectedState();
      this.renderStudentsTable();
    });
  });

  body.querySelectorAll("[data-select-student]").forEach((btn) => {
    btn.addEventListener("click", () => {
      this.selectedAdmission = btn.dataset.selectStudent;
      this.selectedStudents.add(this.selectedAdmission);
      this.syncSelectedState();
      this.renderStudentsTable();
    });
  });

  body.querySelectorAll("[data-view-student]").forEach((btn) => {
    btn.addEventListener("click", () => this.openStudentBreakdown(btn.dataset.viewStudent));
  });

  body.querySelectorAll("[data-edit-remarks]").forEach((btn) => {
    btn.addEventListener("click", () => {
      this.selectedAdmission = btn.dataset.editRemarks;
      this.selectedStudents.add(this.selectedAdmission);

      const index = this.filteredReports.findIndex((report) => {
        return report.student?.admission_number === this.selectedAdmission;
      });

      if (index >= 0) this.selectedIndex = index;

      this.openRemarksEditor();
    });
  });

  body.querySelectorAll("[data-generate-student]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.studentReady !== "yes") {
        const message = btn.dataset.missingReason || "This student is missing required result source.";
        this.flash(message, "error");
        this.setStatus("Generation Blocked", message, "error");
        this.setPreviewStatus("Blocked", "error");
        return;
      }

      this.selectedAdmission = btn.dataset.generateStudent;
      this.selectedStudents.clear();
      this.selectedStudents.add(this.selectedAdmission);
      this.syncSelectedState();
      this.generateSelectedStudent();
    });
  });

  this.updateStudentPagination(rows.length, this.studentPage, totalPages);
},

  updateLoadedStudentCounters() {
    const list = this.students;
    const ca = list.filter((s) => s.has_ca).length;
    const exam = list.filter((s) => s.has_exam).length;
    const att = list.filter((s) => s.has_attendance).length;

    this.setText(this.els.loadedTotalCount, list.length);
    this.setText(this.els.loadedSelectedCount, this.selectedStudents.size);
    this.setText(this.els.loadedCaReadyCount, ca);
    this.setText(this.els.loadedExamReadyCount, exam);
    this.setText(this.els.loadedAttendanceCount, att);
  },

  updateStudentPagination(total, page, totalPages) {
    if (this.els.studentsPageInfo) {
      this.els.studentsPageInfo.textContent = total
        ? `Showing page ${page} of ${totalPages} • ${total} student(s)`
        : "No students loaded";
    }

    if (this.els.prevStudentsPageBtn) this.els.prevStudentsPageBtn.disabled = page <= 1;
    if (this.els.nextStudentsPageBtn) this.els.nextStudentsPageBtn.disabled = page >= totalPages;

    const visible = this.getFilteredStudents()
      .slice((this.studentPage - 1) * this.studentPageSize, this.studentPage * this.studentPageSize);

    if (this.els.selectAllCheckbox) {
      this.els.selectAllCheckbox.checked =
        visible.length > 0 && visible.every((student) => this.selectedStudents.has(student.admission_number));
    }
  },

  selectVisibleStudents() {
    const visible = this.getFilteredStudents()
      .slice((this.studentPage - 1) * this.studentPageSize, this.studentPage * this.studentPageSize);

    visible.forEach((student) => {
      this.selectedStudents.add(student.admission_number);
      this.selectedAdmission = student.admission_number;
    });

    this.syncSelectedState();
    this.renderStudentsTable();
  },

  clearVisibleStudents() {
    const visible = this.getFilteredStudents()
      .slice((this.studentPage - 1) * this.studentPageSize, this.studentPage * this.studentPageSize);

    visible.forEach((student) => this.selectedStudents.delete(student.admission_number));
    this.selectedAdmission = [...this.selectedStudents][0] || "";

    this.syncSelectedState();
    this.renderStudentsTable();
  },

  clearSelectedStudents() {
    this.selectedStudents.clear();
    this.selectedAdmission = "";
    this.syncSelectedState();
    this.renderStudentsTable();
  },

  syncSelectedState() {
    this.page?.classList.toggle("has-selected-student", this.selectedStudents.size > 0);
    this.updateLoadedStudentCounters();
  },

  renderStudentList() {
    const box = this.els.studentList;
    if (!box) return;

    if (!this.filteredReports.length) {
      box.innerHTML = `
        <div class="report-empty-small">
          <i class="fa-solid fa-file-lines"></i>
          <strong>No matching reports</strong>
          <span>Try clearing your search or filters.</span>
        </div>
      `;
      return;
    }

    box.innerHTML = this.filteredReports.map((report, index) => {
      const student = report.student || {};
      const missingExam = Number(report.missing_exam_count || 0) > 0;
      const attendance = report.attendance || {};
      const missingAttendance = !attendance.found || Number(attendance.days_open || 0) === 0;
      const hasEdits = !!this.getReportEdit(student.admission_number);

      return `
        <button type="button"
                class="report-student-item ${index === this.selectedIndex ? "active" : ""}"
                data-index="${index}">
          <div class="report-student-avatar">${this.initials(student.full_name)}</div>
          <div>
            <strong>${this.escape(student.full_name || "Unnamed Student")}</strong>
            <span>${this.escape(student.admission_number || "--")} • ${this.escape(student.class_display || "")}</span>
            <small>
              ${missingExam ? "Missing CBT" : "CBT OK"} •
              ${missingAttendance ? "No Attendance" : "Attendance OK"} •
              ${hasEdits ? "Remarks Edited" : "Auto Remarks"} •
              ${this.formatNumber(report.final_average)} Avg
            </small>
          </div>
        </button>
      `;
    }).join("");

    box.querySelectorAll(".report-student-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.selectedIndex = Number(btn.dataset.index || 0);
        this.renderStudentList();
        this.renderSelectedReport();
      });
    });
  },

  renderSelectedReport() {
    if (!this.filteredReports.length) {
      this.renderEmpty("No report selected.");
      return;
    }

    const report = this.attachReportEdit(this.filteredReports[this.selectedIndex] || this.filteredReports[0]);

    if (window.ReportSheetPDF && this.els.canvas) {
      this.els.canvas.innerHTML = window.ReportSheetPDF.render(report, this.getPayload());
    }

    if (this.els.previewSubtext) {
      this.els.previewSubtext.textContent = `${report.student?.full_name || ""} • ${report.student?.admission_number || ""}`;
    }
  },

  getCurrentReport() {
    if (!this.filteredReports.length) return null;
    return this.attachReportEdit(this.filteredReports[this.selectedIndex] || this.filteredReports[0]);
  },

  openRemarksEditor() {
    if (!this.filteredReports.length) {
      alert("Generate or preview a report first before editing remarks.");
      return;
    }

    this.populateRemarksStudentSelect();
    this.fillRemarksEditor();
    this.openModal("remarksTraitsModal");
  },

  populateRemarksStudentSelect() {
    const select = this.els.remarksStudentSelect;
    if (!select) return;

    select.innerHTML = `<option value="">Select generated student</option>`;

    this.filteredReports.forEach((report) => {
      const student = report.student || {};
      const option = document.createElement("option");
      option.value = student.admission_number || "";
      option.textContent = `${student.full_name || "Unnamed Student"} — ${student.admission_number || "--"}`;
      select.appendChild(option);
    });

    const current = this.getCurrentReport();
    if (current?.student?.admission_number) {
      select.value = current.student.admission_number;
    }
  },

  fillRemarksEditor() {
    const report = this.getCurrentReport();
    if (!report) return;

    const student = report.student || {};
    const edits = this.getReportEdit(student.admission_number) || {};

    if (this.els.remarksStudentSummary) {
      this.els.remarksStudentSummary.innerHTML = `
        <strong>${this.escape(student.full_name || "--")}</strong>
        <span>${this.escape(student.admission_number || "--")} • ${this.escape(student.class_display || "--")}</span>
        <small>Average: ${this.formatNumber(report.final_average)} • Grade: ${this.escape(report.final_grade || "--")}</small>
      `;
    }

    if (this.els.remarksFormTeacherInput) {
      this.els.remarksFormTeacherInput.value =
        edits.form_teacher || this.els.formTeacher?.value || "";
    }

    if (this.els.teacherRemarkInput) {
      this.els.teacherRemarkInput.value =
        edits.teacher_remark || report.teacher_remark || this.teacherRemark(report.final_average);
    }

    if (this.els.principalRemarkInput) {
      this.els.principalRemarkInput.value =
        edits.principal_remark || report.principal_remark || this.principalRemark(report.final_average);
    }

    if (this.els.remarksNextTermInput) {
      this.els.remarksNextTermInput.value =
        edits.next_term || this.els.nextTerm?.value || "";
    }

    this.fillTraitInputs(edits);
  },

  fillTraitInputs(edits = {}) {
    const affective = edits.affective || {};
    const psychomotor = edits.psychomotor || {};

    this.setInputValue(this.els.traitPunctuality, affective.punctuality ?? 4);
    this.setInputValue(this.els.traitAttendance, affective.attendance ?? 4);
    this.setInputValue(this.els.traitReliability, affective.reliability ?? 4);
    this.setInputValue(this.els.traitNeatness, affective.neatness ?? 4);
    this.setInputValue(this.els.traitPoliteness, affective.politeness ?? 4);
    this.setInputValue(this.els.traitHonesty, affective.honesty ?? 4);
    this.setInputValue(this.els.traitRelationship, affective.relationship ?? 4);
    this.setInputValue(this.els.traitSelfControl, affective.self_control ?? 4);
    this.setInputValue(this.els.traitAttentiveness, affective.attentiveness ?? 4);
    this.setInputValue(this.els.traitPerseverance, affective.perseverance ?? 4);

    this.setInputValue(this.els.psyHandwriting, psychomotor.handwriting ?? 4);
    this.setInputValue(this.els.psyGames, psychomotor.games ?? 4);
    this.setInputValue(this.els.psySport, psychomotor.sport ?? "");
    this.setInputValue(this.els.psyDrawing, psychomotor.drawing ?? 4);
    this.setInputValue(this.els.psyCrafts, psychomotor.crafts ?? 4);
    this.setInputValue(this.els.psyMusic, psychomotor.musical_skills ?? 4);
  },

  resetTraitInputs() {
    this.fillTraitInputs({
      affective: {
        punctuality: 4,
        attendance: 4,
        reliability: 4,
        neatness: 4,
        politeness: 4,
        honesty: 4,
        relationship: 4,
        self_control: 4,
        attentiveness: 4,
        perseverance: 4
      },
      psychomotor: {
        handwriting: 4,
        games: 4,
        sport: "",
        drawing: 4,
        crafts: 4,
        musical_skills: 4
      }
    });
  },

  applyRemarksTraits() {
    const report = this.getCurrentReport();
    if (!report?.student?.admission_number) return;

    const admission = report.student.admission_number;

    const edit = {
      form_teacher: this.els.remarksFormTeacherInput?.value || "",
      teacher_remark: this.els.teacherRemarkInput?.value || "",
      principal_remark: this.els.principalRemarkInput?.value || "",
      next_term: this.els.remarksNextTermInput?.value || "",
      affective: {
        punctuality: this.ratingInput(this.els.traitPunctuality),
        attendance: this.ratingInput(this.els.traitAttendance),
        reliability: this.ratingInput(this.els.traitReliability),
        neatness: this.ratingInput(this.els.traitNeatness),
        politeness: this.ratingInput(this.els.traitPoliteness),
        honesty: this.ratingInput(this.els.traitHonesty),
        relationship: this.ratingInput(this.els.traitRelationship),
        self_control: this.ratingInput(this.els.traitSelfControl),
        attentiveness: this.ratingInput(this.els.traitAttentiveness),
        perseverance: this.ratingInput(this.els.traitPerseverance)
      },
      psychomotor: {
        handwriting: this.ratingInput(this.els.psyHandwriting),
        games: this.ratingInput(this.els.psyGames),
        sport: this.ratingInput(this.els.psySport, true),
        drawing: this.ratingInput(this.els.psyDrawing),
        crafts: this.ratingInput(this.els.psyCrafts),
        musical_skills: this.ratingInput(this.els.psyMusic)
      }
    };

    this.reportEdits[this.editKey(admission)] = edit;
    this.saveStoredEdits();

    this.reports = this.reports.map((item) => this.attachReportEdit(item));
    this.filteredReports = this.filteredReports.map((item) => this.attachReportEdit(item));

    this.renderStudentList();
    this.renderSelectedReport();
    this.renderSavedReportsTableFromReports();
    this.setSourceText("remarks", "Remarks and ratings edited locally for print preview.");
    this.closeModal("remarksTraitsModal");
  },

  attachReportEdit(report) {
    if (!report || !report.student) return report;

    const edit = this.getReportEdit(report.student.admission_number);
    if (!edit) return report;

    return {
      ...report,
      report_edits: edit
    };
  },

  getReportEdit(admission) {
    return this.reportEdits[this.editKey(admission)] || null;
  },

  editKey(admission) {
    const payload = this.getPayload();
    return [
      payload.session,
      payload.term,
      payload.level,
      payload.arm,
      admission
    ].join("|").toLowerCase();
  },

  loadStoredEdits() {
    try {
      this.reportEdits = JSON.parse(localStorage.getItem("sms_report_sheet_edits") || "{}");
    } catch {
      this.reportEdits = {};
    }
  },

  saveStoredEdits() {
    try {
      localStorage.setItem("sms_report_sheet_edits", JSON.stringify(this.reportEdits));
    } catch {
      console.warn("Could not save report edits to localStorage.");
    }
  },

  toggleFilter(filter) {
    this.activeFilter = this.activeFilter === filter ? "all" : filter;

    [
      [this.els.missingExamBtn, "missing_exam"],
      [this.els.missingAttendanceBtn, "missing_attendance"],
      [this.els.missingCaBtn, "missing_ca"],
      [this.els.readyOnlyBtn, "ready"]
    ].forEach(([btn, key]) => btn?.classList.toggle("active", this.activeFilter === key));

    this.applyFilters();
  },

  applyFilters() {
    const q = (this.els.search?.value || "").trim().toLowerCase();

    this.filteredReports = this.reports.filter((report) => {
      const student = report.student || {};
      const name = String(student.full_name || "").toLowerCase();
      const admission = String(student.admission_number || "").toLowerCase();

      const matchesSearch = !q || name.includes(q) || admission.includes(q);
      const missingExam = Number(report.missing_exam_count || 0) > 0;
      const missingAttendance = !report.attendance || !report.attendance.found;
      const missingCa = !report.subject_count || Number(report.subject_count) === 0;
      const ready = !missingCa;

      let matchesFilter = true;
      if (this.activeFilter === "missing_exam") matchesFilter = missingExam;
      if (this.activeFilter === "missing_attendance") matchesFilter = missingAttendance;
      if (this.activeFilter === "missing_ca") matchesFilter = missingCa;
      if (this.activeFilter === "ready") matchesFilter = ready;

      return matchesSearch && matchesFilter;
    });

    this.selectedIndex = 0;
    this.renderStudentList();
    this.renderSelectedReport();
  },

  async loadSavedReports() {
    try {
      this.openModal("savedReportsModal");

      this.els.savedReportsTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="report-table-empty">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <strong>Loading saved reports...</strong>
            <span>Please wait.</span>
          </td>
        </tr>
      `;

      const response = await fetch(`${this.urls.saved}?${this.buildQuery()}`);
      const data = await this.safeJson(response);

      if (!response.ok || !data.success) throw new Error(data.message || "Unable to load saved reports.");

      this.savedReports = data.records || [];
      this.renderSavedReportsTable(this.savedReports);

    } catch (error) {
      this.els.savedReportsTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="report-table-empty">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <strong>Could not load saved reports</strong>
            <span>${this.escape(error.message)}</span>
          </td>
        </tr>
      `;
    }
  },

  renderSavedReportsTable(records) {
    const body = this.els.savedReportsTableBody;
    if (!body) return;

    if (!records.length) {
      body.innerHTML = `
        <tr>
          <td colspan="8" class="report-table-empty">
            <i class="fa-solid fa-folder-open"></i>
            <strong>No saved report yet</strong>
            <span>Generate reports first, then they will appear here.</span>
          </td>
        </tr>
      `;
      return;
    }

    body.innerHTML = records.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${this.escape(row.Admission_number || "")}</td>
        <td>${this.escape(row.Student_name || "")}</td>
        <td>${this.escape(row.Class_display || row.Class_arm || "")}</td>
        <td>${this.formatNumber(row.Average)}</td>
        <td>${this.escape(row.Grade || "")}</td>
        <td>${this.escape(row.Subjects || "0")}</td>
        <td>
          <div class="report-row-actions">
            <button type="button" class="saved-report-action-btn" data-open-saved="${index}">
              <i class="fa-solid fa-eye"></i> View
            </button>
            <button type="button" class="saved-report-action-btn danger" data-delete-saved="${index}">
              <i class="fa-solid fa-trash"></i> Delete
            </button>
          </div>
        </td>
      </tr>
    `).join("");

    body.querySelectorAll("[data-open-saved]").forEach((btn) => {
      btn.addEventListener("click", () => this.openSavedReportPayload(records[Number(btn.dataset.openSaved)]));
    });

    body.querySelectorAll("[data-delete-saved]").forEach((btn) => {
      btn.addEventListener("click", () => this.deleteSavedReport(records[Number(btn.dataset.deleteSaved)]));
    });
  },

  renderSavedReportsTableFromReports() {
    if (!this.els.savedReportsTableBody) return;

    const payload = this.getPayload();
    const classArm = payload.level.startsWith("JSS")
      ? `${payload.level}${payload.arm}`
      : `${payload.level}_${payload.arm}`;

    const records = this.reports.map((report) => {
      const edited = this.attachReportEdit(report);

      return {
        Generated_at: new Date().toISOString(),
        Session: payload.session,
        Term: payload.term,
        Class_arm: classArm,
        Class_display: edited.student?.class_display,
        Admission_number: edited.student?.admission_number,
        Student_name: edited.student?.full_name,
        Average: edited.final_average,
        Grade: edited.final_grade,
        Overall_position: edited.overall_position_text,
        Subjects: edited.subject_count,
        Missing_exam: edited.missing_exam_count,
        Payload: JSON.stringify(edited)
      };
    });

    this.renderSavedReportsTable(records);
  },

  async deleteSavedReport(row) {
    if (!row) return;
    if (!confirm("Delete this saved generated report?")) return;

    try {
      const response = await fetch(this.urls.deleteSaved, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session: row.Session,
          term: row.Term,
          class_arm: row.Class_arm,
          admission_number: row.Admission_number
        })
      });

      const data = await this.safeJson(response);
      if (!response.ok || !data.success) throw new Error(data.message || "Could not delete saved report.");

      await this.loadSavedReports();

    } catch (error) {
      alert(error.message);
    }
  },

  openSavedReportPayload(row) {
    try {
      const report = this.attachReportEdit(JSON.parse(row.Payload || "{}"));
      if (!report || !report.student) throw new Error("Invalid saved report payload.");

      this.reports = [report];
      this.filteredReports = [report];
      this.selectedIndex = 0;

      this.renderStudentList();
      this.renderSelectedReport();
      this.closeModal("savedReportsModal");

    } catch {
      alert("Saved report payload could not be opened.");
    }
  },

  openStudentBreakdown(admission) {
    const student = this.students.find((item) => item.admission_number === admission);
    const report = this.reports.find((item) => item.student?.admission_number === admission);
    const source = report?.student || student;

    if (!source) return;

    this.setText(this.els.studentModalTitle, source.full_name || "Student Details");
    this.setText(this.els.studentModalSubtext, `${source.admission_number || "--"} • ${source.class_display || ""}`);

    if (!report) {
      this.els.studentModalBody.innerHTML = `
        <div class="student-breakdown-grid">
          <article class="student-breakdown-card"><span>Admission No</span><strong>${this.escape(source.admission_number)}</strong></article>
          <article class="student-breakdown-card"><span>Class</span><strong>${this.escape(source.class_display)}</strong></article>
          <article class="student-breakdown-card"><span>CA/Test</span><strong>${source.has_ca ? "Ready" : "Missing"}</strong></article>
          <article class="student-breakdown-card"><span>CBT</span><strong>${source.has_exam ? "Found" : "Missing"}</strong></article>
        </div>
      `;
    } else {
      this.els.studentModalBody.innerHTML = `
        <div class="student-breakdown-grid">
          <article class="student-breakdown-card"><span>Average</span><strong>${this.formatNumber(report.final_average)}</strong></article>
          <article class="student-breakdown-card"><span>Grade</span><strong>${this.escape(report.final_grade)}</strong></article>
          <article class="student-breakdown-card"><span>Position</span><strong>${this.escape(report.overall_position_text || "--")}</strong></article>
          <article class="student-breakdown-card"><span>Subjects</span><strong>${report.subject_count || 0}</strong></article>
        </div>

        <table class="student-breakdown-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>CA Total</th>
              <th>Exam</th>
              <th>Total</th>
              <th>Grade</th>
              <th>Position</th>
              <th>Out Of</th>
              <th>Low</th>
              <th>High</th>
              <th>Class Ave</th>
              <th>CBT</th>
            </tr>
          </thead>
          <tbody>
            ${(report.subjects || []).map((row) => `
              <tr>
                <td>${this.escape(row.subject)}</td>
                <td>${this.formatNumber(row.ca?.ca_total)}</td>
                <td>${this.formatNumber(row.exam)}</td>
                <td>${this.formatNumber(row.total)}</td>
                <td>${this.escape(row.grade)}</td>
                <td>${this.escape(row.position_text || row.position || "--")}</td>
                <td>${this.escape(row.out_of || "0")}</td>
                <td>${this.formatNumber(row.lowest)}</td>
                <td>${this.formatNumber(row.highest)}</td>
                <td>${this.formatNumber(row.class_average)}</td>
                <td>${row.exam_found ? "Found" : "Missing"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    }

    this.openModal("studentReportModal");
  },




getReportPdfFilename(report) {
  const student = report?.student || {};
  const admission = this.slugFilePart(student.admission_number || "student");
  const firstName = this.slugFilePart(
    String(student.full_name || "result").trim().split(/\s+/)[0] || "result"
  );

  return `${admission}_${firstName}_result.pdf`;
},

slugFilePart(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
},



openPdfPreview() {
  if (!this.filteredReports.length) {
    alert("No report available for PDF preview.");
    return;
  }

  const report = this.getCurrentReport();

  if (this.els.pdfCanvas && window.ReportSheetPDF) {
    this.els.pdfCanvas.innerHTML = window.ReportSheetPDF.render(report, this.getPayload());
  }

  this.openModal("pdfPreviewModal");
},

printPdfPreview() {
  const report = this.getCurrentReport();

  if (!report) {
    this.flash("No report available to print.", "error");
    return;
  }

  if (!window.ReportSheetPDF || typeof window.ReportSheetPDF.render !== "function") {
    this.flash("Report PDF renderer is not available.", "error");
    return;
  }

  this.closeModal("pdfPreviewModal");

  const html = window.ReportSheetPDF.render(report, this.getPayload());
  const filename = this.getReportPdfFilename(report);

  setTimeout(() => {
    this.printHtmlOnly(html, filename);
  }, 250);
},
// Print Block //


printSelected() {
  const report = this.getCurrentReport();

  if (!report) {
    this.flash("No selected report to print.", "error");
    return;
  }

  if (!window.ReportSheetPDF || typeof window.ReportSheetPDF.render !== "function") {
    this.flash("Report PDF renderer is not available.", "error");
    return;
  }

  const html = window.ReportSheetPDF.render(report, this.getPayload());
  this.printHtmlOnly(html, this.getReportPdfFilename(report));
},


printAll() {
  if (!this.filteredReports.length) {
    this.flash("No reports available to print.", "error");
    return;
  }

  if (!window.ReportSheetPDF || typeof window.ReportSheetPDF.render !== "function") {
    this.flash("Report PDF renderer is not available.", "error");
    return;
  }

  const html = this.filteredReports
    .map((report) => window.ReportSheetPDF.render(this.attachReportEdit(report), this.getPayload()))
    .join("");

  const payload = this.getPayload();
  const className = `${payload.level}_${payload.arm}`.toLowerCase();
  this.printHtmlOnly(html, `${className}_class_results.pdf`);
},



  printHtmlOnly(html, filename = "report_sheet.pdf") {
  let printCanvas = document.getElementById("reportPrintCanvas");

  if (!printCanvas) {
    printCanvas = document.createElement("div");
    printCanvas.id = "reportPrintCanvas";
    document.body.appendChild(printCanvas);
  }

  const oldTitle = document.title;
  document.title = filename.replace(/\.pdf$/i, "");

  printCanvas.innerHTML = html;
  document.body.classList.add("report-printing-now");

  const cleanup = () => {
    document.body.classList.remove("report-printing-now");
    printCanvas.innerHTML = "";
    document.title = oldTitle;
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.focus();
      window.print();
    });
  });
},




  exportFromBackend(type) {
    if (!this.validateFilters()) return;
    const base = type === "excel" ? this.urls.exportExcel : this.urls.exportCsv;
    window.location.href = `${base}?${this.buildQuery()}`;
  },

  updateStats(summary = {}) {
    this.setText(this.els.studentsCount, summary.students || summary.students_in_class || this.students.length || 0);
    this.setText(this.els.readyCount, summary.generated || this.reports.length || 0);
    this.setText(this.els.subjectsCount, summary.subjects || this.countSubjects());
    this.setText(this.els.classAverage, this.formatNumber(summary.class_average, "--"));
  },

  updateSourceStatus(source = {}) {
    this.setSourceText("student", source.students?.message || "Students waiting.");
    this.setSourceText("ca", source.ca_test?.message || "CA/Test waiting.");
    this.setSourceText("exam", source.supabase?.message || "Supabase CBT waiting.");
    this.setSourceText("attendance", source.attendance?.message || "Attendance waiting.");
    this.setSourceText("remarks", "Editable remarks and ratings are handled on this page.");
  },

  setSourceText(type, text) {
    const map = {
      student: this.els.studentSourceStatus,
      ca: this.els.caSourceStatus,
      exam: this.els.examSourceStatus,
      attendance: this.els.attendanceSourceStatus,
      remarks: this.els.remarksSourceStatus
    };

    if (map[type]) map[type].textContent = text;
  },

  countSubjects() {
    const set = new Set();
    this.reports.forEach((report) => (report.subjects || []).forEach((row) => set.add(row.subject)));
    return set.size;
  },

  averageOfReports() {
    if (!this.reports.length) return 0;
    const total = this.reports.reduce((sum, item) => sum + Number(item.final_average || 0), 0);
    return total / this.reports.length;
  },

  statusPill(text, type = "waiting") {
    return `<span class="report-status-pill ${type}">${this.escape(text)}</span>`;
  },

  renderEmpty(message) {
    if (this.els.canvas) {
      this.els.canvas.innerHTML = `
        <div class="report-empty">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <strong>Report not ready</strong>
          <span>${this.escape(message)}</span>
        </div>
      `;
    }

    if (this.els.studentList) {
      this.els.studentList.innerHTML = `
        <div class="report-empty-small">
          <i class="fa-solid fa-file-lines"></i>
          <strong>No report generated</strong>
          <span>${this.escape(message)}</span>
        </div>
      `;
    }
  },

  clearPreview() {
    this.reports = [];
    this.filteredReports = [];
    this.selectedIndex = 0;
    this.activeFilter = "all";

    if (this.els.search) this.els.search.value = "";

    [this.els.missingExamBtn, this.els.missingAttendanceBtn, this.els.missingCaBtn, this.els.readyOnlyBtn]
      .forEach((btn) => btn?.classList.remove("active"));

    this.updateStats({});
    this.setStatus("Waiting", "Select class and load students to begin.", "waiting");
    this.setPreviewStatus("Waiting", "waiting");

    if (this.els.studentList) {
      this.els.studentList.innerHTML = `
        <div class="report-empty-small">
          <i class="fa-solid fa-file-lines"></i>
          <strong>No report generated yet</strong>
          <span>Preview or generate reports to see students here.</span>
        </div>
      `;
    }

    if (this.els.canvas) {
      this.els.canvas.innerHTML = `
        <div class="report-empty">
          <i class="fa-solid fa-file-circle-plus"></i>
          <strong>No report selected</strong>
          <span>Generate reports, then open one student at a time from the report list.</span>
        </div>
      `;
    }
  },

  resetLoadedData() {
    this.students = [];
    this.selectedAdmission = "";
    this.selectedStudents.clear();
    this.studentQuery = "";
    this.studentPage = 1;

    if (this.els.loadedStudentsSearch) this.els.loadedStudentsSearch.value = "";

    this.renderStudentsTable();
    this.clearPreview();
    this.syncSelectedState();

    this.setSourceText("student", "Waiting for class selection");
    this.setSourceText("ca", "Preview will check saved CA/Test");
    this.setSourceText("exam", "Exam scores fetched during generation");
    this.setSourceText("attendance", "Attendance is merged if available");
    this.setSourceText("remarks", "Editable remarks and ratings are handled on this page.");
  },

  markUsedNotice() {
    alert("CBT result_used marking will be connected after we confirm your Supabase column name.");
  },

  setStatus(title, hint, type = "waiting") {
    this.setText(this.els.statusLabel, title);
    this.setText(this.els.statusHint, hint);
    this.els.statusLabel?.classList.remove("ready", "error", "waiting");
    this.els.statusLabel?.classList.add(type);
  },

  setPreviewStatus(text, type = "waiting") {
    if (!this.els.previewStatus) return;
    this.els.previewStatus.textContent = text;
    this.els.previewStatus.classList.remove("ready", "error", "waiting");
    this.els.previewStatus.classList.add(type);
  },

  setButtonLoading(button, loading, text = "Loading...") {
    if (!button) return;

    if (loading) {
      button.dataset.originalText = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${this.escape(text)}`;
    } else {
      button.disabled = false;
      if (button.dataset.originalText) button.innerHTML = button.dataset.originalText;
    }
  },

  openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  },

  closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  },

  initials(name) {
    const text = String(name || "").trim();
    if (!text) return "?";
    return text.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  },

  formatNumber(value, fallback = "0.0") {
    const num = Number(value);
    if (Number.isNaN(num)) return fallback;
    return num.toFixed(1);
  },

  teacherRemark(avg) {
    avg = Number(avg || 0);
    if (avg >= 80) return "An excellent student with great potentials.";
    if (avg >= 70) return "A very good performance. Keep it up.";
    if (avg >= 60) return "A good result with room for more improvement.";
    if (avg >= 45) return "An average performance. More effort is needed.";
    return "Poor performance. Serious improvement is required.";
  },

  principalRemark(avg) {
    avg = Number(avg || 0);
    if (avg >= 80) return "An excellent result.";
    if (avg >= 70) return "A very good result, keep it up.";
    if (avg >= 60) return "Good result.";
    if (avg >= 45) return "Average Performance";
    return "Unsatisfactory performance.";
  },

  ratingInput(el, allowBlank = false) {
    if (!el) return allowBlank ? "" : 4;

    const raw = String(el.value || "").trim();
    if (allowBlank && raw === "") return "";

    const value = Number(raw);
    if (Number.isNaN(value)) return allowBlank ? "" : 4;

    return Math.max(1, Math.min(6, value));
  },

  setInputValue(el, value) {
    if (el) el.value = value;
  },

  setText(el, value) {
    if (el) el.textContent = value;
  },

flash(message, type = "info") {
  const stack = document.getElementById("reportFlashStack");

  if (!stack) {
    alert(message);
    return;
  }

  const item = document.createElement("div");
  item.className = `report-flash ${type}`;
  item.innerHTML = `
    <i class="fa-solid ${type === "error" ? "fa-triangle-exclamation" : "fa-circle-check"}"></i>
    <span>${this.escape(message)}</span>
  `;

  stack.appendChild(item);

  setTimeout(() => item.classList.add("show"), 20);

  setTimeout(() => {
    item.classList.remove("show");
    setTimeout(() => item.remove(), 300);
  }, 5000);
},


async loadDefaultNextTerm() {
  try {
    const response = await fetch(this.urls.nextTermSettings);
    const data = await this.safeJson(response);

    const nextTerm =
      data.report_next_term ||
      data.settings?.report_next_term ||
      "";

    if (nextTerm && this.els.nextTerm) {
      this.els.nextTerm.value = nextTerm;
    }
  } catch (error) {
    console.warn("Could not load default next term date.", error);
  }
},

async saveDefaultNextTerm() {
  const value = this.els.nextTerm?.value || "";

  if (!value) {
    this.flash("Please select a next term date first.", "error");
    return;
  }

  try {
    this.setButtonLoading(this.els.saveNextTermBtn, true, "Saving...");

    const response = await fetch(this.urls.nextTermSettings, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report_next_term: value
      })
    });

    const data = await this.safeJson(response);

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Could not save next term date.");
    }

    this.flash("Default next term date saved for all reports.", "success");
  } catch (error) {
    this.flash(error.message || "Could not save next term date.", "error");
  } finally {
    this.setButtonLoading(this.els.saveNextTermBtn, false);
  }
},


  escape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
};