const crypto = require("node:crypto");

const PAYMENT_ACCESS_COOKIE = "fc_payment_access";

function normalizePhone(value) {
  return String(value || "")
    .replace(/\D+/g, "")
    .replace(/^62/, "0");
}

function getSigningSecret() {
  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "fire-camera-local-dev-secret"
  );
}

function isValidPaymentRouteId(value) {
  if (value === undefined || value === null) return false;

  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0;
  }

  const normalized = String(value).trim();

  if (!/^\d+$/.test(normalized)) {
    return false;
  }

  return Number(normalized) > 0;
}

function buildPaymentRoute(orderId) {
  if (!isValidPaymentRouteId(orderId)) {
    return "/pembayaran";
  }

  return `/pembayaran/${Number(orderId)}`;
}

function createPaymentAccessToken({
  orderId,
  nomorPesanan,
  whatsapp,
  expiresAt,
}) {
  const rawPayload = [
    String(orderId),
    String(nomorPesanan || "").trim(),
    normalizePhone(whatsapp),
    new Date(expiresAt || Date.now() + 30 * 60 * 1000).toISOString(),
  ].join("|");

  const signature = crypto
    .createHmac("sha256", getSigningSecret())
    .update(rawPayload)
    .digest("hex");

  return `${Buffer.from(rawPayload).toString("base64url")}.${signature}`;
}

function verifyPaymentAccessToken(token, expectedOrderId) {
  if (!token || !expectedOrderId) {
    return false;
  }

  const [encodedPayload, signature] = String(token).split(".");

  if (!encodedPayload || !signature) {
    return false;
  }

  try {
    const rawPayload = Buffer.from(encodedPayload, "base64url").toString(
      "utf8",
    );
    const [orderId, nomorPesanan, whatsapp, expiresAtIso] =
      rawPayload.split("|");

    if (!orderId || !nomorPesanan || !whatsapp || !expiresAtIso) {
      return false;
    }

    if (String(orderId) !== String(expectedOrderId)) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac("sha256", getSigningSecret())
      .update(rawPayload)
      .digest("hex");

    const actualBytes = Buffer.from(signature);
    const expectedBytes = Buffer.from(expectedSignature);

    if (actualBytes.length !== expectedBytes.length) {
      return false;
    }

    if (!crypto.timingSafeEqual(actualBytes, expectedBytes)) {
      return false;
    }

    const expiresAtMs = new Date(expiresAtIso).getTime();
    if (Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now()) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function verifyPaymentAccessTokenForOrderNumber(token, expectedOrderNumber) {
  if (!token || !expectedOrderNumber) return false;
  const [encodedPayload, signature] = String(token).split(".");
  if (!encodedPayload || !signature) return false;
  try {
    const rawPayload = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const [orderId, nomorPesanan, whatsapp, expiresAtIso] = rawPayload.split("|");
    if (!orderId || !nomorPesanan || !whatsapp || !expiresAtIso || nomorPesanan !== String(expectedOrderNumber).trim()) return false;
    const expectedSignature = crypto.createHmac("sha256", getSigningSecret()).update(rawPayload).digest("hex");
    const actualBytes = Buffer.from(signature);
    const expectedBytes = Buffer.from(expectedSignature);
    if (actualBytes.length !== expectedBytes.length || !crypto.timingSafeEqual(actualBytes, expectedBytes)) return false;
    const expiresAtMs = new Date(expiresAtIso).getTime();
    return Number.isFinite(expiresAtMs) && expiresAtMs > Date.now();
  } catch {
    return false;
  }
}

module.exports = {
  PAYMENT_ACCESS_COOKIE,
  buildPaymentRoute,
  createPaymentAccessToken,
  isValidPaymentRouteId,
  verifyPaymentAccessToken,
  verifyPaymentAccessTokenForOrderNumber,
};
