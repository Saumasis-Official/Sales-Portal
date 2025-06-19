/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
            ALTER TABLE IF EXISTS material_master ADD COLUMN IF NOT EXISTS ton_to_suom NUMERIC DEFAULT NULL;
        `);
};

exports.down = pgm => {  
    pgm.sql(`
            ALTER TABLE IF EXISTS material_master DROP COLUMN IF NOT EXISTS ton_to_suom;
        `);
};
