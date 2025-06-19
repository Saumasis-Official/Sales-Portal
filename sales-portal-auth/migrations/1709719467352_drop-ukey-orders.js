/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
            BEGIN;
                ALTER TABLE IF EXISTS orders 
                    DROP CONSTRAINT IF EXISTS orders_po_number_key CASCADE;
                ALTER TABLE IF EXISTS orders 
                    ADD COLUMN IF NOT EXISTS po_number_index NUMERIC NOT NULL DEFAULT 1;
                ALTER TABLE IF EXISTS orders
                    ADD CONSTRAINT orders_po_po_index_ukey UNIQUE (po_number,po_number_index);
            COMMIT;
        `);
};

exports.down = pgm => {  
    pgm.sql(``);
};
