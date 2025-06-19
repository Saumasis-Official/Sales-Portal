/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        CREATE TABLE if not exists shopify.shopify_item_table (
        id bigserial NOT NULL,
        po_id int8 NULL,
        item_number varchar NULL,
        material_code varchar NULL,
        customer_material_code varchar NULL,
        order_quantity varchar NULL,
        sales_unit varchar NULL,
        sales_order varchar NULL,
        so_date timestamp NULL,
        item_conditions _jsonb NULL,
        message varchar NULL,
        ror varchar NULL,
        item_category varchar NULL,
        created_on timestamp NULL,
        updated_on timestamp NULL,
        updated_by varchar NULL,
        material_description varchar NULL,
        ror_trail varchar NULL,
        CONSTRAINT shopify_item_table_un UNIQUE (po_id, item_number),
        CONSTRAINT shopify_item_table_po_id_fkey FOREIGN KEY (po_id) REFERENCES shopify.shopify_header_table(id) ON DELETE CASCADE
    );
        `)
};

exports.down = pgm => {
    pgm.sql(`
        DROP TABLE if exists shopify.shopify_item_table;
        `)
};
