/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        UPDATE auto_closure_gt SET deleted = TRUE 
        WHERE customer_group IN ('15', '17')
        `);
};

exports.down = (pgm) => {};
