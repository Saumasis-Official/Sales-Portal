/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    create type mt_ecom_status_type as enum ('MRP Success', 'Acknowledgement Success', 'Caselot Success', 'SO Success','Validation Success','Article Success','MRP 2 Success', 'ASN Sent','Invoice Pending',
    'Invoice Success','MRP Failed','Acknowledgement Failed','Caselot Failed','SO Failed','Validation Failed','Article Failed','MRP 2 Failed', 'Partial Invoice');
    `);
};

exports.down = pgm => {
    pgm.sql(`
    drop type mt_ecom_status_type;
    `);
};
