/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
CREATE TABLE if not exists public.mt_ecom_header_table (
	id bigserial NOT NULL PRIMARY KEY,
    request_count numeric NULL,
    site_code varchar(10) NULL,
	po_created_date timestamp NULL,
	delivery_date timestamp NULL,
	so_created_date timestamp NULL,
	po_number varchar(15) NOT NULL,
	so_number varchar(15) NULL,
	invoice_number text[] NULL,
	status mt_ecom_status_type NULL,
	xml_file_name text NULL,
	json_file_name text NULL,
	unique_id varchar(50) NULL,
	created_on timestamptz NULL DEFAULT now(),
	updated_on timestamptz NULL,
	is_deleted bool NULL DEFAULT false,
	CONSTRAINT unique_po_number UNIQUE (po_number)
);`)
};

exports.down = pgm => {
    pgm.sql(`DROP TABLE public.mt_header_table;`)
};
