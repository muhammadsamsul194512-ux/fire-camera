const test = require("node:test");
const assert = require("node:assert/strict");
const {
  countActiveFilters,
  DATE_FIELDS,
  DEFAULT_FILTERS,
  filtersToApiParams,
  getOrderDateRange,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  presetToUtcRange,
  searchParamsToFilters,
  validateDateFilterParams,
} = require("./admin-filters.ts");

function filters(overrides = {}) {
  return { ...DEFAULT_FILTERS, ...overrides };
}

test("custom timestamp range includes both Jakarta dates with an exclusive next-day boundary", () => {
  assert.deepEqual(getOrderDateRange(filters({
    datePreset: "custom",
    dateStart: "2026-11-01",
    dateEnd: "2026-11-03",
  })), {
    start: "2026-10-31T17:00:00.000Z",
    end: "2026-11-03T17:00:00.000Z",
  });
});

test("custom rental-date range uses date strings and an exclusive end date", () => {
  assert.deepEqual(getOrderDateRange(filters({
    datePreset: "custom",
    dateField: "tanggal_ambil",
    dateStart: "2026-11-01",
    dateEnd: "2026-11-03",
  })), {
    start: "2026-11-01",
    end: "2026-11-04",
  });
});

test("an incomplete custom range is safely treated as the selected start date only", () => {
  assert.deepEqual(getOrderDateRange(filters({
    datePreset: "custom",
    dateStart: "2026-11-01",
  })), {
    start: "2026-10-31T17:00:00.000Z",
    end: "2026-11-01T17:00:00.000Z",
  });
});

test("exact date filters cover one complete Jakarta day for each date field", () => {
  assert.deepEqual(getOrderDateRange(filters({
    datePreset: "exact",
    dateField: "tanggal_kembali",
    dateStart: "2026-11-01",
  })), { start: "2026-11-01", end: "2026-11-02" });
});

test("presets use exclusive Jakarta day boundaries", () => {
  const now = new Date("2026-11-01T07:30:00.000Z");
  assert.deepEqual(presetToUtcRange("today", now), {
    start: "2026-10-31T17:00:00.000Z",
    end: "2026-11-01T17:00:00.000Z",
  });
  assert.deepEqual(presetToUtcRange("yesterday", now), {
    start: "2026-10-30T17:00:00.000Z",
    end: "2026-10-31T17:00:00.000Z",
  });
  assert.equal(presetToUtcRange("all", now), null);
});

test("calendar-month presets clamp their start day to the last day of the target month", () => {
  const endOfMay = new Date("2026-05-31T07:30:00.000Z");
  assert.equal(
    getOrderDateRange(filters({ datePreset: "last3months" }), endOfMay).start,
    "2026-02-27T17:00:00.000Z",
  );
  const leapDay = new Date("2024-02-29T07:30:00.000Z");
  assert.equal(
    getOrderDateRange(filters({ datePreset: "last12months" }), leapDay).start,
    "2023-02-27T17:00:00.000Z",
  );
});

test("the end instant is exclusive, including the final millisecond of the selected date", () => {
  const range = getOrderDateRange(filters({
    datePreset: "custom",
    dateStart: "2026-11-01",
    dateEnd: "2026-11-03",
  }));
  const start = Date.parse(range.start);
  const end = Date.parse(range.end);
  assert.ok(Date.parse("2026-10-31T17:00:00.000Z") >= start);
  assert.ok(Date.parse("2026-11-03T16:59:59.999Z") < end);
  assert.ok(!(Date.parse("2026-11-03T17:00:00.000Z") < end));
});

test("invalid calendar dates and reversed ranges are rejected", () => {
  const invalidDateParams = new URLSearchParams({ preset: "exact", from: "2026-02-30" });
  const invalidDateFilters = searchParamsToFilters(invalidDateParams);
  assert.equal(validateDateFilterParams(invalidDateParams, invalidDateFilters), "Tanggal tertentu tidak valid.");

  const reversedParams = new URLSearchParams({
    preset: "custom",
    from: "2026-11-03",
    to: "2026-11-01",
  });
  const reversedFilters = searchParamsToFilters(reversedParams);
  assert.equal(validateDateFilterParams(reversedParams, reversedFilters), "Tanggal akhir tidak boleh sebelum tanggal awal.");
});

test("custom range requires at least a start date", () => {
  const params = new URLSearchParams({ preset: "custom" });
  const parsed = searchParamsToFilters(params);
  assert.equal(validateDateFilterParams(params, parsed), "Tanggal awal wajib dipilih.");
});

test("all date fields identify the order-creation date as the default", () => {
  assert.equal(DEFAULT_FILTERS.dateField, "created_at");
  assert.deepEqual(DATE_FIELDS.map((field) => field.value), [
    "created_at",
    "tanggal_ambil",
    "tanggal_kembali",
  ]);
});

test("stored order and payment status options remain distinct and valid", () => {
  assert.ok(ORDER_STATUSES.includes("disewa"));
  assert.ok(!ORDER_STATUSES.includes("perlu_upload_ulang"));
  assert.ok(PAYMENT_STATUSES.includes("perlu_upload_ulang"));
  assert.ok(!PAYMENT_STATUSES.includes("disewa"));
});

test("filter serialization round-trips status, date range, and pagination to API params", () => {
  const original = filters({
    status: "disewa",
    paymentStatus: "menunggu_verifikasi",
    datePreset: "custom",
    dateField: "tanggal_ambil",
    dateStart: "2026-11-01",
    dateEnd: "2026-11-03",
    page: 2,
    pageSize: 50,
  });
  const parsed = searchParamsToFilters(new URLSearchParams(filtersToApiParams(original)));
  assert.deepEqual(parsed, original);
});

test("default filters serialize to no query string, and active filters count correctly", () => {
  assert.equal(filtersToApiParams(DEFAULT_FILTERS), "");
  assert.equal(countActiveFilters(DEFAULT_FILTERS), 0);
  assert.equal(countActiveFilters(filters({
    status: "disewa",
    paymentStatus: "dikonfirmasi",
    cameraId: "4",
    datePreset: "exact",
    dateStart: "2026-11-01",
  })), 4);
});
