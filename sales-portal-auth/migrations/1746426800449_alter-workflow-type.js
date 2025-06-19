/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TABLE if exists public.mt_ecom_workflow_type ADD column tot boolean default false;

        `)
};

exports.down = pgm => {};
