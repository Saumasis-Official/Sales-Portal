/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`

        ALTER TABLE IF EXISTS order_history_recommendation DROP CONSTRAINT IF EXISTS order_history_recommendation_material_code_fkey;

        ALTER TABLE IF EXISTS material_master ALTER COLUMN code TYPE VARCHAR(18);

        ALTER TABLE IF EXISTS order_history_recommendation ALTER COLUMN material_code TYPE VARCHAR(18);
        
        ALTER TABLE IF EXISTS material_master ALTER COLUMN pak_code SET DEFAULT NULL;
        
        ALTER TABLE IF EXISTS material_master ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

        ALTER TABLE IF EXISTS order_history_recommendation ADD CONSTRAINT order_history_recommendation_material_code_fkey FOREIGN KEY (material_code) REFERENCES material_master(code);

    `);

};

exports.down = pgm => {

    pgm.sql(`
        
        ALTER TABLE IF EXISTS material_master DROP COLUMN IF EXISTS deleted;
    
    `);

};
