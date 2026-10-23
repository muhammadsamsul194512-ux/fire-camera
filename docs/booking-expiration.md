# Booking concurrency and payment expiration

## Payment and replacement proof deadlines

An unpaid booking has a 30-minute deadline in `orders.payment_expires_at`, mirrored to `payment.expires_at`. Only an order/payment pair still in `menunggu_pembayaran`, without a submitted proof, expires at that deadline.

After proof storage succeeds, `submit_payment_proof(...)` atomically records its reference and changes both records to `menunggu_verifikasi`. The initial deadline remains historical and is not used while an admin reviews a submitted proof.

When an admin requests a replacement proof, `payment.reupload_expires_at` is set to 30 minutes from the request. The customer must submit while payment is `perlu_upload_ulang`; the successful submission clears that deadline and returns payment to `menunggu_verifikasi`. An overdue replacement request expires the order and payment. An explicit rejection remains terminal and does not permit upload.

The customer access token lasts 90 days so payment status and an admin-requested replacement remain accessible after the initial 30-minute window. The database functions independently validate every applicable deadline and status.

## Inventory and database safeguards

Orders in `menunggu_pembayaran` reserve inventory until their payment deadline. Orders in `menunggu_verifikasi` reserve inventory while a submitted proof is reviewed. A replacement request stops reserving inventory once its separate deadline passes. Confirmed and rented orders continue to reserve inventory according to their rental dates.

`public.buat_pesanan(...)` locks the camera row and checks the same reservation policy before allocating stock. `public.expire_unpaid_bookings()` safely expires only unpaid orders or overdue replacement requests, and is safe to run repeatedly. Submitted proofs waiting for review are not expired by the original deadline.

Apply the versioned Supabase migrations to the target database to install the separate replacement deadline and updated functions. These repository changes do not apply migrations to production.

## Scheduled automation

Migration `20261012_supabase_cron_expire_unpaid_bookings.sql` registers or reactivates the existing `pg_cron` job every five minutes. The migration added in October 2026 replaces the function body without changing its signature, so the existing job continues to call the corrected policy.

If `pg_cron` is unavailable or disabled, use the protected API endpoint as a fallback:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.example.com/api/cron/expire-bookings
```

## Schema inspection

The repository migrations define the `orders.payment_expires_at`, `orders.expired_at`, and `payment.expires_at` fields but did not include a base schema or status constraint definition. The read-only Supabase inspection confirmed those fields and observed `menunggu_verifikasi` payment records; PostgREST does not expose `information_schema`, so it could not report the live constraints or Cron catalog. No production migration was applied.
