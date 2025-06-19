/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        Alter table if exists mt_ecom_workflow_type add column if not exists tot_tolerance numeric;
        `)
};

exports.down = pgm => {

    pgm.sql(`
        Alter table if exists mt_ecom_workflow_type drop column if exists tot_tolerance;
        `)
};
