/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    CREATE TYPE mt_ecom_po_type AS ENUM (
        'PDF',
        'XML',
        'EMAIL',
        'JSON'
    );
    CREATE TABLE public.mt_ecom_workflow_type (
        id serial4 NOT NULL,
        customer varchar NOT NULL,
        po_format bool NULL DEFAULT false,
        article bool NULL DEFAULT false,
        mrp_1 bool NULL DEFAULT false,
        mrp_2 bool NULL DEFAULT false,
        caselot bool NULL DEFAULT false,
        base_price bool NULL DEFAULT false,
        invoice bool NULL DEFAULT false,
        asn bool NULL DEFAULT false,
        po_type mt_ecom_po_type NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NULL DEFAULT now(),
        CONSTRAINT mt_ecom_workflow_type_pkey PRIMARY KEY (id),
        CONSTRAINT mt_ecom_workflow_type_ukey UNIQUE (customer)
    );
    
   `)
};

exports.down = pgm => {
    pgm.sql(
        `DROP TABLE if exists mt_ecom_workflow_type`
    )
};
