/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`ALTER TABLE public.forecast_upload_download_logs ALTER COLUMN region TYPE varchar USING region::varchar;`)
};

exports.down = pgm => {};
