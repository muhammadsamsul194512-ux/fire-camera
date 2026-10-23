DO $$
DECLARE
  v_jobid integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'pg_cron'
  ) THEN
    RAISE EXCEPTION 'pg_cron is not enabled in this Supabase project. Enable the extension before registering the expire-unpaid-bookings cron job.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'expire_unpaid_bookings'
  ) THEN
    RAISE EXCEPTION 'public.expire_unpaid_bookings() is missing. Apply the booking-expiration migration before registering the cron job.';
  END IF;

  SELECT jobid INTO v_jobid
  FROM cron.job
  WHERE jobname = 'expire-unpaid-bookings';

  IF v_jobid IS NULL THEN
    PERFORM cron.schedule(
      'expire-unpaid-bookings',
      '*/5 * * * *',
      $cron$SELECT * FROM public.expire_unpaid_bookings();$cron$
    );
  END IF;
END $$;
