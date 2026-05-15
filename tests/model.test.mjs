import assert from "node:assert/strict";
import test from "node:test";
import { calculateQuote, cloneDefaultState } from "../src/quoteModel.mjs";

test("default quote matches the requirement sketch", () => {
  const quote = calculateQuote(cloneDefaultState());

  assert.equal(quote.rawBase, 15000);
  assert.equal(quote.factorProduct, 0.99);
  assert.equal(quote.adjustedPrice, 14850);
  assert.equal(quote.maintenanceFee, 2228);
  assert.equal(quote.finalPrice, 17078);
  assert.equal(quote.escrowAmount, 2562);
});

test("cross-border SaaS example stays within the documented approximation", () => {
  const state = cloneDefaultState();
  state.baseLevels = { D1: "L", D2: "L", D3: "L", D4: "L", D5: "M" };
  state.coefficients = { C1: "medium", C2: "high", C3: "high", C4: "medium" };
  state.maintenancePackage = "none";
  state.escrowEnabled = false;

  const quote = calculateQuote(state);

  assert.equal(quote.rawBase, 49000);
  assert.ok(Math.abs(quote.adjustedPrice - 120050) <= 100);
  assert.equal(quote.finalPrice, quote.adjustedPrice);
});

test("base calibration is clamped to plus or minus twenty percent", () => {
  const state = cloneDefaultState();
  state.baseAdjustmentPercent = 42;
  assert.equal(calculateQuote(state).adjustmentPercent, 20);
  assert.equal(calculateQuote(state).calibratedBase, 18000);

  state.baseAdjustmentPercent = -42;
  assert.equal(calculateQuote(state).adjustmentPercent, -20);
  assert.equal(calculateQuote(state).calibratedBase, 12000);
});
