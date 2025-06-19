/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    alter table mt_ecom_workflow_type add column if not exists acknowledgement boolean default false
        `);
};

exports.down = pgm => {};
