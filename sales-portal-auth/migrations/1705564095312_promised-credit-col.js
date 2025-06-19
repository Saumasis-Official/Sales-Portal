/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TABLE IF EXISTS orders 
            ADD IF NOT EXISTS promised_credit jsonb NOT NULL DEFAULT '{}';    
    `);
};

exports.down = pgm => {
    pgm.sql(`
        ALTER TABLE IF EXISTS orders DROP IF EXISTS promised_credit;
    `);
};
