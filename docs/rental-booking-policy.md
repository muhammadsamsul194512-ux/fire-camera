# Rental booking policy

Each rental day is one complete 24-hour period. Customers choose an hourly pickup slot; the return is set to the same local time after the selected number of days. The product currently uses same-time pickup and return slots so no rounding or owner exception is needed to preserve the rented duration.

The proposed operating schedule defaults to 08:00 through 20:00 WIB, inclusive, in whole-hour slots. These values live in `settings.rental_open_hour` and `settings.rental_close_hour`; changing them updates the public settings response, customer slot list, availability validation, and atomic booking validation. The latest scheduled slot must remain no later than 20:00. There is no preparation/cleaning buffer configured, so adjacent intervals may touch exactly.

The booking UI calculates a preview using the calendar-day difference because the selected pickup and return times are identical. The `buat_pesanan` database function independently validates that slot and computes `jumlah_hari` and `total_harga` from the camera's saved daily price and requested quantity. Payment and order pages display the stored order amount; they do not reinterpret duration.

Booking creation time and its 30-minute payment deadline remain separate from the scheduled rental start. Unpaid orders reserve inventory only until their payment deadline; submitted payment proofs and confirmed/rented bookings follow the existing reservation lifecycle.

Apply `supabase/migrations/20261026_full_day_rental_slots.sql` through the project's normal reviewed migration process before deploying this application code. This change does not backfill or rewrite historical orders.
