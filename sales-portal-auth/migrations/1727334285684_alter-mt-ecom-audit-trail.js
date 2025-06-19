/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    Alter table if exists mt_ecom_audit_trail add column if not exists updated_by varchar;
    Alter table if exists mt_ecom_audit_trail add constraint mt_ecom_audit_trail_user_id_fkey FOREIGN KEY (updated_by) REFERENCES sales_hierarchy_details(user_id) ON DELETE CASCADE
    `)
};

exports.down = pgm => {};
