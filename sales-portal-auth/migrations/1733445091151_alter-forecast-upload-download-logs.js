/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TABLE IF EXISTS public.forecast_upload_download_logs ADD COLUMN IF NOT EXISTS allocation_done BOOLEAN DEFAULT FALSE;
        `)
};

exports.down = pgm => {

    pgm.sql(`
        ALTER TABLE IF EXISTS public.forecast_upload_download_logs DROP COLUMN IF EXISTS allocation_done;
        `)
};
