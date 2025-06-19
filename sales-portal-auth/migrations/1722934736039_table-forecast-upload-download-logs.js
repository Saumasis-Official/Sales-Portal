/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS forecast_upload_download_logs (
            "key" bigserial NOT NULL,
            file_name varchar(100) NOT NULL,
            region varchar(10) NULL,
            areas _varchar NOT NULL,
            requested_on timestamptz DEFAULT now() NULL,
            requested_by varchar NOT NULL,
            "request_type" varchar NOT NULL,
            file_link varchar NULL,
            success boolean DEFAULT TRUE NULL,
            error text NULL,
            CONSTRAINT forecast_upload_download_logs_pk PRIMARY KEY ("key")
        );
   `)
};

exports.down = pgm => {
    pgm.sql(
        `DROP TABLE IF EXISTS forecast_upload_download_logs;`
    );
};
