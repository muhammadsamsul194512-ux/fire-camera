const test = require("node:test");
const assert = require("node:assert/strict");
const {
  PAYMENT_EXPIRATION_MINUTES,
  getPaymentExpiresAt,
  isAwaitingPayment,
  isExpiredBooking,
  canAcceptPayment,
  hasTimeOverlap,
  hasRentalOverlap,
  isValidRentalSchedule,
  isFutureJakartaSlot,
  reservesInventory,
  getAvailableUnits,
  isValidRequestedQuantity,
} = require("./booking-rules.js");

test("payment expiration default is 30 minutes", () => {
  assert.equal(PAYMENT_EXPIRATION_MINUTES, 30);
});

test("pending payment before expiration is not expired", () => {
  const createdAt = new Date("2026-10-09T10:00:00Z");
  const expiration = getPaymentExpiresAt(createdAt);
  assert.ok(
    isAwaitingPayment("menunggu_pembayaran", "menunggu_pembayaran", expiration),
  );
  assert.equal(
    isExpiredBooking(
      "menunggu_pembayaran",
      "menunggu_pembayaran",
      expiration,
      new Date("2026-10-09T10:15:00Z"),
    ),
    false,
  );
});

test("expired payment is expired once deadline has passed", () => {
  const createdAt = new Date("2026-10-09T10:00:00Z");
  const expiresAt = getPaymentExpiresAt(createdAt);
  assert.equal(
    isExpiredBooking(
      "menunggu_pembayaran",
      "menunggu_pembayaran",
      expiresAt,
      new Date("2026-10-09T10:31:00Z"),
    ),
    true,
  );
  assert.equal(
    canAcceptPayment(
      "menunggu_pembayaran",
      "menunggu_pembayaran",
      expiresAt,
      new Date("2026-10-09T10:31:00Z"),
    ),
    false,
  );
});

test("submitted proofs do not expire on the original deadline, but replacement requests use their own deadline", () => {
  const originalDeadline = new Date("2026-10-09T10:30:00Z");
  const now = new Date("2026-10-09T11:00:00Z");
  const reuploadDeadline = new Date("2026-10-09T11:15:00Z");

  assert.equal(
    isExpiredBooking("menunggu_verifikasi", "menunggu_verifikasi", originalDeadline, now),
    false,
  );
  assert.equal(
    canAcceptPayment("menunggu_verifikasi", "menunggu_verifikasi", originalDeadline, now),
    false,
  );
  assert.equal(
    isExpiredBooking("menunggu_verifikasi", "perlu_upload_ulang", originalDeadline, now, reuploadDeadline),
    false,
  );
  assert.equal(
    canAcceptPayment("menunggu_verifikasi", "perlu_upload_ulang", originalDeadline, now, reuploadDeadline),
    true,
  );
  assert.equal(
    isExpiredBooking("menunggu_verifikasi", "perlu_upload_ulang", originalDeadline, now, "2026-10-09T10:59:59Z"),
    true,
  );
  assert.equal(
    canAcceptPayment("menunggu_verifikasi", "perlu_upload_ulang", originalDeadline, now, "2026-10-09T10:59:59Z"),
    false,
  );
});

test("confirmed payment is never expired", () => {
  const expiresAt = getPaymentExpiresAt(new Date("2026-10-09T10:00:00Z"));
  assert.equal(
    isExpiredBooking(
      "dikonfirmasi",
      "dikonfirmasi",
      expiresAt,
      new Date("2026-10-09T10:50:00Z"),
    ),
    false,
  );
  assert.equal(
    canAcceptPayment(
      "dikonfirmasi",
      "dikonfirmasi",
      expiresAt,
      new Date("2026-10-09T10:50:00Z"),
    ),
    true,
  );
});

test("overlapping bookings on the same camera are treated as conflicting", () => {
  assert.equal(
    hasTimeOverlap(
      "2026-10-10T08:00:00Z",
      "2026-10-10T18:00:00Z",
      "2026-10-10T10:00:00Z",
      "2026-10-10T12:00:00Z",
    ),
    true,
  );

  assert.equal(
    hasTimeOverlap(
      "2026-10-10T08:00:00Z",
      "2026-10-10T18:00:00Z",
      "2026-10-10T18:00:00Z",
      "2026-10-10T20:00:00Z",
    ),
    false,
  );
});

test("rental availability uses pickup and return timestamps without timezone shifts", () => {
  assert.equal(
    hasRentalOverlap("2026-10-22", "08:00:00", "2026-10-23", "21:00:00", "2026-10-23", "08:00", "2026-10-24", "21:00"),
    true,
  );
  assert.equal(
    hasRentalOverlap("2026-10-22", "08:00", "2026-10-23", "08:00", "2026-10-23", "08:00", "2026-10-24", "21:00"),
    false,
  );
  assert.equal(
    hasRentalOverlap("2026-10-20", "08:00", "2026-10-25", "21:00", "2026-10-22", "08:00", "2026-10-23", "21:00"),
    true,
  );
});

test("pickup slots preserve full 24-hour rental periods and operating hours", () => {
  assert.equal(isValidRentalSchedule("2026-10-26", "15:00", "2026-10-27", "15:00"), true);
  assert.equal(isValidRentalSchedule("2026-10-26", "20:00", "2026-10-27", "20:00"), true);
  assert.equal(isValidRentalSchedule("2026-10-26", "21:00", "2026-10-27", "21:00"), false);
  assert.equal(isValidRentalSchedule("2026-10-26", "15:00", "2026-10-27", "08:00"), false);
  assert.equal(isValidRentalSchedule("2026-10-26", "15:00", "2026-10-26", "15:00"), false);
});

test("pickup slots that have already passed in Jakarta cannot be booked", () => {
  const now = new Date("2026-10-26T02:30:00.000Z"); // 09:30 WIB
  assert.equal(isFutureJakartaSlot("2026-10-26", "09:00", now), false);
  assert.equal(isFutureJakartaSlot("2026-10-26", "10:00", now), true);
  assert.equal(isFutureJakartaSlot("2026-10-27", "08:00", now), true);
});

test("only active inventory statuses reserve stock, and expired pending orders do not", () => {
  const now = new Date("2026-10-22T12:00:00Z");
  for (const status of ["menunggu_pembayaran", "menunggu_verifikasi", "dikonfirmasi", "disewa"]) {
    assert.equal(reservesInventory(status, null, now), true, `${status} reserves`);
  }
  for (const status of ["selesai", "dibatalkan", "ditolak", "kedaluwarsa"]) {
    assert.equal(reservesInventory(status, null, now), false, `${status} releases`);
  }
  assert.equal(
    reservesInventory("menunggu_pembayaran", "2026-10-22T11:59:59Z", now),
    false,
  );
});

test("last unit is only available when the remaining stock can satisfy the requested quantity", () => {
  assert.equal(getAvailableUnits(1, 0, 1), true);
  assert.equal(getAvailableUnits(1, 1, 1), false);
  assert.equal(getAvailableUnits(2, 1, 2), false);
  assert.equal(getAvailableUnits(2, 1, 1), true);
});

test("quantities match the remaining stock and reject invalid values", () => {
  for (const [requested, expected] of [[1, true], [7, true], [8, false]]) {
    assert.equal(getAvailableUnits(8, 1, requested), expected);
  }
  for (const quantity of [0, -1, 1.5, "1.5", "", true, null]) {
    assert.equal(isValidRequestedQuantity(quantity), false, `${quantity} is invalid`);
  }
  assert.equal(isValidRequestedQuantity(1), true);
  assert.equal(isValidRequestedQuantity("7"), true);
});
