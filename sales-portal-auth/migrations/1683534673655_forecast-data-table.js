/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        CREATE TABLE IF NOT EXISTS forecast_data  (
            key bigserial NOT NULL PRIMARY KEY,
            sold_to_party character varying NOT NULL,
            asm_code character varying(6) NOT NULL,
            year_month character varying(6) NOT NULL,
            parent_sku character varying NOT NULL,
            product_hierarchy character varying(18) NOT NULL,
            customer_name character varying NOT NULL,
            billing_quantity_in_base_unit numeric NOT NULL,
            billing_quantity_in_base_unit_sum numeric NOT NULL,
            percentage_sales numeric NOT NULL,
            total_months_avg numeric NOT NULL,
            qty numeric NOT NULL,
            by_allocation  numeric NOT NULL,
            parent_desc character varying NOT NULL,
            brand_variant character varying NOT NULL,
            regional_brand character varying NOT NULL,
            grammage character varying NOT NULL,
            base_unit character varying NOT NULL,
            weight_unit character varying NOT NULL,
            alternative_unit character varying NOT NULL,
            quantity_numerator integer NOT NULL,
            quantity_denominator integer NOT NULL,
            created_on timestamptz NULL DEFAULT NOW()
        );
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        DROP TABLE IF EXISTS forecast_data;
    
    `);

};
