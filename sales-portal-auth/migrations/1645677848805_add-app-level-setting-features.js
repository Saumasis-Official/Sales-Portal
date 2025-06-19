/* eslint-disable camelcase */

exports.shorthORs = undefined;

exports.up = (pgm) => {
  pgm.sql(`
        INSERT INTO app_level_settings (key, value, updated_by, allowed_values, field_type, description) VALUES
        ('ENABLE_SEARCH_SWITCH', 'NO', 'PORTAL_MANAGED', '{"YES", "NO"}', 'SET', 'To allow distributor to switch between searching either universal products or distributor-specific products'),
        ('REPORT_ISSUE', 'SHOW', 'PORTAL_MANAGED', '{"SHOW", "HIDE"}', 'SET', 'To allow distributor to report issues on portal'),
        ('CHANGE_PASSWORD_LOGGED_IN', 'SHOW', 'PORTAL_MANAGED', '{"SHOW", "HIDE"}', 'SET', 'To allow distributor to change the password from dashboard after logging in'),
        ('PROFILE_UPDATE', 'SHOW', 'PORTAL_MANAGED', '{"SHOW", "HIDE"}', 'SET', 'To allow distributor to update his/her profile'),
        ('SHOW_SESSION_INFO', 'HIDE', 'PORTAL_MANAGED', '{"SHOW", "HIDE"}', 'SET', 'To allow distributor to see the active sessions count information'); 
    `);
};

exports.down = (pgm) => {
  pgm.sql(`
        DELETE FROM app_level_settings where key IN ('REPORT_ISSUE','CHANGE_PASSWORD_LOGGED_IN','PROFILE_UPDATE','SHOW_SESSION_INFO','ENABLE_SEARCH_SWITCH');
    `);
};
