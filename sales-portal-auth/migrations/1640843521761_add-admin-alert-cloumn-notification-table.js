/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    ALTER TABLE IF EXISTS notification_preferences ADD COLUMN IF NOT EXISTS sms_tse_asm BOOLEAN DEFAULT TRUE;
    ALTER TABLE IF EXISTS notification_preferences ADD COLUMN IF NOT EXISTS email_tse_asm BOOLEAN DEFAULT TRUE;

    `)
};

exports.down = pgm => {
    pgm.sql(`
    ALTER TABLE IF EXISTS notification_preferences DROP COLUMN IF EXISTS sms_tse_asm;
    ALTER TABLE IF EXISTS notification_preferences DROP COLUMN IF EXISTS email_tse_asm;

    `)
};
