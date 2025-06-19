/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'forecast_sync_type') THEN
                CREATE TYPE public.forecast_sync_type AS ENUM (
                    'SALES_ALLOCATION',
                    'MONTHLY_SALES'
                );
            END IF;
            ALTER TABLE public.forecast_sync_status ADD COLUMN IF NOT EXISTS start_month date NULL;
            ALTER TABLE public.forecast_sync_status ADD COLUMN IF NOT EXISTS end_month date NULL;
            ALTER TABLE public.forecast_sync_status ADD COLUMN IF NOT EXISTS sync_type public.forecast_sync_type NULL;
            ALTER TABLE public.forecast_sync_status ADD COLUMN IF NOT EXISTS forecast_dump_method varchar NULL;
        END
        $$;
        `);
};

exports.down = (pgm) => {};
