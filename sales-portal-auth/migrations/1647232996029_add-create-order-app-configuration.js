/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        INSERT INTO app_level_settings (key, value, updated_by, allowed_values, field_type, description) VALUES
        ('ENABLE_ADMIN_CREATE_ORDER', 'NO', 'PORTAL_MANAGED', '{"YES", "NO"}', 'SET', 'To allow TSE and distributor admins to create new purchase orders and re-order previous sales orders');
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        DELETE FROM app_level_settings where key = 'ENABLE_ADMIN_CREATE_ORDER';
    
    `);

};
