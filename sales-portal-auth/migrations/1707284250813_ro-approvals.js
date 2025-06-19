/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    INSERT INTO app_level_settings (key,value,updated_by,field_type,description)
    VALUES ('RO_APPROVALS','10','PORTAL_MANAGED','TEXT','To set the total number of Rush Order requests that can be approved in a month.')
    ON  CONFLICT DO NOTHING;
   `)
};

exports.down = pgm => {
    pgm.sql(` DELETE FROM app_level_settings where key IN ('RO_APPROVALS');`);
};