/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.promise_credit (
        id bigserial NOT NULL,
        distributor_id varchar(20) NOT NULL,
        created_on timestamptz NOT NULL DEFAULT now(),
        input_type varchar(255),
        reference_date date,
        plant varchar(255),
        order_value varchar(255),
        open_order_value varchar(255),
        credit_shortfall varchar(255),
        promised_credit_date date,
        promised_credit_time time,
        promised_credit varchar(255),
        promised_credit_type varchar(255),
        confirmed_by varchar(255) NOT NULL,
        po_number varchar(255) NOT NULL,
        updated_on timestamp with time zone DEFAULT now(),
        CONSTRAINT promise_credit_pkey PRIMARY KEY (id),
        CONSTRAINT promise_credit_fk_distributor FOREIGN KEY (distributor_id) references public.distributor_master(id) 
        ON DELETE cascade ON UPDATE CASCADE,
        CONSTRAINT unique_distributor_po_number UNIQUE (distributor_id, po_number)
    );
    `);
};

exports.down = pgm => {
    pgm.sql(` DROP TABLE IF EXISTS promise_credit;`);
};
