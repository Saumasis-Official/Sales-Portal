/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    CREATE TABLE IF NOT EXISTS mt_ecom_item_table
    (
        id SERIAL PRIMARY KEY,
        po_id SERIAL,
        item_number varchar(5),
        caselot numeric,
        customer_product_id numeric,
        ean numeric,
        message varchar(200),
        status mt_ecom_status_type Null,
        mrp numeric,
        psku_code numeric,
        psku_description varchar(200),
        plant_code numeric,
        po_item_description varchar(200),
        response_item_number varchar(5),
        sales_order varchar(15),
        sales_unit varchar(5),
        site_code varchar(5),
        system_sku_code numeric,
        system_sku_description varchar(200),
        target_qty numeric,
        unique_id varchar(50),
        invoice_number varchar(50),
        invoice_mrp numeric,
        invoice_quantity numeric,
        delivery_quantity numeric,
        invoice_date timestamp,
        asn_date timestamp,
        updated_mrp numeric,
        updated_caselot numeric,
        updated_mrp2 numeric,
        created_on timestamp with time zone DEFAULT NOW(),
        updated_on timestamp with time zone DEFAULT NOW(),
        is_deleted boolean DEFAULT false,
        FOREIGN KEY (po_id) REFERENCES mt_ecom_header_table(id) ON DELETE CASCADE
    );`);
};

exports.down = pgm => {
    pgm.sql(`
    DROP TABLE IF EXISTS mt_item_table;
    `);
};