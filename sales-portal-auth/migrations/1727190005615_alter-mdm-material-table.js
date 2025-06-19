/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    Alter table if exists mdm_material_data add column if not exists priority numeric default 1;
    ALTER TABLE public.mdm_material_data DROP CONSTRAINT mdm_material_data_ukey;
    ALTER TABLE public.mdm_material_data ADD CONSTRAINT mdm_material_data_ukey UNIQUE (psku, sku, region, customer_name, article_id, customer_code, site_code, plant_code, vendor_code,priority);
    `)
};

exports.down = pgm => {};
