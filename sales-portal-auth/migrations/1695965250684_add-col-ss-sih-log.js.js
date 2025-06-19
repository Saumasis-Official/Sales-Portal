/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    CREATE TYPE sn_notification_type AS ENUM (
        'STOCK_NORM',
        'SAFETY_STOCK',
        'NA'
    );    
    ALTER TABLE IF EXISTS sih_ss_email_log ADD IF NOT EXISTS email_type sn_notification_type NOT NULL DEFAULT 'NA'; 
    `);
};

exports.down = pgm => {
    pgm.sql(`
        ALTER TABLE IF EXISTS sih_ss_email_log DROP IF EXISTS email_type;
    `);
};
