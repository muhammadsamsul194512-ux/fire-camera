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

/**
 * Rental dates use an exclusive return-date convention. A return on the next
 * calendar date is one rental day; a return on the pickup date is also a
 * one-day rental, provided its return time is later (validated by the API).
 */
function calculateRentalDays(tanggalAmbil, tanggalKembali) {
  const start = toUtcMidnight(tanggalAmbil);
  const end = toUtcMidnight(tanggalKembali);
  if (start === null || end === null || end < start) return 0;
  return Math.max(1, (end - start) / MS_PER_DAY);
}

module.exports = { calculateRentalDays };
