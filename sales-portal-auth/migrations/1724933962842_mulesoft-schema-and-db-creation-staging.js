/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    CREATE TABLE IF NOT EXISTS shopify.uk_shopify_duplicacy_check_stg
    (
    id_number character varying(15) COLLATE pg_catalog."default",
    order_number character varying(20) COLLATE pg_catalog."default",
    tracking_id character varying(25) COLLATE pg_catalog."default",
    transaction_date timestamp without time zone,
    allow_reprocess_flag character varying(1) COLLATE pg_catalog."default",
    reprocess_date timestamp without time zone,
    reprocess_count numeric(18,0)
    )
    `);
};

exports.down = pgm => {
    pgm.sql(`
    DROP TABLE IF EXISTS shopify.uk_shopify_duplicacy_check_stg;
    `);
};
