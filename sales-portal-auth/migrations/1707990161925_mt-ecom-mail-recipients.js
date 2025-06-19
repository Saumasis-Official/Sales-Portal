/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    CREATE TABLE IF NOT EXISTS mt_ecom_mail_recipients
    (
        id SERIAL PRIMARY KEY,
        site_code varchar(10),
        customer_name varchar(50),
        plant_code numeric,
        vendor_code numeric,
        email varchar(255),
        type varchar(20),
        status boolean DEFAULT true,
        created_on timestamp with time zone DEFAULT NOW(),
        updated_on timestamp with time zone DEFAULT NOW()
        
    );`);
};

exports.down = pgm => {
    pgm.sql(`
    DROP TABLE IF EXISTS mt_ecom_mail_recipients;
    `);
};
