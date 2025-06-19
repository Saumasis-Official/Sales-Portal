/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        create trigger uk_duplicate_chk after
        insert
            on
            shopify.uk_shopify_duplicacy_check_stg for each row execute function shopify.duplicate_chk_fun();
        `)
};

exports.down = pgm => {};
