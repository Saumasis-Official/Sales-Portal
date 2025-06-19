/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    DROP TABLE IF EXISTS public.material_stock;

    CREATE TABLE IF NOT EXISTS stock_norm_config (
        applicable_month varchar(6) NOT NULL,
        area_code varchar(6) NOT NULL,
        class_a_sn numeric NOT NULL DEFAULT 6,
        class_a_ss_percent numeric NOT NULL DEFAULT 30,
        class_b_sn numeric NOT NULL DEFAULT 8,
        class_b_ss_percent numeric NOT NULL DEFAULT 30,
        class_c_sn numeric NOT NULL DEFAULT 12,
        class_c_ss_percent numeric NOT NULL DEFAULT 30,
        updated_by varchar(50) NOT NULL DEFAULT 'PORTAL_MANAGED',
        updated_on timestamptz NOT NULL DEFAULT now(),
        remarks text NULL,
        CONSTRAINT stock_norm_config_pk PRIMARY KEY (applicable_month, area_code)
    )
    `);
};

exports.down = pgm => {
    pgm.sql(` 
    DROP TABLE IF EXISTS stock_norm_config;
     `);

};
