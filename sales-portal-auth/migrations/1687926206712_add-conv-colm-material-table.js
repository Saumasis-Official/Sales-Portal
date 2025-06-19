/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    ALTER TABLE IF EXISTS material_master ADD COLUMN IF NOT EXISTS buom_to_cs NUMERIC DEFAULT NULL;
    ALTER TABLE IF EXISTS material_master ADD COLUMN IF NOT EXISTS pak_to_cs NUMERIC DEFAULT NULL;`);
};

exports.down = pgm => {  
    pgm.sql(`
    ALTER TABLE IF EXISTS material_master DROP COLUMN IF NOT EXISTS buom_to_cs;
    ALTER TABLE IF EXISTS material_master DROP COLUMN IF NOT EXISTS pak_to_cs;`);
};
