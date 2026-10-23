const PAYMENT_EXPIRATION_MINUTES = 30;

const ORDER_PENDING_STATUSES = new Set(["menunggu_pembayaran"]);

const PAYMENT_PENDING_STATUSES = new Set([
  "menunggu_pembayaran",
  "perlu_upload_ulang",
]);

const PAYMENT_ALLOWED_FOR_UPLOAD = new Set([
  "menunggu_pembayaran",
  "perlu_upload_ulang",
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
    (normalizedOrderStatus === "menunggu_pembayaran" && normalizedPaymentStatus === "menunggu_pembayaran") ||
    (normalizedOrderStatus === "menunggu_verifikasi" && normalizedPaymentStatus === "perlu_upload_ulang")
  );
}

function isExpiredBooking(
  orderStatus,
  paymentStatus,
  paymentExpiresAt,
  now = new Date(),
  reuploadExpiresAt = null,
) {
  const normalizedOrderStatus = String(orderStatus || "").trim();
  const normalizedPaymentStatus = String(paymentStatus || "").trim();

  if (!isAwaitingPayment(normalizedOrderStatus, normalizedPaymentStatus)) {
    return false;
  }

  const deadline = normalizedPaymentStatus === "perlu_upload_ulang"
    ? reuploadExpiresAt
    : paymentExpiresAt;
  if (!deadline) {
    return false;
  }

  const expiresAt = new Date(deadline);
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
  reuploadExpiresAt = null,
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
      reuploadExpiresAt,
    )
  ) {
    return false;
  }

  if (normalizedOrderStatus === "menunggu_pembayaran") {
    return normalizedPaymentStatus === "menunggu_pembayaran" && Boolean(paymentExpiresAt);
  }
  return normalizedOrderStatus === "menunggu_verifikasi"
    && normalizedPaymentStatus === "perlu_upload_ulang"
    && Boolean(reuploadExpiresAt);
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

/**
 * @param {string} orderStatus
 * @param {string | Date | null | undefined} paymentExpiresAt
 * @param {Date} [now]
 * @param {string | null | undefined} [paymentStatus]
 * @param {string | Date | null | undefined} [reuploadExpiresAt]
 */
function reservesInventory(orderStatus, paymentExpiresAt, now = new Date(), paymentStatus = null, reuploadExpiresAt = null) {
  const status = String(orderStatus || "").trim();
  if (!canBookAgainstOrder(status)) return false;
  if (status === "menunggu_pembayaran") {
    if (paymentExpiresAt && new Date(paymentExpiresAt).getTime() <= now.getTime()) {
      return false;
    }
  }
  if (status === "menunggu_verifikasi" && paymentStatus === "perlu_upload_ulang" && reuploadExpiresAt && new Date(reuploadExpiresAt).getTime() <= now.getTime()) return false;
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
