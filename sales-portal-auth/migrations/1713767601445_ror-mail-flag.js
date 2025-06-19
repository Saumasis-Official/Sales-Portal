/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TABLE orders ADD COLUMN if not exists ror_mail_flag BOOLEAN DEFAULT FALSE;
        ALTER TABLE credit_crunch_notifications_log ALTER COLUMN credit_shortage DROP NOT NULL;

        `);
};

exports.down = pgm => {};
