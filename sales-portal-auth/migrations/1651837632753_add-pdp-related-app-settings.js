/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        INSERT INTO app_level_settings (key, value, updated_by, allowed_values, field_type, description) VALUES
        ('PDP_WEEKLY_ORDER_WINDOW', '44', 'PORTAL_MANAGED', NULL, 'TEXT', 'To set the PDP order placement window time (in hours) for weekly case. For eg. 36 hours = 1.5 days window'),
        ('PDP_FORTNIGHTLY_ORDER_WINDOW', '44', 'PORTAL_MANAGED', NULL, 'TEXT', 'To set the PDP order placement window time (in hours) for fortnight case. For eg. 48 hours = 2 days window'),
        ('PDP_WEEKLY_OFF', 'SUNDAY', 'PORTAL_MANAGED', '{"NONE", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"}', 'SET', 'To select the day of the week which is a weekly off'),
        ('PDP_ORDER_PLACEMENT_TIME', '0', 'PORTAL_MANAGED', NULL, 'TEXT', 'To set the PDP order placement window start time in 24-hour format. For eg. 20 is 08:00 PM');

    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        DELETE FROM app_level_settings WHERE key IN ('PDP_WEEKLY_ORDER_WINDOW', 'PDP_FORTNIGHTLY_ORDER_WINDOW', 'PDP_WEEKLY_OFF', 'PDP_ORDER_PLACEMENT_TIME');
    
    `);

 };
