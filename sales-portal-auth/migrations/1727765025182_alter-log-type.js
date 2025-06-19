/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TYPE public.email_type ADD VALUE 'SHOPIFY_REPORTS';
        `)
};

exports.down = pgm => {};
