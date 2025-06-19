/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
        CREATE INDEX IF NOT EXISTS idx_audit_trail_item_reference 
            ON mt_ecom_audit_trail(reference_column, item_number);
        `)
};

exports.down = pgm => {
    pgm.sql(`
        DROP INDEX IF EXISTS idx_audit_trail_item_reference;
        `)
};
