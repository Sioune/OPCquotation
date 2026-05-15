export const LEVELS = ["S", "M", "L", "XL"];

export const BASE_DIMENSIONS = [
  {
    id: "D1",
    name: "页面/屏数",
    description: "独立视图数",
    ranges: { S: "1-3", M: "4-10", L: "11-25", XL: "25+" },
    prices: { S: 2000, M: 6000, L: 15000, XL: 35000 }
  },
  {
    id: "D2",
    name: "数据模型数",
    description: "核心业务实体数",
    ranges: { S: "1-2", M: "3-6", L: "7-15", XL: "15+" },
    prices: { S: 2000, M: 5000, L: 12000, XL: 28000 }
  },
  {
    id: "D3",
    name: "第三方集成",
    description: "需对接的外部系统",
    ranges: { S: "0", M: "1-2", L: "3-5", XL: "5+" },
    prices: { S: 0, M: 4000, L: 10000, XL: 22000 }
  },
  {
    id: "D4",
    name: "用户角色",
    description: "权限/身份区分",
    ranges: { S: "1", M: "2-3", L: "4-6", XL: "6+" },
    prices: { S: 1000, M: 3000, L: 8000, XL: 18000 }
  },
  {
    id: "D5",
    name: "数据/并发量级",
    description: "峰值 QPS 或 DAU 量级",
    ranges: { S: "<100", M: "100-1k", L: "1k-10k", XL: "10k+" },
    prices: { S: 1000, M: 4000, L: 12000, XL: 30000 }
  }
];

export const COEFFICIENTS = [
  {
    id: "C1",
    name: "需求明确度",
    description: "PRD/原型完备度",
    values: {
      low: { label: "低", value: 0.9, note: "完整 PRD" },
      medium: { label: "中", value: 1.1, note: "文档 + 口头" },
      high: { label: "高", value: 1.4, note: "一句话想法" }
    }
  },
  {
    id: "C2",
    name: "合规/数据敏感",
    description: "金融/医疗/个人数据/出海合规",
    values: {
      low: { label: "低", value: 1.0, note: "常规数据" },
      medium: { label: "中", value: 1.2, note: "部分敏感" },
      high: { label: "高", value: 1.5, note: "强合规" }
    }
  },
  {
    id: "C3",
    name: "第三方依赖稳定",
    description: "对接方 API 文档/可用性",
    values: {
      low: { label: "低", value: 1.0, note: "文档稳定" },
      medium: { label: "中", value: 1.15, note: "少量不确定" },
      high: { label: "高", value: 1.35, note: "依赖不稳定" }
    }
  },
  {
    id: "C4",
    name: "验收标准清晰",
    description: "是否有可量化验收条件",
    values: {
      low: { label: "低", value: 0.95, note: "可量化" },
      medium: { label: "中", value: 1.1, note: "部分明确" },
      high: { label: "高", value: 1.3, note: "标准模糊" }
    }
  }
];

export const MAINTENANCE_PACKAGES = {
  none: { label: "不选", months: 0, rate: 0 },
  M3: { label: "M3", months: 3, rate: 0.15 },
  M6: { label: "M6", months: 6, rate: 0.25 },
  M12: { label: "M12", months: 12, rate: 0.4 }
};

export const DEFAULT_STATE = {
  baseLevels: {
    D1: "M",
    D2: "M",
    D3: "S",
    D4: "M",
    D5: "S"
  },
  coefficients: {
    C1: "low",
    C2: "low",
    C3: "low",
    C4: "medium"
  },
  baseAdjustmentPercent: 0,
  adjustmentReason: "",
  maintenancePackage: "M3",
  escrowEnabled: true,
  escrowRate: 0.15,
  milestoneEnabled: false,
  milestoneRate: 15,
  revenueShareEnabled: false,
  revenueShareRate: 5,
  revenueShareMonths: 12,
  deliveryWeeks: 3,
  trustScore: 3,
  status: "draft"
};

export function cloneDefaultState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

export function formatMoney(value) {
  return `${Math.round(value).toLocaleString("zh-CN")} 元`;
}

export function formatFactor(value) {
  return `×${Number(value).toFixed(2).replace(/0$/, "").replace(/\.0$/, ".0")}`;
}

export function clampNumber(value, min, max) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

export function calculateQuote(state) {
  const baseLines = BASE_DIMENSIONS.map((dimension) => {
    const level = state.baseLevels[dimension.id] ?? "S";
    const price = dimension.prices[level] ?? 0;
    return { id: dimension.id, level, price };
  });

  const rawBase = baseLines.reduce((sum, line) => sum + line.price, 0);
  const adjustmentPercent = clampNumber(state.baseAdjustmentPercent, -20, 20);
  const calibratedBase = Math.round(rawBase * (1 + adjustmentPercent / 100));

  const factorLines = COEFFICIENTS.map((coefficient) => {
    const risk = state.coefficients[coefficient.id] ?? "low";
    const factor = coefficient.values[risk]?.value ?? 1;
    return { id: coefficient.id, risk, factor };
  });
  const factorProductRaw = factorLines.reduce((product, line) => product * line.factor, 1);
  const factorProduct = Number(factorProductRaw.toFixed(4));
  const adjustedPrice = Math.round(calibratedBase * factorProductRaw);

  const maintenance = MAINTENANCE_PACKAGES[state.maintenancePackage] ?? MAINTENANCE_PACKAGES.none;
  const maintenanceFee = Math.round(adjustedPrice * maintenance.rate);
  const finalPrice = adjustedPrice + maintenanceFee;
  const escrowAmount = state.escrowEnabled ? Math.round(finalPrice * Number(state.escrowRate)) : 0;
  const milestonePotential = state.milestoneEnabled ? Math.round(finalPrice * clampNumber(state.milestoneRate, 10, 30) / 100) : 0;

  return {
    baseLines,
    factorLines,
    rawBase,
    adjustmentPercent,
    calibratedBase,
    factorProduct,
    adjustedPrice,
    maintenance,
    maintenanceFee,
    finalPrice,
    escrowAmount,
    milestonePotential,
    warrantyMonths: maintenance.months,
    recommendation: calculateRecommendation(finalPrice, state.deliveryWeeks, state.trustScore, factorProduct)
  };
}

export function calculateRecommendation(finalPrice, deliveryWeeks, trustScore, factorProduct) {
  let score = Number(trustScore) || 3;
  if (factorProduct <= 1) score += 0.5;
  if (deliveryWeeks <= 3) score += 0.5;
  if (finalPrice <= 20000) score += 0.5;
  if (factorProduct >= 1.25) score -= 0.5;
  return Math.max(1, Math.min(5, Math.round(score)));
}

export function createStructuredQuote(state) {
  const totals = calculateQuote(state);
  return {
    demandId: "20260509-0087",
    status: state.status,
    baseLevels: state.baseLevels,
    coefficients: state.coefficients,
    adjustmentPercent: totals.adjustmentPercent,
    maintenancePackage: state.maintenancePackage,
    escrow: {
      enabled: state.escrowEnabled,
      rate: Number(state.escrowRate),
      amount: totals.escrowAmount
    },
    deliveryWeeks: Number(state.deliveryWeeks),
    trustScore: Number(state.trustScore),
    totals: {
      rawBase: totals.rawBase,
      calibratedBase: totals.calibratedBase,
      factorProduct: totals.factorProduct,
      adjustedPrice: totals.adjustedPrice,
      maintenanceFee: totals.maintenanceFee,
      finalPrice: totals.finalPrice
    }
  };
}
