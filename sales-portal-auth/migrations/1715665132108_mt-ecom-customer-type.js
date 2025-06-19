/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    Create table if not exists mt_ecom_customer_type (
        id bigserial NOT NULL PRIMARY KEY,
        customer_name varchar NOT NULL,
        customer_code varchar NOT NULL,
        customer_type varchar NOT NULL,
        created_on timestamptz DEFAULT now() NOT NULL,
        updated_on timestamptz 
        );
   `)
};

exports.down = pgm => {
    pgm.sql(
        `DROP TABLE if exists mt_ecom_customer_type`
    )
};
