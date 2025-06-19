/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(
        `
        Alter table mt_ecom_header_table add column if not exists customer_code varchar(100);
        UPDATE mt_ecom_header_table mh
        SET customer_code = mmd.customer_code
        FROM mdm_material_data mmd
        WHERE mmd.site_code = mh.site_code;
        Alter table kams_customer_mapping add column if not exists customer_code varchar[];
        ALTER TYPE roles_type ADD VALUE IF NOT EXISTS 'NKAMS';
        ALTER TYPE mt_ecom_status_type ADD VALUE IF NOT EXISTS 'Not yet processed';
        Alter table mt_ecom_item_table add column if not exists plant_name varchar;
        ALTER TYPE sync_type ADD VALUE IF NOT EXISTS 'MT ECOM SO Sync';
        Alter table sync_logs add column user_id varchar(50)
        `
    )
};

exports.down = pgm => {};
