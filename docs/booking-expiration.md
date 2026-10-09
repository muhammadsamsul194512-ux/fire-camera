# Booking concurrency and payment expiration

## Payment timeout

The project uses a 30-minute payment window for unpaid bookings. The deadline is stored in the `orders.payment_expires_at` column and mirrored to `payment.expires_at` when the payment record is created.

The core rules are:

- unpaid bookings only expire while they remain in `menunggu_pembayaran` or `menunggu_verifikasi`
- once expiry wins, the order status becomes `kedaluwarsa`
- the payment status is also set to `kedaluwarsa`
- an expired booking no longer blocks camera inventory
- confirmations after expiry are rejected by the API layer

## Database safeguards

The `public.buat_pesanan(...)` function re-checks camera availability and locks the camera row before allocating inventory. This prevents two requests from each thinking the last unit is still available.

The `public.expire_unpaid_bookings()` function marks expired unpaid bookings idempotently and safely updates both the order and payment records. It is safe to run repeatedly.

## Scheduled automation

### Preferred on Supabase

If your Supabase project has `pg_cron` enabled, run the following once in the SQL editor:

```sql
SELECT cron.schedule(
  'expire-unpaid-bookings',
  '*/5 * * * *',
  $$SELECT public.expire_unpaid_bookings();$$
);
```

If `pg_cron` is unavailable or disabled in your plan, use the internal API endpoint as the compatible fallback:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.example.com/api/cron/expire-bookings
```

Set `CRON_SECRET` in the deployment environment and keep it out of client code. The route is protected by a bearer token and only exposes the server-side RPC.

## Verification

To confirm the scheduler is working:

1. create a booking that remains unpaid
2. wait beyond `payment_expires_at`
3. query the order and payment records
4. validate that `orders.status` is `kedaluwarsa`
5. check that the camera inventory is immediately available again
