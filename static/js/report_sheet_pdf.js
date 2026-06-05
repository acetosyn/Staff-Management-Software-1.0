/* ============================================================
   REPORT SHEET PDF RENDERER
   Handles only: printable / PDF report sheet UI
   Updated to match old JSS/SS report format:
   OUT OF, LOW IN CLASS, HIGH IN CLASS, CLASS AVE,
   full affective traits, psychomotor, scale and editable remarks.
============================================================ */

window.ReportSheetPDF = {
  render(report, payload = {}) {
  const student = report.student || {};
  const subjects = report.subjects || [];
  const attendance = report.attendance || {};
  const stats = report.class_stats || {};
  const edits = report.report_edits || {};
  const isJss = String(student.class_level || payload.level || "").startsWith("JSS");

  return `
    <article class="generated-report-sheet modern-report-sheet old-format-report-sheet old-format-report-page report-page-main">
      ${this.header(payload)}
      ${this.title(payload)}
      ${this.studentSummary(report, student, attendance, stats, payload)}
      ${this.subjectTable(subjects, isJss)}
      ${this.gradeDetails(report)}
    </article>

    <article class="generated-report-sheet modern-report-sheet old-format-report-sheet old-format-report-page report-page-traits">
      ${this.traitsSection(report, edits)}
      ${this.remarksSection(report, payload, edits)}
    </article>
  `;
},

  header(payload) {
    return `
      <header class="modern-report-header old-report-header">
        <div class="modern-report-logo-box old-report-logo-box">
          <img src="/static/images/emis.png" alt="EMIS Logo">
        </div>

        <div class="modern-report-school old-report-school">
          <h1>EPITOME MODEL ISLAMIC SCHOOLS</h1>
          <p>Motto: FOR TOTAL ACADEMIC EXCELLENCE</p>
          <span>OFF SANI ABACHA ROAD, OLD KARU ROAD, ANGUWAR HASHIMU</span>
        </div>
      </header>
    `;
  },

  title(payload) {
    return `
      <section class="old-report-title">
        REPORT SHEET FOR ${this.escape(payload.term || "")}
        ${this.escape(payload.session || "")} ACADEMIC SESSION
      </section>
    `;
  },

  studentSummary(report, student, attendance, stats, payload) {
    const age = student.age || student.Age || "";
    const noInClass = stats.no_in_class || report.no_in_class || 0;

    return `
      <section class="old-report-student-summary">
        <div class="old-report-name-row">
          <span>NAME:</span>
          <strong>${this.escape(student.full_name || "--")}</strong>
        </div>

        <div class="old-report-info-grid">
          <div class="old-report-info-col">
            <p><span>Class:</span> <strong>${this.escape(student.class_display || "--")}</strong></p>
            <p><span>Admission No:</span> <strong>${this.escape(student.admission_number || "--")}</strong></p>
            <p><span>Session:</span> <strong>${this.escape(payload.session || "--")}</strong></p>
            <p><span>Term:</span> <strong>${this.escape(payload.term || "--")}</strong></p>
            <p><span>No. in Class:</span> <strong>${noInClass || "--"}</strong></p>
          </div>

          <div class="old-report-info-col">
            <p><span>Total Score:</span> <strong>${this.num(report.total_score)}</strong></p>
            <p><span>Final Average:</span> <strong>${this.num(report.final_average)}</strong></p>
            <p><span>Class Average:</span> <strong>${this.num(stats.class_average)}</strong></p>
            <p><span>Highest Ave. in Class:</span> <strong>${this.num(stats.highest_average)}</strong></p>
            <p><span>Lowest Ave. in Class:</span> <strong>${this.num(stats.lowest_average)}</strong></p>
          </div>

          <div class="old-report-info-col">
            <p><span>Final Grade:</span> <strong>${this.escape(report.final_grade || "--")}</strong></p>
            <p><span>Age:</span> <strong>${this.escape(age || "")}</strong></p>
            <p class="old-attendance-title">ATTENDANCE</p>
            <p><span>Days School Open:</span> <strong>${attendance.days_open || 0}</strong></p>
            <p><span>Day(s) Present:</span> <strong>${attendance.present || 0}</strong></p>
            <p><span>Day(s) Absent:</span> <strong>${attendance.absent || 0}</strong></p>
          </div>
        </div>
      </section>
    `;
  },

  subjectTable(subjects, isJss) {
    return `
      <section class="modern-subject-section old-subject-section">
        <table class="modern-result-table old-result-table">
          <thead>
            ${isJss ? this.jssHeader() : this.ssHeader()}
          </thead>

          <tbody>
            ${
              subjects.length
                ? subjects.map((row) => isJss ? this.jssRow(row) : this.ssRow(row)).join("")
                : `<tr><td colspan="${isJss ? 14 : 13}" class="empty-subject-row">No subject record found.</td></tr>`
            }
          </tbody>
        </table>
      </section>
    `;
  },

  jssHeader() {
    return `
      <tr>
        <th>SUBJECT</th>
        <th>CA1<br><small>(10%)</small></th>
        <th>CA2<br><small>(10%)</small></th>
        <th>TEST1<br><small>(20%)</small></th>
        <th>TEST2<br><small>(20%)</small></th>
        <th>EXAM<br><small>(40%)</small></th>
        <th>TOTAL<br><small>(100%)</small></th>
        <th>GRD</th>
        <th>POS</th>
        <th>OUT<br>OF</th>
        <th>LOW.<br>IN<br>CLASS</th>
        <th>HIGH.<br>IN<br>CLASS</th>
        <th>CLASS<br>AVE</th>
        <th>COMMENT</th>
      </tr>
    `;
  },

  ssHeader() {
    return `
      <tr>
        <th>SUBJECT</th>
        <th>1ST ASS.<br><small>(5%)</small></th>
        <th>2ND ASS.<br><small>(5%)</small></th>
        <th>TEST<br><small>(20%)</small></th>
        <th>EXAM<br><small>(70%)</small></th>
        <th>TOTAL<br><small>(100%)</small></th>
        <th>GRD</th>
        <th>POS</th>
        <th>OUT<br>OF</th>
        <th>LOW.<br>IN<br>CLASS</th>
        <th>HIGH.<br>IN<br>CLASS</th>
        <th>CLASS<br>AVE</th>
        <th>COMMENT</th>
      </tr>
    `;
  },

  jssRow(row) {
    const ca = row.ca || {};

    return `
      <tr>
        <td class="subject-name">${this.escape(row.subject || "--")}</td>
        <td>${this.num(ca.ca1)}</td>
        <td>${this.num(ca.ca2)}</td>
        <td>${this.num(ca.test1)}</td>
        <td>${this.num(ca.test2)}</td>
        <td class="${row.exam_found ? "" : "missing-score"}">${this.num(row.exam)}</td>
        <td class="${this.gradeClass(row.total)}">${this.num(row.total)}</td>
        <td>${this.escape(row.grade || "--")}</td>
        <td>${this.positionValue(row)}</td>
        <td>${this.outOfValue(row)}</td>
        <td>${this.num(row.lowest)}</td>
        <td>${this.num(row.highest)}</td>
        <td>${this.num(row.class_average)}</td>
        <td>${this.escape(row.comment || this.commentForScore(row.total))}</td>
      </tr>
    `;
  },

  ssRow(row) {
    const ca = row.ca || {};

    return `
      <tr>
        <td class="subject-name">${this.escape(row.subject || "--")}</td>
        <td>${this.num(ca.ass1)}</td>
        <td>${this.num(ca.ass2)}</td>
        <td>${this.num(ca.test)}</td>
        <td class="${row.exam_found ? "" : "missing-score"}">${this.num(row.exam)}</td>
        <td class="${this.gradeClass(row.total)}">${this.num(row.total)}</td>
        <td>${this.escape(row.grade || "--")}</td>
        <td>${this.positionValue(row)}</td>
        <td>${this.outOfValue(row)}</td>
        <td>${this.num(row.lowest)}</td>
        <td>${this.num(row.highest)}</td>
        <td>${this.num(row.class_average)}</td>
        <td>${this.escape(row.comment || this.commentForScore(row.total))}</td>
      </tr>
    `;
  },

  gradeDetails(report) {
    return `
      <section class="old-grade-details">
        <div>
          <strong>GRADE DETAILS:</strong>
          <span>A=80-100.</span>
          <span>B=70-80.</span>
          <span>C=60-70.</span>
          <span>D=45-60.</span>
          <span>E=40-45.</span>
          <span>F=0-40.</span>
        </div>

        <div>
          <span>No. of Subjects:</span>
          <strong>${report.subject_count || 0}</strong>
        </div>
      </section>
    `;
  },

  traitsSection(report, edits = {}) {
    const traits = this.getTraits(report, edits);
    const psychomotor = this.getPsychomotor(report, edits);

    return `
      <section class="old-traits-grid">
        <div class="old-traits-table-box">
          <table class="old-traits-table">
            <thead>
              <tr>
                <th>AFFECTIVE TRAITS</th>
                <th>RATING</th>
              </tr>
            </thead>
            <tbody>
              ${traits.map((item) => `
                <tr>
                  <td>${this.escape(item.label)}</td>
                  <td>${this.ratingValue(item.value)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <div class="old-traits-table-box">
          <table class="old-traits-table">
            <thead>
              <tr>
                <th>PSYCHOMOTOR</th>
                <th>RATING</th>
              </tr>
            </thead>
            <tbody>
              ${psychomotor.map((item) => `
                <tr>
                  <td>${this.escape(item.label)}</td>
                  <td>${this.ratingValue(item.value)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <table class="old-scale-table">
            <tbody>
              <tr><td>SCALE</td></tr>
              <tr><td>6 - EXCEL</td></tr>
              <tr><td>5 - Excellent Degree of Observable Trait</td></tr>
              <tr><td>4 - Good Level of Observable Trait</td></tr>
              <tr><td>3 - Fair But Acceptable Level of Observable Trait</td></tr>
              <tr><td>2 - Poor Level of Observable Trait</td></tr>
              <tr><td>1 - No Observable Trait</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    `;
  },

  remarksSection(report, payload = {}, edits = {}) {
    const formTeacher = edits.form_teacher || payload.form_teacher || "Class Teacher";
    const teacherRemark = edits.teacher_remark || report.teacher_remark || this.teacherRemark(report.final_average);
    const principalRemark = edits.principal_remark || report.principal_remark || this.principalRemark(report.final_average);
    const nextTerm = edits.next_term || payload.next_term || "";

    return `
      <section class="old-report-remarks">
        <p>
          <span>FORM TEACHER:</span>
          <strong>${this.escape(formTeacher)}</strong>
        </p>

        <p>
          <span>FORM TEACHER'S REMARKS:</span>
          <strong>${this.escape(teacherRemark)}</strong>
        </p>

        <p>
          <span>PRINCIPAL'S REMARKS:</span>
          <strong>${this.escape(principalRemark)}</strong>
        </p>

        <p>
          <span>Next Term Begins:</span>
          <strong>${nextTerm ? this.escape(this.formatDate(nextTerm)) : "--"}</strong>
        </p>
      </section>
    `;
  },

  getTraits(report, edits = {}) {
    const saved = edits.affective || report.affective || {};

    return [
      { key: "punctuality", label: "PUNCTUALITY", value: saved.punctuality ?? 4 },
      { key: "attendance", label: "ATTENDANCE", value: saved.attendance ?? 4 },
      { key: "reliability", label: "RELIABILITY", value: saved.reliability ?? 4 },
      { key: "neatness", label: "NEATNESS", value: saved.neatness ?? 4 },
      { key: "politeness", label: "POLITENESS", value: saved.politeness ?? 4 },
      { key: "honesty", label: "HONESTY", value: saved.honesty ?? 4 },
      { key: "relationship", label: "RELATIONSHIP WITH OTHER STUDENTS", value: saved.relationship ?? 4 },
      { key: "self_control", label: "SELF CONTROL", value: saved.self_control ?? 4 },
      { key: "attentiveness", label: "ATTENTIVENESS", value: saved.attentiveness ?? 4 },
      { key: "perseverance", label: "PERSIVERANCE", value: saved.perseverance ?? 4 }
    ];
  },

  getPsychomotor(report, edits = {}) {
    const saved = edits.psychomotor || report.psychomotor || {};

    return [
      { key: "handwriting", label: "HANDWRITING", value: saved.handwriting ?? 4 },
      { key: "games", label: "GAMES", value: saved.games ?? 4 },
      { key: "sport", label: "SPORT", value: saved.sport ?? "" },
      { key: "drawing", label: "DRAWING & PAINTING", value: saved.drawing ?? 4 },
      { key: "crafts", label: "CRAFTS", value: saved.crafts ?? 4 },
      { key: "musical_skills", label: "MUSICAL SKILLS", value: saved.musical_skills ?? 4 }
    ];
  },

  ratingValue(value) {
    if (value === "" || value === null || value === undefined) return "";
    const num = Number(value);
    if (Number.isNaN(num)) return this.escape(value);
    return String(Math.max(1, Math.min(6, num)));
  },

  positionValue(row) {
    const value = row.position_text || row.position || "--";
    return this.escape(String(value).replace(/(st|nd|rd|th)$/i, ""));
  },

  outOfValue(row) {
    return row.out_of || row.outOf || row.subject_out_of || 0;
  },

  gradeClass(score) {
    score = Number(score || 0);
    if (score >= 70) return "score-good";
    if (score >= 45) return "score-average";
    return "score-fail";
  },

  commentForScore(score) {
    score = Number(score || 0);
    if (score >= 80) return "Excellent";
    if (score >= 70) return "Very good";
    if (score >= 60) return "Good";
    if (score >= 45) return "Pass";
    return "Fail";
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

  formatDate(value) {
    if (!value) return "--";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
  },

  num(value, fallback = "0.0") {
    const num = Number(value);
    if (Number.isNaN(num)) return fallback;
    return num.toFixed(1);
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