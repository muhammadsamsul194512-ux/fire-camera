const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateRentalDays } = require("./rental-duration");

test("same-day, next-day, and multi-day rental duration use one convention", () => {
  assert.equal(calculateRentalDays("2026-10-25", "2026-10-25"), 1);
  assert.equal(calculateRentalDays("2026-10-25", "2026-10-26"), 1);
  assert.equal(calculateRentalDays("2026-10-25", "2026-10-27"), 2);
  assert.equal(calculateRentalDays("2026-10-25", "2026-10-29"), 4);
});

test("invalid and reversed rental dates have no duration", () => {
  assert.equal(calculateRentalDays("", "2026-10-25"), 0);
  assert.equal(calculateRentalDays("2026-10-26", "2026-10-25"), 0);
  assert.equal(calculateRentalDays("2026-02-30", "2026-03-01"), 0);
});
