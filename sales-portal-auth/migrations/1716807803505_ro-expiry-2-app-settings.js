
exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    INSERT INTO app_level_settings (key,value,updated_by,field_type,description)
    VALUES ('RO_EXPIRY_WINDOW_2','24','PORTAL_MANAGED','TEXT','To set the expiry window for 2nd approver of Rush Order requests in hours.')
    ON  CONFLICT DO NOTHING;
   `)
};

exports.down = pgm => {
    pgm.sql(` DELETE FROM app_level_settings where key IN ('RO_EXPIRY_WINDOW_2');`);
};