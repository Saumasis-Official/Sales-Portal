/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    CREATE TABLE IF NOT EXISTS mdm_material_data
    (
        id SERIAL PRIMARY KEY,
        psku numeric NOT NULL,
        psku_desc varchar(200) NOT NULL,
        sku numeric NOT NULL,
        sku_desc varchar(200) NOT NULL,
        division varchar(100) NOT NULL,
        article_id varchar(100),
        article_desc varchar(200),
        plant_code numeric NOT NULL,
        site_code varchar(20) NOT NULL,
        customer_code numeric NOT NULL,
        customer_name varchar(100) NOT NULL,
        vendor_code numeric NOT NULL,
        region varchar(50) NOT NULL,
        status boolean NOT NULL DEFAULT true,
        vendor_name varchar(100) NOT NULL,
        mrp numeric,
        caselot numeric,
        created_on timestamp with time zone DEFAULT NOW(),
        updated_on timestamp with time zone DEFAULT NOW(),
        is_deleted boolean DEFAULT false,
        updated_by varchar(255)
    );`);
};

exports.down = pgm => {};
