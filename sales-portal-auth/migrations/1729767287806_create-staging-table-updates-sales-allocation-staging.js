/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        DROP TABLE IF EXISTS staging.updated_sales_allocation_staging ;
        
        CREATE TABLE IF NOT EXISTS staging.updated_sales_allocation_staging 
            (   
                distributor_code varchar NOT NULL,
                psku varchar NOT NULL,
                adjusted_allocation numeric NOT NULL,
                updated_by varchar NULL,
                CONSTRAINT updated_sales_allocation_staging_un UNIQUE (distributor_code, psku)
            );
    `)
};

exports.down = pgm => {};
