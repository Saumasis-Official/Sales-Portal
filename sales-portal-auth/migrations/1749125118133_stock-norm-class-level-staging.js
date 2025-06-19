/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS staging.sn_db_psku_class_staging (
            db varchar NOT NULL,
            a numeric NOT NULL,
            b numeric NOT NULL,
            c numeric NOT NULL,
            created_by varchar DEFAULT 'PORTAL_MANAGED'::character varying NOT NULL,
            CONSTRAINT sn_db_psku_class_staging_unique UNIQUE (db)
        );
    `);
};

exports.down = (pgm) => {
    pgm.sql(`
        DROP TABLE IF EXISTS staging.sn_db_psku_class_staging;
    `);
};
