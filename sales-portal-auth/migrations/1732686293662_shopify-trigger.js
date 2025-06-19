/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        create trigger canada_duplicate_chk after
        insert
            on
            shopify.canada_shopify_duplicacy_check_stg for each row execute function shopify.canada_duplicate_chk_fun();
        `)
};

exports.down = pgm => {
    pgm.sql(`
        drop trigger canada_duplicate_chk;
        `)
};
