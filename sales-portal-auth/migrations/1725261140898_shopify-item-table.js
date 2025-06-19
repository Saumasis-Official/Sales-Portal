/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    ALTER TABLE shopify.shopify_item_table ADD CONSTRAINT shopify_item_table_po_id_fkey FOREIGN KEY (po_id) REFERENCES shopify.shopify_header_table(id) ON DELETE CASCADE;
    `)
};

exports.down = pgm => {};
