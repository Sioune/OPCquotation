import {
  BASE_DIMENSIONS,
  COEFFICIENTS,
  DEFAULT_STATE,
  LEVELS,
  MAINTENANCE_PACKAGES,
  calculateQuote,
  cloneDefaultState,
  createStructuredQuote,
  formatFactor,
  formatMoney
} from "./quoteModel.mjs";

const STORAGE_KEY = "opcQuoteCardState";
const EVENT_KEY = "opcQuoteCardEvents";

let state = loadState();

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...cloneDefaultState(), ...JSON.parse(saved) } : cloneDefaultState();
  } catch {
    return cloneDefaultState();
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function emitEvent(type) {
  const event = {
    type,
    at: new Date().toISOString(),
    quote: createStructuredQuote(state)
  };
  const events = JSON.parse(localStorage.getItem(EVENT_KEY) || "[]");
  events.push(event);
  localStorage.setItem(EVENT_KEY, JSON.stringify(events.slice(-50)));
}

function renderBaseRows() {
  const container = $("#baseRows");
  container.innerHTML = BASE_DIMENSIONS.map((dimension) => {
    const options = LEVELS.map((level) => {
      const id = `${dimension.id}-${level}`;
      const checked = state.baseLevels[dimension.id] === level ? "checked" : "";
      return `
        <label class="choice" title="${dimension.ranges[level]}">
          <input type="radio" name="${dimension.id}" value="${level}" ${checked} />
          <span>${level}</span>
        </label>
      `;
    }).join("");

    return `
      <fieldset class="dimension-row" data-dimension="${dimension.id}">
        <legend>
          <strong>${dimension.id} ${dimension.name}</strong>
          <span>${dimension.description}</span>
        </legend>
        <div class="segmented">${options}</div>
        <output class="line-price" data-price-for="${dimension.id}"></output>
      </fieldset>
    `;
  }).join("");

  $$("input[type='radio']", container).forEach((input) => {
    input.addEventListener("change", () => {
      state.baseLevels[input.name] = input.value;
      state.status = "draft";
      update();
    });
  });
}

function renderCoefficientRows() {
  const container = $("#coefficientRows");
  container.innerHTML = COEFFICIENTS.map((coefficient) => {
    const options = Object.entries(coefficient.values).map(([risk, item]) => {
      const checked = state.coefficients[coefficient.id] === risk ? "checked" : "";
      return `
        <label class="choice" title="${item.note}">
          <input type="radio" name="${coefficient.id}" value="${risk}" ${checked} />
          <span>${item.label}</span>
        </label>
      `;
    }).join("");

    return `
      <fieldset class="dimension-row coefficient-row" data-coefficient="${coefficient.id}">
        <legend>
          <strong>${coefficient.id} ${coefficient.name}</strong>
          <span>${coefficient.description}</span>
        </legend>
        <div class="segmented">${options}</div>
        <output class="line-price" data-factor-for="${coefficient.id}"></output>
      </fieldset>
    `;
  }).join("");

  $$("input[type='radio']", container).forEach((input) => {
    input.addEventListener("change", () => {
      state.coefficients[input.name] = input.value;
      state.status = "draft";
      update();
    });
  });
}

function renderMaintenanceOptions() {
  const container = $("#maintenanceOptions");
  container.innerHTML = Object.entries(MAINTENANCE_PACKAGES).map(([key, item]) => {
    const checked = state.maintenancePackage === key ? "checked" : "";
    const rateText = item.rate ? `${Math.round(item.rate * 100)}%` : "0%";
    return `
      <label class="choice">
        <input type="radio" name="maintenancePackage" value="${key}" ${checked} />
        <span>${item.label}<small>${rateText}</small></span>
      </label>
    `;
  }).join("");

  $$("input[type='radio']", container).forEach((input) => {
    input.addEventListener("change", () => {
      state.maintenancePackage = input.value;
      state.status = "draft";
      update();
    });
  });
}

function bindControls() {
  const adjustmentRange = $("#baseAdjustment");
  const adjustmentNumber = $("#baseAdjustmentNumber");
  const syncAdjustment = (value) => {
    const next = Math.max(-20, Math.min(20, Number(value) || 0));
    state.baseAdjustmentPercent = next;
    adjustmentRange.value = String(next);
    adjustmentNumber.value = String(next);
    state.status = "draft";
    update();
  };

  adjustmentRange.addEventListener("input", () => syncAdjustment(adjustmentRange.value));
  adjustmentNumber.addEventListener("input", () => syncAdjustment(adjustmentNumber.value));
  $("#adjustmentReason").addEventListener("input", (event) => {
    state.adjustmentReason = event.target.value;
    state.status = "draft";
    update();
  });

  $("#escrowEnabled").addEventListener("change", (event) => {
    state.escrowEnabled = event.target.checked;
    state.status = "draft";
    update();
  });
  $("#escrowRate").addEventListener("change", (event) => {
    state.escrowRate = Number(event.target.value);
    state.status = "draft";
    update();
  });
  $("#milestoneEnabled").addEventListener("change", (event) => {
    state.milestoneEnabled = event.target.checked;
    state.status = "draft";
    update();
  });
  $("#milestoneRate").addEventListener("input", (event) => {
    state.milestoneRate = Number(event.target.value);
    state.status = "draft";
    update();
  });
  $("#revenueShareEnabled").addEventListener("change", (event) => {
    state.revenueShareEnabled = event.target.checked;
    state.status = "draft";
    update();
  });
  $("#revenueShareRate").addEventListener("input", (event) => {
    state.revenueShareRate = Number(event.target.value);
    state.status = "draft";
    update();
  });
  $("#revenueShareMonths").addEventListener("change", (event) => {
    state.revenueShareMonths = Number(event.target.value);
    state.status = "draft";
    update();
  });
  $("#deliveryWeeks").addEventListener("input", (event) => {
    state.deliveryWeeks = Number(event.target.value);
    state.status = "draft";
    update();
  });
  $("#trustScore").addEventListener("change", (event) => {
    state.trustScore = Number(event.target.value);
    state.status = "draft";
    update();
  });

  $("#saveDraft").addEventListener("click", () => {
    persistState();
    emitEvent("draft_saved");
    showToast("草稿已保存");
  });

  $("#submitQuote").addEventListener("click", () => {
    const hasAdjustment = Number(state.baseAdjustmentPercent) !== 0;
    if (hasAdjustment && !state.adjustmentReason.trim()) {
      $("#adjustmentReason").focus();
      showToast("请填写微调原因");
      return;
    }
    state.status = "submitted";
    persistState();
    emitEvent("quote_submitted");
    showToast("报价已提交");
    update();
  });

  $("#resetDraft").addEventListener("click", () => {
    state = cloneDefaultState();
    localStorage.removeItem(STORAGE_KEY);
    render();
    emitEvent("draft_reset");
    showToast("已恢复默认报价");
  });

  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });
}

function update() {
  const totals = calculateQuote(state);

  for (const line of totals.baseLines) {
    const output = $(`[data-price-for="${line.id}"]`);
    if (output) output.textContent = formatMoney(line.price);
  }
  for (const line of totals.factorLines) {
    const output = $(`[data-factor-for="${line.id}"]`);
    if (output) output.textContent = formatFactor(line.factor);
  }

  $("#baseSubtotal").textContent = formatMoney(totals.rawBase);
  $("#factorProduct").textContent = formatFactor(totals.factorProduct);
  $("#optionalSubtotal").textContent = `+${formatMoney(totals.maintenanceFee)}`;
  $("#maintenanceFee").textContent = `+${formatMoney(totals.maintenanceFee)}`;
  $("#escrowAmount").textContent = state.escrowEnabled ? `托管 ${formatMoney(totals.escrowAmount)}` : "不托管";
  $("#milestonePotential").textContent = state.milestoneEnabled ? `达成后 +${formatMoney(totals.milestonePotential)}` : "未启用";

  $("#finalPrice").textContent = formatMoney(totals.finalPrice);
  $("#receiptBase").textContent = formatMoney(totals.rawBase);
  $("#receiptCalibratedBase").textContent = formatMoney(totals.calibratedBase);
  $("#receiptAdjusted").textContent = formatMoney(totals.adjustedPrice);
  $("#receiptMaintenance").textContent = formatMoney(totals.maintenanceFee);
  $("#receiptEscrow").textContent = formatMoney(totals.escrowAmount);
  $("#warrantyMonths").textContent = totals.warrantyMonths ? `${totals.warrantyMonths} 个月` : "按验收";
  $("#recommendationDots").textContent = dots(totals.recommendation);
  $("#structuredSummary").textContent = JSON.stringify(createStructuredQuote(state), null, 2);

  $("#baseAdjustment").value = String(totals.adjustmentPercent);
  $("#baseAdjustmentNumber").value = String(totals.adjustmentPercent);
  $("#adjustmentReason").value = state.adjustmentReason;
  $("#escrowEnabled").checked = state.escrowEnabled;
  $("#escrowRate").value = String(state.escrowRate);
  $("#milestoneEnabled").checked = state.milestoneEnabled;
  $("#milestoneRate").value = String(state.milestoneRate);
  $("#revenueShareEnabled").checked = state.revenueShareEnabled;
  $("#revenueShareRate").value = String(state.revenueShareRate);
  $("#revenueShareMonths").value = String(state.revenueShareMonths);
  $("#deliveryWeeks").value = String(state.deliveryWeeks);
  $("#trustScore").value = String(state.trustScore);

  renderCompareTable(totals);
}

function renderCompareTable(currentTotals) {
  const competitors = [
    {
      name: "OPC-A",
      base: currentTotals.rawBase,
      factor: currentTotals.factorProduct,
      optional: currentTotals.maintenanceFee,
      final: currentTotals.finalPrice,
      weeks: Number(state.deliveryWeeks),
      trust: Number(state.trustScore),
      recommendation: currentTotals.recommendation
    },
    {
      name: "OPC-B",
      base: 18000,
      factor: 1.21,
      optional: 3600,
      final: 25380,
      weeks: 2,
      trust: 5,
      recommendation: 5
    },
    {
      name: "OPC-C",
      base: 14000,
      factor: 0.95,
      optional: 1400,
      final: 14700,
      weeks: 5,
      trust: 2,
      recommendation: 2
    }
  ];

  const rows = [
    ["基准层", (item) => formatMoney(item.base)],
    ["调整层系数", (item) => formatFactor(item.factor)],
    ["维护 + 可选", (item) => `+${formatMoney(item.optional)}`],
    ["最终报价", (item) => formatMoney(item.final)],
    ["交付周期", (item) => `${item.weeks} 周`],
    ["信任档案", (item) => stars(item.trust)],
    ["平台推荐度", (item) => dots(item.recommendation)]
  ];

  $("#compareTable").innerHTML = `
    <thead>
      <tr>
        <th>需求 #20260509-0087</th>
        ${competitors.map((item) => `<th>${item.name}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${rows.map(([label, getter]) => `
        <tr>
          <th>${label}</th>
          ${competitors.map((item) => `<td>${getter(item)}</td>`).join("")}
        </tr>
      `).join("")}
    </tbody>
  `;
}

function switchTab(tabName) {
  $$(".tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === tabName));
  $$(".view").forEach((view) => view.classList.toggle("is-active", view.dataset.view === tabName));
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function stars(value) {
  const full = Math.max(1, Math.min(5, Number(value) || 1));
  return `${"★".repeat(full)}${"☆".repeat(5 - full)}`;
}

function dots(value) {
  const full = Math.max(1, Math.min(5, Number(value) || 1));
  return `${"●".repeat(full)}${"○".repeat(5 - full)}`;
}

function render() {
  renderBaseRows();
  renderCoefficientRows();
  renderMaintenanceOptions();
  update();
}

render();
bindControls();
