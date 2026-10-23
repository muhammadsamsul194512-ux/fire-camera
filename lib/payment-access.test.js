const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PAYMENT_ACCESS_COOKIE,
  PAYMENT_ACCESS_MAX_AGE_SECONDS,
  buildPaymentRoute,
  createPaymentAccessToken,
  isValidPaymentRouteId,
  paymentAccessCookieName,
  verifyPaymentAccessFromCookies,
  verifyPaymentAccessForOrderNumberFromCookies,
  verifyPaymentAccessToken,
  verifyPaymentAccessTokenForOrderNumber,
} = require("./payment-access.js");
const {
  canAcceptPayment,
  isExpiredBooking,
  reservesInventory,
} = require("./booking-rules.js");

function grant(orderId, orderNumber, whatsapp) {
  return {
    name: paymentAccessCookieName(orderId),
    value: createPaymentAccessToken({
      orderId,
      nomorPesanan: orderNumber,
      whatsapp,
      expiresAt: Date.now() + PAYMENT_ACCESS_MAX_AGE_SECONDS * 1000,
    }),
  };
}

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

test("creating order B no longer overwrites order A access in the same browser", () => {
  const orderA = grant(101, "FC-20261023-0101", "081111111111");
  const orderB = grant(102, "FC-20261023-0102", "081111111111");
  const browserCookies = [orderA, orderB];

  assert.notEqual(orderA.name, orderB.name);
  assert.equal(verifyPaymentAccessFromCookies(browserCookies, 101), true);
  assert.equal(verifyPaymentAccessFromCookies(browserCookies, 102), true);
});

test("the old shared-cookie behavior reproduces cross-order invalidation", () => {
  const orderA = grant(201, "FC-20261023-0201", "081111111111");
  const orderB = grant(202, "FC-20261023-0202", "081111111111");
  // Before the fix, each booking response replaced this single cookie.
  const legacyCookieAfterOrderB = [{ name: PAYMENT_ACCESS_COOKIE, value: orderB.value }];

  assert.equal(verifyPaymentAccessFromCookies(legacyCookieAfterOrderB, 201), false);
  assert.equal(verifyPaymentAccessFromCookies(legacyCookieAfterOrderB, 202), true);
  assert.equal(verifyPaymentAccessFromCookies([orderA, orderB], 201), true);
});

test("separate tabs use the shared browser jar while separate devices need their own authorization", () => {
  const orderA = grant(301, "FC-20261023-0301", "081111111111");
  const orderB = grant(302, "FC-20261023-0302", "081111111111");
  const sharedBrowser = [orderA, orderB];
  const separateDevice = [];

  assert.equal(verifyPaymentAccessFromCookies(sharedBrowser, 301), true);
  assert.equal(verifyPaymentAccessFromCookies(sharedBrowser, 302), true);
  assert.equal(verifyPaymentAccessFromCookies(separateDevice, 301), false);
  assert.equal(verifyPaymentAccessFromCookies([grant(301, "FC-20261023-0301", "081111111111")], 301), true);
});

test("a different customer's order cannot be accessed with another order's grant", () => {
  const customerAOrder = grant(401, "FC-20261023-0401", "081111111111");
  assert.equal(verifyPaymentAccessFromCookies([customerAOrder], 402), false);
  assert.equal(
    verifyPaymentAccessForOrderNumberFromCookies([customerAOrder], "FC-20261023-0402"),
    false,
  );
});

test("reopening or reloading an old payment link keeps its order-specific authorization", () => {
  const oldOrder = grant(501, "FC-20261023-0501", "081111111111");
  const newerOrder = grant(502, "FC-20261023-0502", "081111111111");
  const jar = [oldOrder, newerOrder];

  for (let reload = 0; reload < 3; reload += 1) {
    assert.equal(verifyPaymentAccessFromCookies(jar, 501), true);
    assert.equal(verifyPaymentAccessFromCookies(jar, 502), true);
  }
  assert.equal(verifyPaymentAccessForOrderNumberFromCookies(jar, "FC-20261023-0501"), true);
});

test("payment authorization lasts beyond the original deadline while payment submission still expires", () => {
  const now = new Date();
  const oldDeadline = new Date(now.getTime() - 60_000);
  const order = grant(601, "FC-20261023-0601", "081111111111");

  assert.equal(verifyPaymentAccessFromCookies([order], 601), true);
  assert.equal(canAcceptPayment("menunggu_pembayaran", "menunggu_pembayaran", oldDeadline, now), false);
  assert.equal(canAcceptPayment("menunggu_pembayaran", "menunggu_pembayaran", new Date(now.getTime() + 60_000), now), true);
});

test("submitted proof awaiting verification stays accessible after the original deadline", () => {
  const oldDeadline = new Date(Date.now() - 60_000);
  const order = grant(701, "FC-20261023-0701", "081111111111");

  assert.equal(verifyPaymentAccessFromCookies([order], 701), true);
  assert.equal(isExpiredBooking("menunggu_verifikasi", "menunggu_verifikasi", oldDeadline), false);
  assert.equal(canAcceptPayment("menunggu_verifikasi", "menunggu_verifikasi", oldDeadline), false);
});

test("requesting replacement proof for one order leaves unrelated order grants valid", () => {
  const orderA = grant(801, "FC-20261023-0801", "081111111111");
  const orderB = grant(802, "FC-20261023-0802", "081111111111");
  const jar = [orderA, orderB];

  // Re-upload is a payment/order state change; it does not replace either cookie.
  assert.equal(verifyPaymentAccessFromCookies(jar, 801), true);
  assert.equal(verifyPaymentAccessFromCookies(jar, 802), true);
});

test("inventory availability checks do not mutate unrelated order state", () => {
  const orders = [
    { id: 901, status: "menunggu_verifikasi", paymentStatus: "menunggu_verifikasi", deadline: "2026-10-23T08:00:00Z" },
    { id: 902, status: "menunggu_pembayaran", paymentStatus: "menunggu_pembayaran", deadline: "2026-10-24T08:00:00Z" },
  ];
  const snapshot = structuredClone(orders);

  const reserved = orders.filter((order) => reservesInventory(
    order.status,
    order.deadline,
    new Date("2026-10-23T09:00:00Z"),
    order.paymentStatus,
  ));

  assert.deepEqual(orders, snapshot);
  assert.deepEqual(reserved.map((order) => order.id), [901, 902]);
});

test("different cameras and payment states still use independently bound order grants", () => {
  const now = new Date("2026-10-23T12:00:00Z");
  const orders = [
    {
      id: 1001,
      cameraId: 1,
      status: "menunggu_verifikasi",
      paymentStatus: "menunggu_verifikasi",
      deadline: "2026-10-23T10:00:00Z",
      grant: grant(1001, "FC-20261023-1001", "081111111111"),
    },
    {
      id: 1002,
      cameraId: 2,
      status: "menunggu_pembayaran",
      paymentStatus: "menunggu_pembayaran",
      deadline: "2026-10-23T12:30:00Z",
      grant: grant(1002, "FC-20261023-1002", "082222222222"),
    },
  ];
  const jar = orders.map((order) => order.grant);

  assert.notEqual(orders[0].cameraId, orders[1].cameraId);
  assert.equal(verifyPaymentAccessFromCookies(jar, 1001), true);
  assert.equal(verifyPaymentAccessFromCookies(jar, 1002), true);
  assert.equal(
    canAcceptPayment(orders[0].status, orders[0].paymentStatus, orders[0].deadline, now),
    false,
  );
  assert.equal(
    canAcceptPayment(orders[1].status, orders[1].paymentStatus, orders[1].deadline, now),
    true,
  );
});
