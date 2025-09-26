/* =========================================================
   Räknesnurra – Rak amortering + Utökat beräkningsläge
   Funktionalitet för:
   - Validering av indata
   - Beräkning av amorteringsplan (antingen via löptid eller fast amortering per period)
   - Lika fördelning mellan deltagare (inga procent)
   - Diagram (skuld & betalningskomponenter)
   - Export av amorteringsplan till CSV
   - Visning i kronor eller tusen kronor (tsek)
   ========================================================= */

(() => {
  "use strict";

  /* ----------------------------- Konstanter ----------------------------- */

  const FREQUENCIES = {
    monthly: { periodsPerYear: 12, label: "Månadsvis" },
    quarterly: { periodsPerYear: 4, label: "Kvartalsvis" },
    semiannual: { periodsPerYear: 2, label: "Halvår" },
    annual: { periodsPerYear: 1, label: "Årsvis" },
  };

  const MAX_YEARS = 50;

  /* ----------------------------- DOM Element ---------------------------- */

  const els = {
    form: document.getElementById("loan-form"),
    projectCost: document.getElementById("projectCost"),
    downPayment: document.getElementById("downPayment"),
    interestRate: document.getElementById("interestRate"),
    termYears: document.getElementById("termYears"),
    frequency: document.getElementById("frequency"),
    displayModeTsek: document.getElementById("displayModeTsek"),
    payerCount: document.getElementById("payerCount"),
    // Nya element för beräkningsläge
    calcModeByTerm: document.getElementById("calcModeByTerm"),
    calcModeByPrincipal: document.getElementById("calcModeByPrincipal"),
    amortPerPeriod: document.getElementById("amortPerPeriod"),
    termYearsField: document.getElementById("termYearsField"),
    amortPerPeriodField: document.getElementById("amortPerPeriodField"),
    calculateBtn: document.getElementById("calculateBtn"),
    resetBtn: document.getElementById("resetBtn"),
    validationMessages: document.getElementById("validationMessages"),

    // Summary
    loanAmountDisplay: document.getElementById("loanAmountDisplay"),
    periodCountDisplay: document.getElementById("periodCountDisplay"),
    principalPerPeriodDisplay: document.getElementById(
      "principalPerPeriodDisplay",
    ),
    firstInterestDisplay: document.getElementById("firstInterestDisplay"),
    firstPaymentDisplay: document.getElementById("firstPaymentDisplay"),
    totalInterestDisplay: document.getElementById("totalInterestDisplay"),
    totalPaidDisplay: document.getElementById("totalPaidDisplay"),

    // Schedule / table
    toggleScheduleBtn: document.getElementById("toggleScheduleBtn"),
    exportCsvBtn: document.getElementById("exportCsvBtn"),
    scheduleWrapper: document.getElementById("scheduleWrapper"),
    scheduleTable: document.getElementById("scheduleTable"),

    // Charts
    balanceChartCanvas: document.getElementById("balanceChart"),
    paymentChartCanvas: document.getElementById("paymentChart"),
  };

  /* -------------------------- Intern applikationstate -------------------------- */

  const state = {
    schedule: [],
    annualRows: [], // Årsaggregerade rader (beräknas vid varje kalkyl)
    charts: {
      balance: null,
      payment: null,
    },
    displayModeTsek: false,
    calcMode: "byTerm", // "byTerm" | "byPrincipalPerPeriod"
  };

  /* ----------------------------- Hjälpfunktioner ----------------------------- */

  function numberFromInput(el) {
    if (!el) return 0;
    const v = parseFloat(String(el.value).replace(",", "."));
    return isFinite(v) ? v : 0;
  }

  function formatNumber(value, options = {}) {
    const nf = new Intl.NumberFormat("sv-SE", {
      minimumFractionDigits: options.minimumFractionDigits ?? 2,
      maximumFractionDigits: options.maximumFractionDigits ?? 2,
    });
    return nf.format(value);
  }

  function formatMoney(value) {
    if (state.displayModeTsek) {
      return `${formatNumber(value / 1000)} tsek`;
    }
    return `${formatNumber(value)} kr`;
  }

  function clearChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function showErrors(errors) {
    clearChildren(els.validationMessages);
    errors.forEach((msg) => {
      const div = document.createElement("div");
      div.className = "error";
      div.textContent = msg;
      els.validationMessages.appendChild(div);
    });
  }

  function validateInputs() {
    const errors = [];
    const mode =
      els.calcModeByPrincipal && els.calcModeByPrincipal.checked
        ? "byPrincipalPerPeriod"
        : "byTerm";
    state.calcMode = mode;

    const projectCost = numberFromInput(els.projectCost);
    const downPayment = numberFromInput(els.downPayment);
    const rate = numberFromInput(els.interestRate);
    const years = numberFromInput(els.termYears);
    const payerCount = getPayerCount();
    const amortPerPeriod = numberFromInput(els.amortPerPeriod);

    if (projectCost <= 0) errors.push("Projektkostnad måste vara större än 0.");
    if (downPayment < 0) errors.push("Handpenning kan inte vara negativ.");
    if (downPayment >= projectCost && projectCost > 0)
      errors.push(
        "Handpenningen kan inte vara större än eller lika med projektkostnaden.",
      );
    if (rate < 0) errors.push("Räntan kan inte vara negativ.");
    if (mode === "byTerm") {
      if (years <= 0 || years > MAX_YEARS)
        errors.push(`Löptiden måste vara mellan 1 och ${MAX_YEARS} år.`);
    } else if (mode === "byPrincipalPerPeriod") {
      if (amortPerPeriod <= 0)
        errors.push("Amortering per period måste vara större än 0.");
    }
    if (payerCount < 1) errors.push("Minst en betalare krävs.");

    return { valid: errors.length === 0, errors };
  }

  function calculateSchedule({ principal, annualRate, years, periodsPerYear }) {
    const totalPeriods = Math.round(years * periodsPerYear);
    if (totalPeriods <= 0) return [];

    const ratePerPeriod = annualRate / 100 / periodsPerYear;
    const basePrincipal = principal / totalPeriods;

    const schedule = [];
    let balance = principal;

    for (let period = 1; period <= totalPeriods; period++) {
      const interest = ratePerPeriod > 0 ? balance * ratePerPeriod : 0;
      let principalPayment = basePrincipal;

      if (period === totalPeriods) {
        principalPayment = balance; // stäng lånet exakt
      }

      const payment = principalPayment + interest;
      const endBalance = balance - principalPayment;

      schedule.push({
        period,
        balanceStart: balance,
        principal: principalPayment,
        interest,
        payment,
        balanceEnd: Math.max(0, endBalance),
      });

      balance = endBalance;
    }

    return schedule;
  }

  // Ny funktion: schema via fast amortering per period
  function calculateScheduleFixedPrincipal({
    principal,
    annualRate,
    amortPerPeriod,
    periodsPerYear,
  }) {
    if (amortPerPeriod <= 0)
      return { schedule: [], meta: { error: "INVALID_AMORT" } };
    if (amortPerPeriod >= principal) {
      const interest = principal * (annualRate / 100 / periodsPerYear);
      return {
        schedule: [
          {
            period: 1,
            balanceStart: principal,
            principal: principal,
            interest,
            payment: principal + interest,
            balanceEnd: 0,
          },
        ],
        meta: {
          periods: 1,
          derivedYears: 1 / periodsPerYear,
          lastPrincipal: principal,
        },
      };
    }
    const ratePerPeriod = annualRate / 100 / periodsPerYear;
    const rawPeriods = Math.ceil(principal / amortPerPeriod);
    const derivedYears = rawPeriods / periodsPerYear;
    if (derivedYears > MAX_YEARS) {
      return {
        schedule: [],
        meta: { error: "TOO_LONG", derivedYears, rawPeriods },
      };
    }
    const schedule = [];
    let balance = principal;
    for (let p = 1; p <= rawPeriods; p++) {
      const interest = ratePerPeriod > 0 ? balance * ratePerPeriod : 0;
      const principalPayment = p === rawPeriods ? balance : amortPerPeriod;
      const payment = principalPayment + interest;
      const end = balance - principalPayment;
      schedule.push({
        period: p,
        balanceStart: balance,
        principal: principalPayment,
        interest,
        payment,
        balanceEnd: end < 1e-8 ? 0 : end,
      });
      balance = end;
    }
    return {
      schedule,
      meta: {
        periods: schedule.length,
        derivedYears,
        lastPrincipal: schedule[schedule.length - 1].principal,
      },
    };
  }
  function summarizeSchedule(schedule) {
    if (!schedule.length) {
      return {
        totalInterest: 0,
        totalPaid: 0,
        firstInterest: 0,
        firstPayment: 0,
        principalPerPeriod: 0,
      };
    }
    const totalInterest = schedule.reduce((a, r) => a + r.interest, 0);
    const totalPaid = schedule.reduce((a, r) => a + r.payment, 0);
    const firstInterest = schedule[0].interest;
    const firstPayment = schedule[0].payment;
    const principalPerPeriod = schedule[0].principal;
    return {
      totalInterest,
      totalPaid,
      firstInterest,
      firstPayment,
      principalPerPeriod,
    };
  }

  function renderSummary({
    principal,
    schedule,
    summary,
    periodsPerYear,
    mode,
    amortPerPeriod,
    fixedMeta,
  }) {
    els.loanAmountDisplay.textContent = formatMoney(principal);
    els.periodCountDisplay.textContent = schedule.length.toString();
    if (mode === "byTerm") {
      els.principalPerPeriodDisplay.textContent = formatMoney(
        summary.principalPerPeriod,
      );
    } else if (mode === "byPrincipalPerPeriod") {
      els.principalPerPeriodDisplay.textContent = amortPerPeriod
        ? formatMoney(amortPerPeriod)
        : "–";
    }
    els.firstInterestDisplay.textContent = formatMoney(summary.firstInterest);
    els.firstPaymentDisplay.textContent = formatMoney(summary.firstPayment);
    els.totalInterestDisplay.textContent = formatMoney(summary.totalInterest);
    els.totalPaidDisplay.textContent = formatMoney(summary.totalPaid);
    // Nya fält för fast amorteringsläge
    const derivedPeriodCountDisplay = document.getElementById(
      "derivedPeriodCountDisplay",
    );
    const derivedYearsDisplay = document.getElementById("derivedYearsDisplay");
    const lastPrincipalDisplay = document.getElementById(
      "lastPrincipalDisplay",
    );
    if (mode === "byPrincipalPerPeriod" && fixedMeta) {
      if (derivedPeriodCountDisplay)
        derivedPeriodCountDisplay.textContent = fixedMeta.periods ?? "–";
      if (derivedYearsDisplay)
        derivedYearsDisplay.textContent =
          fixedMeta.derivedYears != null
            ? formatNumber(fixedMeta.derivedYears, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 2,
              })
            : "–";
      if (lastPrincipalDisplay)
        lastPrincipalDisplay.textContent = formatMoney(fixedMeta.lastPrincipal);
    } else {
      if (derivedPeriodCountDisplay)
        derivedPeriodCountDisplay.textContent = "–";
      if (derivedYearsDisplay) derivedYearsDisplay.textContent = "–";
      if (lastPrincipalDisplay) lastPrincipalDisplay.textContent = "–";
    }

    // Lika fördelning – beräkna år 1 samt per period
    const payerCount = getPayerCount();
    const firstYearPeriods = schedule.slice(0, periodsPerYear);
    const firstYearTotal = firstYearPeriods.reduce((a, r) => a + r.payment, 0);

    const yearlyTotalEl = document.getElementById("yearlyTotalDisplay");
    const yearlyPerParticipantEl = document.getElementById(
      "yearlyPerParticipantDisplay",
    );
    const periodPerParticipantEl = document.getElementById(
      "periodPerParticipantDisplay",
    );

    if (yearlyTotalEl) {
      yearlyTotalEl.textContent = firstYearPeriods.length
        ? formatMoney(firstYearTotal)
        : "–";
    }
    if (yearlyPerParticipantEl) {
      yearlyPerParticipantEl.textContent =
        firstYearPeriods.length && payerCount > 0
          ? formatMoney(firstYearTotal / payerCount)
          : "–";
    }
    if (periodPerParticipantEl) {
      periodPerParticipantEl.textContent =
        schedule.length && payerCount > 0
          ? formatMoney(summary.firstPayment / payerCount)
          : "–";
    }
  }

  function renderScheduleTable(schedule) {
    const tbody = els.scheduleTable.querySelector("tbody");
    clearChildren(tbody);

    const fragment = document.createDocumentFragment();
    schedule.forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td>${row.period}</td>
                <td>${formatMoney(row.balanceStart)}</td>
                <td>${formatMoney(row.principal)}</td>
                <td>${formatMoney(row.interest)}</td>
                <td>${formatMoney(row.payment)}</td>
                <td>${formatMoney(row.balanceEnd)}</td>
            `;
      fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
  }

  function destroyCharts() {
    if (state.charts.balance) {
      state.charts.balance.destroy();
      state.charts.balance = null;
    }
    if (state.charts.payment) {
      state.charts.payment.destroy();
      state.charts.payment = null;
    }
  }

  function buildCharts(schedule) {
    if (typeof window === "undefined" || typeof window.Chart === "undefined") {
      return;
    }
    if (!schedule.length) {
      destroyCharts();
      return;
    }

    destroyCharts();

    const labels = schedule.map((r) => r.period);
    const balances = schedule.map((r) => r.balanceEnd);
    const interests = schedule.map((r) => r.interest);
    const principals = schedule.map((r) => r.principal);

    state.charts.balance = new Chart(els.balanceChartCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Skuld",
            data: balances,
            borderColor: "#3d8bfd",
            backgroundColor: "rgba(61,139,253,0.15)",
            tension: 0.15,
            fill: true,
            pointRadius: 0,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: { labels: { color: "#b6c2cc", font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => `Saldo: ${formatMoney(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#8896a1", maxRotation: 0 },
            grid: { display: false },
          },
          y: {
            ticks: {
              color: "#8896a1",
              callback: (v) =>
                state.displayModeTsek
                  ? formatNumber(v / 1000, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })
                  : formatNumber(v, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }),
            },
            grid: { color: "rgba(255,255,255,0.05)" },
          },
        },
      },
    });

    state.charts.payment = new Chart(els.paymentChartCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            type: "bar",
            label: "Ränta",
            data: interests,
            backgroundColor: "#ffb347",
            borderWidth: 0,
            stack: "stack1",
          },
          {
            type: "bar",
            label: "Amortering",
            data: principals,
            backgroundColor: "#3fbf77",
            borderWidth: 0,
            stack: "stack1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: { labels: { color: "#b6c2cc", font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${ctx.dataset.label}: ${formatMoney(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            ticks: { color: "#8896a1", maxRotation: 0 },
            grid: { display: false },
          },
          y: {
            stacked: true,
            ticks: {
              color: "#8896a1",
              callback: (v) =>
                state.displayModeTsek
                  ? formatNumber(v / 1000, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })
                  : formatNumber(v, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }),
            },
            grid: { color: "rgba(255,255,255,0.05)" },
          },
        },
      },
    });
  }

  function exportCsv(schedule, meta) {
    if (!schedule.length) return;

    const header = [
      "Period",
      "Saldo start",
      "Amortering",
      "Ränta",
      "Betalning",
      "Saldo slut",
    ];

    const rows = [header.join(";")];

    schedule.forEach((r) => {
      rows.push(
        [
          r.period,
          formatNumber(r.balanceStart, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          formatNumber(r.principal, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          formatNumber(r.interest, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          formatNumber(r.payment, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          formatNumber(r.balanceEnd, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        ].join(";"),
      );
    });

    rows.push("");
    rows.push(`Lånebelopp;${formatNumber(meta.principal)}`);
    rows.push(`Total ränta;${formatNumber(meta.totalInterest)}`);
    rows.push(`Total återbetalt;${formatNumber(meta.totalPaid)}`);
    rows.push(`Löptid (år);${meta.years}`);
    rows.push(`Perioder;${schedule.length}`);
    rows.push(`Frekvens;${meta.frequencyLabel}`);

    const csvContent = "\uFEFF" + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "amorteringsplan.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function getPayerCount() {
    return Math.max(1, Math.min(250, Number(els.payerCount.value) || 1));
  }

  function recalcAndRender() {
    function persistRawInputs(extra = {}) {
      try {
        const payload = {
          projectCost: numberFromInput(els.projectCost),
          downPayment: numberFromInput(els.downPayment),
          interestRate: numberFromInput(els.interestRate),
          termYears: numberFromInput(els.termYears),
          frequency: els.frequency.value,
          displayModeTsek: !!els.displayModeTsek.checked,
          payerCount: getPayerCount(),
          timestamp: Date.now(),
          ...extra,
        };
        localStorage.setItem("raknesnurra-inputs", JSON.stringify(payload));
      } catch {
        /* Ignorera lagringsfel */
      }
    }

    const validation = validateInputs();
    const mode = state.calcMode;
    if (!validation.valid) {
      showErrors(validation.errors);
      state.schedule = [];
      destroyCharts();
      renderSummary({
        principal: 0,
        schedule: [],
        summary: summarizeSchedule([]),
        periodsPerYear: 0,
      });
      renderScheduleTable([]);
      persistRawInputs({ valid: false });
      return;
    }
    showErrors([]);

    state.displayModeTsek = !!els.displayModeTsek.checked;

    const projectCost = numberFromInput(els.projectCost);
    const downPayment = numberFromInput(els.downPayment);
    const interestRate = numberFromInput(els.interestRate);
    const years = numberFromInput(els.termYears);
    const frequencyKey = els.frequency.value;
    const frequency = FREQUENCIES[frequencyKey];
    const amortPerPeriod = numberFromInput(els.amortPerPeriod);

    const principal = projectCost - downPayment;
    let schedule;
    let fixedMeta = null;
    if (mode === "byTerm") {
      schedule = calculateSchedule({
        principal,
        annualRate: interestRate,
        years,
        periodsPerYear: frequency.periodsPerYear,
      });
    } else {
      const result = calculateScheduleFixedPrincipal({
        principal,
        annualRate: interestRate,
        amortPerPeriod,
        periodsPerYear: frequency.periodsPerYear,
      });
      if (result.meta && result.meta.error === "TOO_LONG") {
        showErrors([
          `Det angivna amorteringsbeloppet ger en löptid på ca ${formatNumber(
            result.meta.derivedYears,
            { minimumFractionDigits: 1, maximumFractionDigits: 1 },
          )} år vilket överskrider max ${MAX_YEARS}. Öka beloppet eller byt läge.`,
        ]);
        state.schedule = [];
        destroyCharts();
        renderSummary({
          principal: 0,
          schedule: [],
          summary: summarizeSchedule([]),
          periodsPerYear: 0,
          mode,
          amortPerPeriod,
          fixedMeta: null,
        });
        renderScheduleTable([]);
        return;
      }
      schedule = result.schedule;
      fixedMeta = result.meta;
    }

    state.schedule = schedule;
    const summary = summarizeSchedule(schedule);

    renderSummary({
      principal,
      schedule,
      summary,
      periodsPerYear: frequency.periodsPerYear,
      mode,
      amortPerPeriod,
      fixedMeta,
    });
    renderScheduleTable(schedule);
    buildCharts(schedule);

    persistRawInputs({
      valid: true,
      principal,
      totalInterest: summary.totalInterest,
      totalPaid: summary.totalPaid,
      periods: schedule.length,
      model: "rak",
      mode,
      amortPerPeriod: mode === "byPrincipalPerPeriod" ? amortPerPeriod : null,
    });

    document.dispatchEvent(
      new CustomEvent("loan-calculated", {
        detail: { principal, schedule, summary, frequency: frequencyKey },
      }),
    );
  }

  function toggleSchedule() {
    els.scheduleWrapper.classList.toggle("collapsed");
  }

  function attachEvents() {
    els.payerCount.addEventListener("input", () => {
      if (state.schedule.length) recalcAndRender();
    });
    if (els.calcModeByTerm && els.calcModeByPrincipal) {
      const updateModeUI = () => {
        const mode = els.calcModeByPrincipal.checked
          ? "byPrincipalPerPeriod"
          : "byTerm";
        state.calcMode = mode;
        if (els.termYearsField)
          els.termYearsField.classList.toggle("hidden", mode !== "byTerm");
        if (els.amortPerPeriodField)
          els.amortPerPeriodField.classList.toggle(
            "hidden",
            mode !== "byPrincipalPerPeriod",
          );
        // Rensa derived fält om byte
        if (state.schedule.length) recalcAndRender();
      };
      els.calcModeByTerm.addEventListener("change", updateModeUI);
      els.calcModeByPrincipal.addEventListener("change", updateModeUI);
    }
    if (els.amortPerPeriod) {
      els.amortPerPeriod.addEventListener("change", () => {
        if (state.schedule.length || state.calcMode === "byPrincipalPerPeriod")
          recalcAndRender();
      });
    }

    els.displayModeTsek.addEventListener("change", () => {
      if (state.schedule.length) recalcAndRender();
    });

    els.calculateBtn.addEventListener("click", () => {
      recalcAndRender();
    });

    els.form.addEventListener("submit", (e) => {
      e.preventDefault();
      recalcAndRender();
    });

    els.resetBtn.addEventListener("click", () => {
      setTimeout(() => {
        state.schedule = [];
        state.annualRows = [];
        destroyCharts();
        showErrors([]);
        clearSummaryDisplays();
        renderScheduleTable([]);
        renderAnnualOverview([], getPayerCount());
        const details = document.getElementById("annualDetails");
        if (details) {
          details.classList.add("hidden");
          details.innerHTML = "";
        }
      }, 0);
    });

    els.toggleScheduleBtn.addEventListener("click", () => {
      toggleSchedule();
    });

    els.exportCsvBtn.addEventListener("click", () => {
      if (!state.schedule.length) return;
      const principal =
        numberFromInput(els.projectCost) - numberFromInput(els.downPayment);
      const interestRate = numberFromInput(els.interestRate);
      const years = numberFromInput(els.termYears);
      const frequency = FREQUENCIES[els.frequency.value];
      const summary = summarizeSchedule(state.schedule);
      exportCsv(state.schedule, {
        principal,
        totalInterest: summary.totalInterest,
        totalPaid: summary.totalPaid,
        years,
        interestRate,
        frequencyLabel: frequency.label,
      });
    });

    [
      "projectCost",
      "downPayment",
      "interestRate",
      "termYears",
      "frequency",
    ].forEach((id) => {
      const input = els[id];
      input.addEventListener("change", () => {
        if (state.schedule.length) recalcAndRender();
      });
    });
  }

  function clearSummaryDisplays() {
    [
      "loanAmountDisplay",
      "periodCountDisplay",
      "principalPerPeriodDisplay",
      "firstInterestDisplay",
      "firstPaymentDisplay",
      "totalInterestDisplay",
      "totalPaidDisplay",
      "yearlyTotalDisplay",
      "yearlyPerParticipantDisplay",
      "periodPerParticipantDisplay",
      "derivedPeriodCountDisplay",
      "derivedYearsDisplay",
      "lastPrincipalDisplay",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = "–";
    });
  }

  function initDefaults() {
    let restored = false;
    try {
      const savedRaw = localStorage.getItem("raknesnurra-inputs");
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (saved && typeof saved === "object") {
          if (Number.isFinite(saved.projectCost))
            els.projectCost.value = saved.projectCost;
          if (Number.isFinite(saved.downPayment))
            els.downPayment.value = saved.downPayment;
          if (Number.isFinite(saved.interestRate))
            els.interestRate.value = saved.interestRate;
          if (Number.isFinite(saved.termYears))
            els.termYears.value = saved.termYears;
          if (saved.frequency && FREQUENCIES[saved.frequency])
            els.frequency.value = saved.frequency;
          if (typeof saved.displayModeTsek === "boolean")
            els.displayModeTsek.checked = saved.displayModeTsek;
          if (
            Number.isFinite(saved.payerCount) &&
            saved.payerCount >= 1 &&
            saved.payerCount <= 250
          ) {
            els.payerCount.value = saved.payerCount;
          }
          if (saved.mode === "byPrincipalPerPeriod") {
            if (els.calcModeByPrincipal) els.calcModeByPrincipal.checked = true;
            state.calcMode = "byPrincipalPerPeriod";
          } else {
            if (els.calcModeByTerm) els.calcModeByTerm.checked = true;
            state.calcMode = "byTerm";
          }
          if (
            Number.isFinite(saved.amortPerPeriod) &&
            saved.amortPerPeriod > 0 &&
            els.amortPerPeriod
          ) {
            els.amortPerPeriod.value = saved.amortPerPeriod;
          }
          restored = true;
        }
      }
    } catch {
      /* Ignorera */
    }

    if (!restored) {
      if (!els.projectCost.value) els.projectCost.value = 7000000;
      if (!els.downPayment.value) els.downPayment.value = 500000;
      if (!els.interestRate.value) els.interestRate.value = 3.0;
      if (!els.termYears.value) els.termYears.value = 25;
    }

    clearSummaryDisplays();
  }

  /* ---------------- Årsaggregering & expanderbar perioddetalj ---------------- */
  function aggregateAnnual(schedule, periodsPerYear, payerCount) {
    if (!schedule.length || periodsPerYear <= 0) return [];
    const years = new Map();
    schedule.forEach((row) => {
      const yearIndex = Math.ceil(row.period / periodsPerYear); // 1-baserat år
      if (!years.has(yearIndex)) {
        years.set(yearIndex, {
          yearIndex,
          interest: 0,
          principal: 0,
          total: 0,
          remainingEnd: 0,
          periods: [],
        });
      }
      const yr = years.get(yearIndex);
      yr.interest += row.interest;
      yr.principal += row.principal;
      yr.total += row.payment;
      yr.remainingEnd = row.balanceEnd;
      yr.periods.push({
        period: row.period,
        interest: row.interest,
        principal: row.principal,
        payment: row.payment,
      });
    });
    return Array.from(years.values()).map((yr) => ({
      ...yr,
      perParticipantYear: payerCount > 0 ? yr.total / payerCount : yr.total,
    }));
  }

  function renderAnnualOverview(annualRows, payerCount) {
    const table = document.getElementById("annualTable");
    if (!table) return;
    const tbody = table.querySelector("tbody");
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

    if (!annualRows.length) {
      const tr = document.createElement("tr");
      tr.innerHTML =
        '<td colspan="7" style="text-align:center;opacity:0.7;">Inga data ännu</td>';
      tbody.appendChild(tr);
      return;
    }

    annualRows.forEach((r) => {
      const tr = document.createElement("tr");
      tr.dataset.yearIndex = String(r.yearIndex);
      tr.className = "annual-row";
      tr.innerHTML = `
        <td>${r.yearIndex}</td>
        <td>${formatMoney(r.total)}</td>
        <td>${formatMoney(r.interest)}</td>
        <td>${formatMoney(r.principal)}</td>
        <td>${formatMoney(r.remainingEnd)}</td>
        <td>${formatMoney(r.perParticipantYear)}</td>
        <td><button type="button" class="small secondary" data-year-btn="${r.yearIndex}">Visa</button></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderAnnualDetails(yearRow) {
    const wrap = document.getElementById("annualDetails");
    if (!wrap) return;
    wrap.classList.remove("hidden");
    const payerCount = getPayerCount();
    const periodsPerYear = yearRow.periods.length; // kan vara mindre sista året

    const rows = yearRow.periods
      .map((p) => {
        const perPart = payerCount > 0 ? p.payment / payerCount : p.payment;
        return `
          <tr>
            <td>${p.period}</td>
            <td>${formatMoney(p.payment)}</td>
            <td>${formatMoney(p.interest)}</td>
            <td>${formatMoney(p.principal)}</td>
            <td>${formatMoney(perPart)}</td>
          </tr>
        `;
      })
      .join("");

    wrap.innerHTML = `
      <h3>Detaljer för år ${yearRow.yearIndex}</h3>
      <table class="sub-table">
        <thead>
          <tr>
            <th>Period</th>
            <th>Total</th>
            <th>Ränta</th>
            <th>Amortering</th>
            <th>Per deltagare</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <th>Summa</th>
            <th>${formatMoney(yearRow.total)}</th>
            <th>${formatMoney(yearRow.interest)}</th>
            <th>${formatMoney(yearRow.principal)}</th>
            <th>${formatMoney(yearRow.perParticipantYear)}</th>
          </tr>
        </tfoot>
      </table>
    `;
  }

  // Lyssna på befintlig händelse och bygg årsöversikt
  document.addEventListener("loan-calculated", (e) => {
    const { schedule, frequency } = e.detail;
    const freqObj = FREQUENCIES[frequency];
    if (!freqObj) return;
    const payerCount = getPayerCount();
    state.annualRows = aggregateAnnual(
      schedule,
      freqObj.periodsPerYear,
      payerCount,
    );
    renderAnnualOverview(state.annualRows, payerCount);
    // Rensa detaljdelen vid ny beräkning
    const details = document.getElementById("annualDetails");
    if (details) {
      details.classList.add("hidden");
      details.innerHTML = "";
    }
  });

  // Delegation för att visa detaljer
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-year-btn]");
    if (!btn) return;
    const yearIndex = Number(btn.getAttribute("data-year-btn"));
    const yr = state.annualRows.find((r) => r.yearIndex === yearIndex);
    if (yr) renderAnnualDetails(yr);
  });

  function init() {
    initDefaults();
    attachEvents();
    // Initiera UI för valt läge
    if (els.calcModeByPrincipal && els.calcModeByPrincipal.checked) {
      if (els.termYearsField) els.termYearsField.classList.add("hidden");
      if (els.amortPerPeriodField)
        els.amortPerPeriodField.classList.remove("hidden");
    }
    // Init tom årsöversikt
    renderAnnualOverview([], getPayerCount());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
