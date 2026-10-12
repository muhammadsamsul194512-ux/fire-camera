const test = require("node:test");
const assert = require("node:assert/strict");
const {
  PAYMENT_EXPIRATION_MINUTES,
  getPaymentExpiresAt,
  isAwaitingPayment,
  isExpiredBooking,
  canAcceptPayment,
  hasTimeOverlap,
  getAvailableUnits,
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

test("last unit is only available when the remaining stock can satisfy the requested quantity", () => {
  assert.equal(getAvailableUnits(1, 0, 1), true);
  assert.equal(getAvailableUnits(1, 1, 1), false);
  assert.equal(getAvailableUnits(2, 1, 2), false);
  assert.equal(getAvailableUnits(2, 1, 1), true);
});
