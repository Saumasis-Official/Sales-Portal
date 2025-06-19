/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    
        CREATE TABLE IF NOT EXISTS forecast_sync_status  (
            key bigserial NOT NULL PRIMARY KEY,
            area_code character varying(6) NOT NULL,
            status boolean NOT NULL,
            date timestamptz NOT NULL,
            count bigint NOT NULL,
            message text
        );
    
    `);
};

exports.down = (pgm) => {
  pgm.sql(`
    
        DROP TABLE IF EXISTS forecast_sync_status;
    
    `);
};
