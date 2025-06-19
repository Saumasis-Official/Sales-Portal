/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        ALTER TABLE IF EXISTS public.sap_holidays ADD COLUMN IF NOT EXISTS plant varchar DEFAULT NULL;
        ALTER TABLE IF EXISTS public.sap_holidays ADD COLUMN IF NOT EXISTS plant_description varchar DEFAULT NULL;
    `);
};

exports.down = (pgm) => {
    pgm.sql(`
        ALTER TABLE IF EXISTS public.sap_holidays DROP COLUMN IF EXISTS plant;
        ALTER TABLE IF EXISTS public.sap_holidays DROP COLUMN IF EXISTS plant_description;
    `);
};
