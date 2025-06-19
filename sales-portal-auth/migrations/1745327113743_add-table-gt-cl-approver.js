/* eslint-disable camelcase */
/* eslint-disable no-undef */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
       CREATE TABLE if not exists credit.cl_gt_approver_config (
        id serial4 primary KEY,
        cluster_code varchar(255) not null,
        primary_approver varchar(255) NOT NULL,
        secondary_approver varchar(255) NOT NULL,
        cluster_detail jsonb NOT NULL,
        updated_by varchar(255) NULL DEFAULT NULL::character varying,
        updated_on timestamptz NOT NULL DEFAULT now()
        ) `);
};

exports.down = (pgm) => {
    pgm.sql(`
       DROP TABLE IF EXISTS credit.cl_gt_approver_config;
    `);
};
