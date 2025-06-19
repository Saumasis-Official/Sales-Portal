/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TABLE public.mt_ecom_header_table ADD "others" jsonb NULL;
        ALTER TABLE public.mt_ecom_header_table ADD "location" varchar NULL;
        ALTER TABLE public.mt_ecom_item_table ALTER COLUMN customer_product_id TYPE varchar(255) USING customer_product_id::varchar;
        ALTER TABLE public.mt_ecom_item_table ALTER COLUMN ean TYPE varchar(255) USING ean::varchar;
        ALTER TABLE public.mt_ecom_header_table ADD po_created_timestamp timestamptz NULL;
         `)
};

exports.down = pgm => {
    pgm.sql(`
        ALTER TABLE public.mt_ecom_header_table DROP COLUMN IF EXISTS "others";
        ALTER TABLE public.mt_ecom_header_table DROP COLUMN IF EXISTS "location";
        ALTER TABLE public.mt_ecom_item_table ALTER COLUMN customer_product_id TYPE varchar USING customer_product_id::varchar;
        ALTER TABLE public.mt_ecom_item_table ALTER COLUMN ean TYPE varchar USING ean::varchar;
        ALTER TABLE public.mt_ecom_header_table DROP COLUMN IF EXISTS po_created_timestamp;
    `);
};