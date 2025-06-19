/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        CREATE TABLE if not exists shopify.uk_shopify_duplicacy_check_stg (
            id_number varchar(15) NULL,
            order_number varchar(20) NULL,
            tracking_id varchar(25) NULL,
            transaction_date timestamp NULL,
            process_date timestamp NULL
        );
        `)
};

exports.down = pgm => {
    pgm.sql(`
        DROP TABLE if exists shopify.uk_shopify_duplicacy_check_stg;
        `)
};
