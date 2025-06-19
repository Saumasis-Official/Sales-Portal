/* eslint-disable camelcase */
/* eslint-disable no-undef */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`

       CREATE TABLE credit.cl_account_master (
    id SERIAL4 NOT NULL,
    job_complete BOOLEAN DEFAULT FALSE,
    filename VARCHAR(255) NOT NULL,
    updated_by VARCHAR(100),
    updated_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cl_account_master_pk PRIMARY KEY (id)
);
        `);
};

exports.down = (pgm) => {
    pgm.sql(`
       DROP TABLE IF EXISTS credit.cl_account_master
        `);
};
