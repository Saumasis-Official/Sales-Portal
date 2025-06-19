/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    INSERT INTO app_level_settings (key,value,updated_by,field_type,description)
    VALUES ('PDP_UNLOCK_WINDOW','7','PORTAL_MANAGED','TEXT','To set the maximum PDP unlock request window in days.')
    ON  CONFLICT DO NOTHING;
   `)
};

exports.down = pgm => {
    pgm.sql(` DELETE FROM app_level_settings where key IN ('PDP_UNLOCK_WINDOW');`);
};