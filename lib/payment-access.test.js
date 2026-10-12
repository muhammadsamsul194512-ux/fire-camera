const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPaymentRoute,
  isValidPaymentRouteId,
} = require("./payment-access.js");

test("payment route uses the order id, not a query-string total", () => {
  assert.equal(buildPaymentRoute(12345), "/pembayaran/12345");
  assert.equal(buildPaymentRoute("12345"), "/pembayaran/12345");
});

test("payment route ids must be positive integers", () => {
  assert.equal(isValidPaymentRouteId("123"), true);
  assert.equal(isValidPaymentRouteId("0"), false);
  assert.equal(isValidPaymentRouteId("abc"), false);
  assert.equal(isValidPaymentRouteId("12.5"), false);
});
