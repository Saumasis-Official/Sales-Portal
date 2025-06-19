/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    ALTER TABLE IF EXISTS public.forecast_distribution ADD IF NOT EXISTS "class" varchar(1) NULL;
    `);
};

exports.down = pgm => {
    pgm.sql(`
    ALTER TABLE IF EXISTS public.forecast_distribution DROP IF EXISTS "class" ;
`);
};
