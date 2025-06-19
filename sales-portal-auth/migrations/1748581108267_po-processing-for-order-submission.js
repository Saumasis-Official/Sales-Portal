/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS po_processing_for_order_submission (
            po_number varchar primary key
        );`);
};

exports.down = (pgm) => {};
