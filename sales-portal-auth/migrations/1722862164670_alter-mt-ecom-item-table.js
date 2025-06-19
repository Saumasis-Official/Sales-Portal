/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    Alter table mt_ecom_item_table add column if not exists base_price numeric;
    Alter table mt_ecom_item_table add column if not exists updated_base_price numeric;
    Alter table mt_ecom_item_table add column if not exists landing_price numeric;
    Alter table mt_ecom_item_table add column if not exists updated_landing_price numeric;
    ALTER TABLE public.mt_ecom_item_table ALTER COLUMN sales_unit TYPE varchar(50) USING sales_unit::varchar(50);
    CREATE index if not exists idx_article_site_vendor_code ON mdm_material_data (article_id,site_code,vendor_code);
    CREATE index if not exists idx_id_status ON mt_ecom_item_table (po_id,status);
    CREATE index if not exists idx_item_so_status ON mt_ecom_item_table (item_number,sales_order,status);
    CREATE index if not exists idx_item_so ON mt_ecom_item_table (item_number,sales_order);
    CREATE index if not exists idx_status_date_customer_code ON mt_ecom_header_table (status,po_created_date,customer_code);
    CREATE index if not exists idx_po ON mt_ecom_logs (po_number);
    CREATE index if not exists idx_site_plant_code ON mdm_material_data (site_code,plant_code);
    CREATE index if not exists idx_so ON mt_ecom_header_table (so_number);
    CREATE index if not exists idx_sap_item_so ON mt_ecom_item_table (sales_order,response_item_number);
    CREATE index if not exists idx_user_id ON kams_customer_mapping (user_id);
    alter table mt_ecom_exclusion_customer_codes add column created_on timestamptz DEFAULT now()

    `)
};

exports.down = pgm => {
    pgm.sql(`
    ALTER TABLE public.mt_ecom_item_table DROP COLUMN base_price;
    ALTER TABLE public.mt_ecom_item_table DROP COLUMN updated_base_price;
    ALTER TABLE public.mt_ecom_item_table DROP COLUMN landing_price;
    ALTER TABLE public.mt_ecom_item_table DROP COLUMN updated_landing_price;
    DROP index if exists idx_article_site_vendor_code;
    DROP index if exists idx_id_status;
    DROP index if exists idx_item_so_status;
    DROP index if exists idx_item_so;
    DROP index if exists idx_status_date_customer_code;
    DROP index if exists idx_po;
    DROP index if exists idx_site_plant_code;
    DROP index if exists idx_so;
    DROP index if exists idx_sap_item_so;
    DROP index if exists idx_user_id;
    ALTER table mt_ecom_exclusion_customer_codes drop column created_on
    `)
};
