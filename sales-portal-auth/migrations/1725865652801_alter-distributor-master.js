/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    Alter table if exists distributor_master alter column postal_code TYPE varchar;
    Alter table if exists staging.distributor_master_staging alter column postal_code TYPE varchar;
    `)
};

exports.down = pgm => {};
