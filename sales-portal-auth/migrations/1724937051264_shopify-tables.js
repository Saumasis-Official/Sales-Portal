/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'shopify_customer' AND n.nspname = 'shopify') THEN
        CREATE TYPE shopify.shopify_customer AS ENUM (
    'SHOPIFY US',
    'SHOPIFY UK'
);
        END IF;
    END
    $$;

    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'po_status_type' AND n.nspname = 'shopify') THEN
        create type shopify.po_status_type as enum (
    'Open',
    'Closed',
    'Not Processed'
    );
        END IF;
    END
    $$;
    commit;
    CREATE TABLE IF NOT EXISTS shopify.shopify_header_table(
        id bigserial NOT NULL,
        sales_org varchar,
        disribution_channel varchar,
        division varchar,
        currency_code varchar,
        order_type varchar,
        po_number varchar,
        sales_order varchar,
        customer shopify.shopify_customer,
        po_date timestamp,
        rdd timestamp,
        status shopify.po_status_type,
        ship_cond varchar,
        ship_type varchar,
        compl_div varchar,
        order_partners jsonb[],
        header_conditions jsonb[],
        json_file_key varchar,
        created_on timestamp,
        updated_on timestamp,
        updated_by varchar,
        CONSTRAINT shopify_header_table_pk PRIMARY KEY (id),
        CONSTRAINT unique_po_number UNIQUE (po_number)
    );
    CREATE TABLE IF NOT EXISTS shopify.shopify_item_table(
        id bigserial NOT NULL,
        po_id bigint,
        item_number varchar,
        material_code varchar,
        customeR_material_code varchar,
        order_quantity varchar,
        sales_unit varchar,
        sales_order varchar,
        so_date timestamp,
        item_conditions jsonb[],
        message varchar,
        ror varchar,
        item_category varchar,
        created_on timestamp,
        updated_on timestamp,
        updated_by varchar,
        CONSTRAINT shopify_item_table_un UNIQUE (po_id, item_number)
    )
    `)
};

exports.down = pgm => {};
