/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        CREATE TABLE if not exists shopify.uk_shopify_duplicacy_check (
        id_number varchar(15) NOT NULL,
        order_number varchar(20) NOT NULL,
        tracking_id varchar(25) NULL,
        transaction_date timestamp NULL,
        process_date timestamp NULL,
        CONSTRAINT pk_uk_transaction_check PRIMARY KEY (id_number, order_number)
    );
    CREATE INDEX idx_transaction_check ON shopify.uk_shopify_duplicacy_check USING btree (id_number, order_number);
        `)
};

exports.down = pgm => {
    pgm.sql(`
        DROP TABLE if exists shopify.uk_shopify_duplicacy_check;
        `)
};
