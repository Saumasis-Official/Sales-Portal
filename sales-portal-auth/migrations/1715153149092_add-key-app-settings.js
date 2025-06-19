/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        INSERT INTO app_level_settings(key, value, updated_by, field_type, description)
        VALUES ('PDP_UNLOCK_CONFIRM_TEXT', '<b>*</b> Are you sure you want to continue, as this request will be sent for approval to <b>Punit Gupta(Sales head)</b> and <b>Ajit Krishnakumar (COO)</b>', 'PORTAL_MANAGED', 'TEXT', 'To set the confirmation text while raising pdp unlock request. Use HTML tag <b> to highlight the text')
        ON CONFLICT DO NOTHING;   
    `);
};

exports.down = pgm => {
    pgm.sql(`
        DELETE FROM app_level_settings WHERE key='PDP_UNLOCK_CONFIRM_TEXT';
    `)
};
