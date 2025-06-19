/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    INSERT INTO app_level_settings (key,value,updated_by,field_type,description)
    VALUES ('ENABLE_RDD_START_TIME','09:00','PORTAL_MANAGED','TIME','Time at which RDD will start.')
    ON  CONFLICT DO NOTHING;
    INSERT INTO app_level_settings (key,value,updated_by,field_type,description)
    VALUES ('ENABLE_RDD_END_TIME','17:00','PORTAL_MANAGED','TIME','Time at which RDD will end.')
    ON  CONFLICT DO NOTHING;
   `)
};

exports.down = pgm => {};
