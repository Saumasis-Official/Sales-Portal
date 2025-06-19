/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    DROP SEQUENCE IF EXISTS shopify.runlogid CASCADE;

    DROP TABLE if exists shopify.uk_shopify_duplicacy_check;

    DROP TABLE if exists shopify.uk_shopify_duplicacy_check_stg;

    DROP TRIGGER if exists uk_duplicate_chk ON shopify.uk_shopify_duplicacy_check_stg;

    DROP FUNCTION if exists shopify.duplicate_chk_fun();
    `)
};

exports.down = pgm => {};
