const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcMidnight(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  const [year, month, day] = date.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return timestamp;
}

/** Each rental day is one complete 24-hour period. Booking slots keep the
 * same local pickup and return time, so date distance is elapsed-day count.
 */
function calculateRentalDays(tanggalAmbil, tanggalKembali) {
  const start = toUtcMidnight(tanggalAmbil);
  const end = toUtcMidnight(tanggalKembali);
  if (start === null || end === null || end <= start) return 0;
  const days = (end - start) / MS_PER_DAY;
  return Number.isInteger(days) ? days : 0;
}

module.exports = { calculateRentalDays };
