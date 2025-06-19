/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    CREATE TABLE if not exists shopify.canada_shopify_duplicacy_check (
	id_number varchar(15) NOT NULL,
	order_number varchar(20) NOT NULL,
	tracking_id varchar(25) NULL,
	transaction_date timestamp NULL,
	process_date timestamp NULL,
	payout_id varchar(20) NULL,
	CONSTRAINT canada_shopify_duplicacy_check_pk PRIMARY KEY (id_number, order_number)
);

        `)
};

exports.down = pgm => {
    pgm.sql(`
        Drop table if exists shopify.canada_shopify_duplicacy_check;
        `)
};
