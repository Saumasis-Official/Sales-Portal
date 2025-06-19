/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TABLE credit.audit_trail ADD COLUMN IF NOT EXISTS childid varchar NOT NULL;
        ALTER TABLE credit.audit_history ADD COLUMN IF NOT EXISTS childid varchar NOT NULL;
        

        `);
};

exports.down = pgm => {
    pgm.sql(`
        ALTER TABLE credit.audit_trail DROP COLUMN IF EXISTS childid;
        ALTER TABLE credit.audit_history DROP COLUMN IF EXISTS childid;
        `);
};
