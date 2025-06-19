/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    pgm.sql(`
       CREATE TABLE IF NOT EXISTS credit.cl_gt_requestor_mapping (
    id serial4 NOT NULL,
    cluster_code _varchar NOT NULL,
    user_id varchar(255) NOT NULL,
    customer_group _int4 DEFAULT NULL,
    updated_by varchar(255) NOT NULL,
    updated_on timestamptz NOT NULL DEFAULT now(),
    is_deleted boolean
    );
        `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.down(`
        DROP TABLE IF EXISTS credit.cl_gt_requestor_mapping;
    `);
};
