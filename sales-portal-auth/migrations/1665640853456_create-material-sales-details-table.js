/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
  
        CREATE TABLE IF NOT EXISTS material_sales_details (
            id serial PRIMARY KEY,
            material_code varchar NOT NULL,
            sales_org int NULL,
            distribution_channel int NULL,
            division int NULL,
            line_of_business varchar NULL,
            unit_of_measurement varchar NULL,
            conversion_factor varchar NULL,
            FOREIGN KEY (material_code) REFERENCES material_master (code)
        );

    `);

};

exports.down = pgm => {

    pgm.sql(`

        DROP TABLE IF EXISTS material_sales_details;

    `);

};
