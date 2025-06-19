/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
            ALTER  TABLE IF EXISTS infra.process_calender ADD COLUMN IF NOT EXISTS last_updated_by varchar(255) default 'PORTAL_MANAGED', ADD COLUMN IF NOT EXISTS remarks varchar(255) default '-' ;
        `);
};

exports.down = pgm => {
    pgm.sql(`
            ALTER TABLE IF EXISTS infra.process_calender DROP COLUMN IF EXISTS last_updated_by, DROP COLUMN IF EXISTS remarks;
    `);
};
