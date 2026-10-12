const PAYMENT_EXPIRATION_MINUTES = 30;

const ORDER_PENDING_STATUSES = new Set([
  "menunggu_pembayaran",
  "menunggu_verifikasi",
]);

const PAYMENT_PENDING_STATUSES = new Set([
  "menunggu_pembayaran",
  "menunggu_verifikasi",
  "perlu_upload_ulang",
]);

const PAYMENT_ALLOWED_FOR_UPLOAD = new Set([
  "menunggu_pembayaran",
  "menunggu_verifikasi",
  "perlu_upload_ulang",
  "ditolak",
]);

function getPaymentExpiresAt(createdAt, minutes = PAYMENT_EXPIRATION_MINUTES) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    throw new Error("createdAt must be a valid date");
  }

  return new Date(date.getTime() + minutes * 60 * 1000);
}

function isAwaitingPayment(orderStatus, paymentStatus) {
  const normalizedOrderStatus = String(orderStatus || "").trim();
  const normalizedPaymentStatus = String(paymentStatus || "").trim();

  return (
    ORDER_PENDING_STATUSES.has(normalizedOrderStatus) ||
    PAYMENT_PENDING_STATUSES.has(normalizedPaymentStatus)
  );
}

function isExpiredBooking(
  orderStatus,
  paymentStatus,
  paymentExpiresAt,
  now = new Date(),
) {
  const normalizedOrderStatus = String(orderStatus || "").trim();
  const normalizedPaymentStatus = String(paymentStatus || "").trim();

  if (!isAwaitingPayment(normalizedOrderStatus, normalizedPaymentStatus)) {
    return false;
  }

  if (!paymentExpiresAt) {
    return false;
  }

  const expiresAt = new Date(paymentExpiresAt);
  if (Number.isNaN(expiresAt.getTime())) {
    return false;
  }

  return now.getTime() >= expiresAt.getTime();
}

function canAcceptPayment(
  orderStatus,
  paymentStatus,
  paymentExpiresAt,
  now = new Date(),
) {
  const normalizedOrderStatus = String(orderStatus || "").trim();
  const normalizedPaymentStatus = String(paymentStatus || "").trim();

  if (
    normalizedOrderStatus === "dikonfirmasi" ||
    normalizedPaymentStatus === "dikonfirmasi"
  ) {
    return true;
  }

  if (
    isExpiredBooking(
      normalizedOrderStatus,
      normalizedPaymentStatus,
      paymentExpiresAt,
      now,
    )
  ) {
    return false;
  }

  return (
    PAYMENT_ALLOWED_FOR_UPLOAD.has(normalizedPaymentStatus) ||
    ORDER_PENDING_STATUSES.has(normalizedOrderStatus)
  );
}

function canBookAgainstOrder(orderStatus) {
  return new Set([
    "menunggu_pembayaran",
    "menunggu_verifikasi",
    "dikonfirmasi",
    "disewa",
  ]).has(String(orderStatus || "").trim());
}

function hasTimeOverlap(startA, endA, startB, endB) {
  const aStart = new Date(startA).getTime();
  const aEnd = new Date(endA).getTime();
  const bStart = new Date(startB).getTime();
  const bEnd = new Date(endB).getTime();

  return aStart < bEnd && aEnd > bStart;
}

function getAvailableUnits(totalUnits, reservedUnits, requestedUnits) {
  return Math.max(totalUnits - reservedUnits, 0) >= requestedUnits;
}

module.exports = {
  PAYMENT_EXPIRATION_MINUTES,
  ORDER_PENDING_STATUSES,
  PAYMENT_PENDING_STATUSES,
  PAYMENT_ALLOWED_FOR_UPLOAD,
  getPaymentExpiresAt,
  isAwaitingPayment,
  isExpiredBooking,
  canAcceptPayment,
  canBookAgainstOrder,
  hasTimeOverlap,
  getAvailableUnits,
};
