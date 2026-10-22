const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPaymentRoute,
  createPaymentAccessToken,
  isValidPaymentRouteId,
  verifyPaymentAccessToken,
  verifyPaymentAccessTokenForOrderNumber,
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

test("payment access token is bound to its order id and order number", () => {
  const token = createPaymentAccessToken({
    orderId: 42,
    nomorPesanan: "FC-20261022-1234",
    whatsapp: "081234567890",
    expiresAt: Date.now() + 60_000,
  });

  assert.equal(verifyPaymentAccessToken(token, 42), true);
  assert.equal(verifyPaymentAccessToken(token, 43), false);
  assert.equal(verifyPaymentAccessTokenForOrderNumber(token, "FC-20261022-1234"), true);
  assert.equal(verifyPaymentAccessTokenForOrderNumber(token, "FC-OTHER"), false);
});
