/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    
        INSERT INTO app_level_settings (key, value, updated_by, allowed_values, field_type, description) VALUES
        ('PARTNER-MISMATCH-ERROR-RECIPIENTS', 'Grp-Pegasus-support@tataconsumer.com,CC.foods2@tataconsumer.com', 'PORTAL_MANAGED', NULL, 'TEXT', 'Recipients for sending error mails when there is mismatch in partner data between portal and SAP. ');
    
    `);
};

exports.down = pgm => {
    pgm.sql(`
    
        DELETE FROM app_level_settings WHERE key = 'PARTNER-MISMATCH-ERROR-RECIPIENTS';

    `);
};
