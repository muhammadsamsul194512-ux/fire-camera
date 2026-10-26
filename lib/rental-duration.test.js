const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateRentalDays } = require("./rental-duration");

test("rental days are complete 24-hour periods", () => {
  assert.equal(calculateRentalDays("2026-10-25", "2026-10-25"), 0);
  assert.equal(calculateRentalDays("2026-10-25", "2026-10-26"), 1);
  assert.equal(calculateRentalDays("2026-10-25", "2026-10-27"), 2);
  assert.equal(calculateRentalDays("2026-10-25", "2026-10-29"), 4);
  assert.equal(calculateRentalDays("2026-10-25", "2026-10-27"), 2);
});

test("Rp50,000 daily rate produces the expected one, two, and four day totals", () => {
  const dailyRate = 50_000;
  assert.equal(calculateRentalDays("2026-10-26", "2026-10-27") * dailyRate, 50_000);
  assert.equal(calculateRentalDays("2026-10-26", "2026-10-28") * dailyRate, 100_000);
  assert.equal(calculateRentalDays("2026-10-26", "2026-10-30") * dailyRate, 200_000);
});

test("invalid and reversed rental dates have no duration", () => {
  assert.equal(calculateRentalDays("", "2026-10-25"), 0);
  assert.equal(calculateRentalDays("2026-10-26", "2026-10-25"), 0);
  assert.equal(calculateRentalDays("2026-02-30", "2026-03-01"), 0);
});
