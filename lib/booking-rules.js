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

function normalizeRentalTime(value) {
  const match = String(value || "").match(/^(\d{2}:\d{2})(?::(\d{2}))?$/);
  return match ? `${match[1]}:${match[2] || "00"}` : null;
}

function hasRentalOverlap(
  startDateA,
  startTimeA,
  endDateA,
  endTimeA,
  startDateB,
  startTimeB,
  endDateB,
  endTimeB,
) {
  const normalizedStartA = normalizeRentalTime(startTimeA);
  const normalizedEndA = normalizeRentalTime(endTimeA);
  const normalizedStartB = normalizeRentalTime(startTimeB);
  const normalizedEndB = normalizeRentalTime(endTimeB);
  if (!normalizedStartA || !normalizedEndA || !normalizedStartB || !normalizedEndB) {
    return false;
  }

  const startA = `${startDateA}T${normalizedStartA}`;
  const endA = `${endDateA}T${normalizedEndA}`;
  const startB = `${startDateB}T${normalizedStartB}`;
  const endB = `${endDateB}T${normalizedEndB}`;
  return startA < endB && endA > startB;
}

function reservesInventory(orderStatus, paymentExpiresAt, now = new Date()) {
  const status = String(orderStatus || "").trim();
  if (!canBookAgainstOrder(status)) return false;
  if (
    status === "menunggu_pembayaran" ||
    status === "menunggu_verifikasi"
  ) {
    if (paymentExpiresAt && new Date(paymentExpiresAt).getTime() <= now.getTime()) {
      return false;
    }
  }
  return true;
}

function getAvailableUnits(totalUnits, reservedUnits, requestedUnits) {
  return Math.max(totalUnits - reservedUnits, 0) >= requestedUnits;
}

function isValidRequestedQuantity(value) {
  if (typeof value !== "number" && typeof value !== "string") return false;
  if (typeof value === "string" && value.trim() === "") return false;
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity >= 1;
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
  hasRentalOverlap,
  reservesInventory,
  getAvailableUnits,
  isValidRequestedQuantity,
};
