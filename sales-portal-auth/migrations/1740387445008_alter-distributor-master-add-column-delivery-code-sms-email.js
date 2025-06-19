/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TABLE IF EXISTS distributor_master ADD COLUMN IF NOT EXISTS delivery_code_sms_enable boolean DEFAULT FALSE;    
        ALTER TABLE IF EXISTS distributor_master ADD COLUMN IF NOT EXISTS delivery_code_email_enable boolean DEFAULT FALSE;    
        ALTER TABLE IF EXISTS staging.distributor_master_staging ADD COLUMN IF NOT EXISTS delivery_code_sms_enable boolean DEFAULT FALSE; 
        ALTER TABLE IF EXISTS staging.distributor_master_staging ADD COLUMN IF NOT EXISTS delivery_code_email_enable boolean DEFAULT FALSE; 
    `)
};

exports.down = pgm => {};
