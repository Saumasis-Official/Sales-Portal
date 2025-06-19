/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        CREATE TABLE if not exists shopify.shopify_header_table (
        id bigserial NOT NULL,
        sales_org varchar NULL,
        disribution_channel varchar NULL,
        division varchar NULL,
        currency_code varchar NULL,
        "order_type" varchar NULL,
        po_number varchar NULL,
        sales_order varchar NULL,
        customer varchar NULL,
        po_date timestamp NULL,
        rdd timestamp NULL,
        status shopify."po_status_type" NULL,
        ship_cond varchar NULL,
        ship_type varchar NULL,
        compl_div varchar NULL,
        order_partners _jsonb NULL,
        header_conditions _jsonb NULL,
        json_file_key varchar NULL,
        created_on timestamp NULL,
        updated_on timestamp NULL,
        updated_by varchar NULL,
        so_date timestamp NULL,
        ror varchar NULL,
        CONSTRAINT shopify_header_table_pk PRIMARY KEY (id),
        CONSTRAINT unique_po_number UNIQUE (po_number) 
    );

        `)
};

exports.down = pgm => {
    pgm.sql(`
        DROP TABLE if exists shopify.shopify_header_table;
        `)
};
