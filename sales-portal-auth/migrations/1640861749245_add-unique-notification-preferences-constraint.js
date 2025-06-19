/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_ukey UNIQUE (user_profile_id);
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        ALTER TABLE notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_ukey;

    `);

};
