/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TYPE public."mt_ecom_status_type" ADD VALUE 'SO Pending';
        `)
};

exports.down = pgm => {};
