/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        BEGIN;
            ALTER TABLE IF EXISTS area_codes ADD COLUMN IF NOT EXISTS group5_id int4;
            ALTER TABLE IF EXISTS area_codes ADD CONSTRAINT area_codes_group5_id_fkey FOREIGN KEY (group5_id) REFERENCES group5_master(id);
            INSERT INTO area_codes (code , group5_id)
                SELECT DISTINCT ON(dm.area_code) dm.area_code AS code, dm.group5_id 
                FROM distributor_master dm
                WHERE dm.area_code IS NOT NULL AND dm.group5_id IS NOT NULL
            ON CONFLICT (code) DO UPDATE SET group5_id = EXCLUDED.group5_id;
        COMMIT;
    `);
};

exports.down = pgm => {
    pgm.sql(`
        ALTER TABLE IF EXISTS cfa_depot_mapping DROP CONSTRAINT IF EXISTS area_codes_group5_id_fkey;
        ALTER TABLE IF EXISTS area_codes DROP COLUMN IF EXISTS group5_id;
    `);
};






