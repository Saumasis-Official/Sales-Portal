/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        INSERT INTO app_level_settings (key,value,updated_by,field_type,description)
        VALUES ('PDP_UNLOCK_EXPIRY_WINDOW_2','24','PORTAL_MANAGED','TEXT','To set the expiry window for 2nd approver to approve/reject PDP unlock requests in hours.')
        ON  CONFLICT DO NOTHING;
   `)
};

exports.down = pgm => {
    pgm.sql(` DELETE FROM app_level_settings where key IN ('PDP_UNLOCK_EXPIRY_WINDOW_2');`);
};