/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS execution_time time;
        `);
};

exports.down = pgm => {};
