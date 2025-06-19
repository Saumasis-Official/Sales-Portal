/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS delivery_date_time TEXT[] DEFAULT NULL, ADD COLUMN IF NOT EXISTS invoice_date_time TEXT[] DEFAULT NULL, ADD COLUMN IF NOT EXISTS eway_bill_number TEXT[] DEFAULT NULL, ADD COLUMN IF NOT EXISTS eway_bill_date_time TEXT[] DEFAULT NULL; 
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS orders DROP COLUMN IF EXISTS delivery_date_time, DROP COLUMN IF EXISTS invoice_date_time, DROP COLUMN IF EXISTS eway_bill_number, DROP COLUMN IF EXISTS eway_bill_date_time;
    
    `);
}
