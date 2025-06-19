/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TABLE IF EXISTS material_master ADD COLUMN IF NOT EXISTS brand TEXT;
        ALTER TABLE IF EXISTS material_master ADD COLUMN IF NOT EXISTS brand_desc TEXT;
        ALTER TABLE IF EXISTS material_master ADD COLUMN IF NOT EXISTS brand_variant TEXT;
        ALTER TABLE IF EXISTS material_master ADD COLUMN IF NOT EXISTS brand_variant_desc TEXT;
        `)
};

exports.down = pgm => { };
