/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS distributor_plants ADD COLUMN IF NOT EXISTS sales_org INT DEFAULT NULL;
        ALTER TABLE IF EXISTS distributor_plants ADD COLUMN IF NOT EXISTS distribution_channel INT DEFAULT NULL;
        ALTER TABLE IF EXISTS distributor_plants ADD COLUMN IF NOT EXISTS division INT DEFAULT NULL;
        ALTER TABLE IF EXISTS distributor_plants ADD COLUMN IF NOT EXISTS line_of_business INT DEFAULT NULL;

        ALTER TABLE IF EXISTS distributor_plants DROP CONSTRAINT IF EXISTS distributor_plants_ukey;

        ALTER TABLE IF EXISTS distributor_plants ADD CONSTRAINT distributor_plants_ukey UNIQUE (distributor_id, plant_id, sales_org, distribution_channel, division, line_of_business);
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS distributor_plants DROP COLUMN IF EXISTS sales_org;
        ALTER TABLE IF EXISTS distributor_plants DROP COLUMN IF EXISTS distribution_channel;
        ALTER TABLE IF EXISTS distributor_plants DROP COLUMN IF EXISTS division;
        ALTER TABLE IF EXISTS distributor_plants DROP COLUMN IF EXISTS line_of_business;

        ALTER TABLE IF EXISTS distributor_plants DROP CONSTRAINT IF EXISTS distributor_plants_ukey;
    `);

};
