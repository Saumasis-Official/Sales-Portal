/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        CREATE TABLE public.distributor_pricing_master (
	id serial4 NOT NULL,
	distributor_code varchar(20) NOT NULL,
	customer_group_code varchar NOT NULL,
	area_code varchar(10) NOT NULL,
	order_details jsonb NOT NULL,
	error_details jsonb NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT distributor_pricing_master_pkey PRIMARY KEY (id),
	CONSTRAINT distributor_pricing_master_distributor_code_fkey FOREIGN KEY (distributor_code) REFERENCES public.distributor_master(id) ON DELETE CASCADE,
	CONSTRAINT distributor_pricing_master_fk FOREIGN KEY (customer_group_code) REFERENCES public.customer_group_master("name")
);
            `);
};

exports.down = pgm => {
    pgm.sql(`
        DROP TABLE distributor_pricing_master;
    `);
};
