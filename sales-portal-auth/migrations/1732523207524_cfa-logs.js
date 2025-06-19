/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        CREATE SCHEMA IF NOT EXISTS infra ;
        CREATE table IF NOT EXISTS infra.process_master (
        process_name varchar NOt NULL,
        start_time timestamp NOT NULL,
        end_time timestamp NOT NULL,
        priority int4 NOT NULL,
        threshold int4 NOT NULL,
        key_name varchar NOT NULL
    );
        CREATE table IF NOT EXISTS infra.process_log (
        id serial,
        process_name varchar NOT NULL,
        status varchar NULL,
        time timestamp NULL,
        inserted_on timestamp NULL DEFAULT now(),
        event varchar(255) NULL
    );
        `)
};

exports.down = pgm => {
    pgm.sql(`
        DROP SCHEMA IF EXISTS infra;
      DROP TABLE IF EXISTS process_master;
      DROP TABLE IF EXISTS process_log;
      `)
};
