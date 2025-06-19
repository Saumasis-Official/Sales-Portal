/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    CREATE index if not exists idx_po_id ON mt_ecom_item_table (po_id);
    CREATE index if not exists idx_status ON mt_ecom_item_table (status);
    CREATE index if not exists idx_po_number ON mt_ecom_header_table (po_number);
    CREATE index if not exists idx_status ON mt_ecom_header_table (status);
    Alter table mt_ecom_item_table add column if not exists switchover_sku numeric;
    Alter table mt_ecom_item_table add CONSTRAINT mt_ecom_item_table_un UNIQUE (po_id,item_number);
    `)
};

exports.down = pgm => {};
