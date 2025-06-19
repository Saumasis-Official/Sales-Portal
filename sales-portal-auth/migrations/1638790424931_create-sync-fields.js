/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        ALTER TYPE sync_type ADD VALUE IF NOT EXISTS 'SO';
        ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS so_value varchar(15) DEFAULT NULL, ADD COLUMN IF NOT EXISTS delivery_no varchar(20) DEFAULT NULL, ADD COLUMN IF NOT EXISTS invoice_no varchar(20) DEFAULT NULL;
        ALTER TABLE IF EXISTS sync_logs ADD COLUMN IF NOT EXISTS distributor_id varchar(20) DEFAULT NULL;
        ALTER TABLE IF EXISTS material_master ALTER COLUMN sales_unit SET DEFAULT NULL;
    
    `);

};

exports.down = pgm => { 

    pgm.sql(`
    
        ALTER TABLE IF EXISTS orders DROP COLUMN IF EXISTS so_value, DROP COLUMN IF EXISTS delivery_no, DROP COLUMN IF EXISTS invoice_no;
        ALTER TABLE IF EXISTS sync_logs DROP COLUMN IF EXISTS distributor_id;
    
    `);

};
