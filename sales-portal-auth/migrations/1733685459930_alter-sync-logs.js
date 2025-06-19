/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        BEGIN;
            ALTER TYPE sync_type ADD VALUE IF NOT EXISTS 'ARS_FORECAST_DUMP';
            ALTER TYPE sync_type ADD VALUE IF NOT EXISTS 'ARS_FORECAST_ALLOCATION';
            ALTER TYPE sync_type ADD VALUE IF NOT EXISTS 'ARS_PHASING';
        COMMIT;
        `);

    pgm.sql(`

        ALTER TABLE public.sync_logs ADD COLUMN IF NOT EXISTS "configurations" JSONB;

        INSERT INTO public.sync_logs (type, run_at, result) 
        VALUES 
            ('ARS_FORECAST_DUMP', now(), 'SUCCESS'),
            ('ARS_FORECAST_ALLOCATION', now(), 'SUCCESS'),
            ('ARS_PHASING', now(), 'SUCCESS');
        `);
};

exports.down = pgm => {
    pgm.sql(`
        ALTER TABLE public.sync_logs DROP COLUMN IF EXISTS "configurations";
        `);
};
