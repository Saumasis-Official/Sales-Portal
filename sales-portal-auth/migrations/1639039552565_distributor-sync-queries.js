/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS region_master ADD CONSTRAINT region_master_ukey UNIQUE (code);

        ALTER TABLE IF EXISTS plant_master ADD CONSTRAINT plant_master_ukey UNIQUE (name);
        
        ALTER TABLE IF EXISTS customer_group_master ADD CONSTRAINT customer_group_master_ukey UNIQUE (name);
        
        ALTER TABLE IF EXISTS distributor_plants ADD CONSTRAINT distributor_plants_ukey UNIQUE (distributor_id, plant_id);
        
        ALTER TABLE IF EXISTS distributor_master ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

        CREATE TABLE IF NOT EXISTS group5_master (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            description VARCHAR(255),
            status entity_status NOT NULL DEFAULT 'ACTIVE',
            created_on timestamptz NOT NULL DEFAULT NOW(),
            updated_on timestamptz NULL DEFAULT NOW()
        );
        
        ALTER TABLE IF EXISTS distributor_master ADD COLUMN IF NOT EXISTS group5_id INT DEFAULT NULL;

        ALTER TABLE IF EXISTS distributor_master ADD FOREIGN KEY (group5_id) REFERENCES group5_master (id);

        ALTER TABLE IF EXISTS group5_master ADD CONSTRAINT group5_master_ukey UNIQUE (name);

        ALTER TABLE IF EXISTS region_master DROP COLUMN IF EXISTS name_code, DROP COLUMN IF EXISTS name;
        
        ALTER TABLE IF EXISTS sync_logs ADD COLUMN IF NOT EXISTS error_log varchar(2000) DEFAULT NULL;
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS region_master DROP CONSTRAINT IF EXISTS region_master_ukey;

        ALTER TABLE IF EXISTS plant_master DROP CONSTRAINT IF EXISTS plant_master_ukey;
        
        ALTER TABLE IF EXISTS customer_group_master DROP CONSTRAINT IF EXISTS customer_group_master_ukey;
        
        ALTER TABLE IF EXISTS distributor_plants DROP CONSTRAINT IF EXISTS distributor_plants_ukey;
        
        ALTER TABLE IF EXISTS distributor_master DROP COLUMN IF EXISTS deleted;
        
        ALTER TABLE IF EXISTS distributor_master DROP CONSTRAINT distributor_master_group5_id_fkey;

        DROP TABLE IF EXISTS group5_master;
        
        ALTER TABLE IF EXISTS distributor_master DROP COLUMN IF EXISTS group5_id;

        ALTER TABLE IF EXISTS region_master ADD COLUMN IF NOT EXISTS name_code varchar(50) NULL, ADD COLUMN IF NOT EXISTS name varchar(225);
        
        ALTER TABLE IF EXISTS sync_logs DROP COLUMN IF EXISTS error_log;
    
    `);

};
