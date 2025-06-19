/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        INSERT INTO app_level_settings (key, value, updated_by, allowed_values, field_type, description) VALUES
        ('CART_EXPIRY_WINDOW', '15', 'PORTAL_MANAGED', NULL, 'TEXT', 'To set the purchase order carts expiry window limit in days');
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        DELETE FROM app_level_settings WHERE key = 'CART_EXPIRY_WINDOW';

    `);

};
