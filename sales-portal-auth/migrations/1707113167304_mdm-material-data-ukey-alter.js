/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`ALTER TABLE IF EXISTS mdm_material_data  DROP CONSTRAINT IF EXISTS mdm_material_data_ukey;
    ALTER TABLE IF EXISTS public.mdm_material_data add constraint mdm_material_data_ukey 
    UNIQUE (psku,sku,region,customer_name,customer_code,site_code,plant_code,vendor_code);
    `);
};

exports.down = pgm => {
    pgm.sql(`ALTER TABLE mdm_material_data  DROP CONSTRAINT mdm_material_data_ukey;`)
};
