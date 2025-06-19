/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TABLE public.mdm_material_data ALTER COLUMN updated_on DROP DEFAULT;
        ALTER TABLE public.mdm_material_data ALTER COLUMN site_code DROP NOT NULL;
        ALTER TABLE public.mdm_material_data ALTER COLUMN plant_code DROP NOT NULL;
        ALTER TABLE public.mdm_material_data ALTER COLUMN customer_code DROP NOT NULL;
        ALTER TABLE public.mdm_material_data ALTER COLUMN vendor_code DROP NOT NULL;
        ALTER TABLE public.mdm_material_data ALTER COLUMN article_desc TYPE varchar(400) USING article_desc::varchar;
        ALTER TABLE public.mdm_material_data ALTER COLUMN psku_desc TYPE varchar(400) USING psku_desc::varchar;
        ALTER TABLE public.mdm_material_data ALTER COLUMN sku_desc TYPE varchar(400) USING sku_desc::varchar;
        ALTER TABLE IF EXISTS public.mdm_material_data ADD IF NOT EXISTS primary_buying_uom varchar(5); 
        ALTER TABLE public.mdm_material_data ADD IF NOT EXISTS mrp_uom_buying varchar(5) NULL;
        ALTER TABLE IF EXISTS public.mdm_material_data ADD IF NOT EXISTS l1_pack numeric;
        ALTER TABLE IF EXISTS public.mdm_material_data ADD IF NOT EXISTS l1_pack_uom varchar(5);
        ALTER TABLE IF EXISTS public.mdm_material_data ADD IF NOT EXISTS l2_pack numeric;
        ALTER TABLE IF EXISTS public.mdm_material_data ADD IF NOT EXISTS l2_pack_uom varchar(5);
        ALTER TABLE IF EXISTS public.mdm_material_data ADD IF NOT EXISTS l3_pack numeric;
        ALTER TABLE IF EXISTS public.mdm_material_data ADD IF NOT EXISTS l3_pack_uom varchar(5);
        ALTER TABLE IF EXISTS public.mdm_material_data ADD IF NOT EXISTS l4_pack numeric;
        ALTER TABLE IF EXISTS public.mdm_material_data ADD IF NOT EXISTS l4_pack_uom varchar(5);
        ALTER TABLE IF EXISTS public.mdm_material_data ADD IF NOT EXISTS loose_piece boolean DEFAULT false;
        ALTER TABLE public.mdm_material_data add constraint mdm_material_data_ukey UNIQUE (psku,sku,region,customer_name);
        ALTER TABLE public.mdm_material_data ALTER COLUMN division DROP NOT NULL;
        ALTER TABLE public.mdm_material_data ALTER COLUMN vendor_name SET DEFAULT 'TCPL';

    `);
};

exports.down = pgm => {};
