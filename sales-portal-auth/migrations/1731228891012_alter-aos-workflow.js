/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(
        `ALTER TABLE audit.aos_workflow ADD COLUMN IF NOT EXISTS soq_calculations jsonb;`
    )
};

exports.down = pgm => {};
