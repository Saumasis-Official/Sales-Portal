/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        Create table if not exists shopify.shopify_unprocessed_files (
            id bigserial NOT NULL,
            year numeric,
            file_name text,
            sales_org varchar,
            created_on timestamp NULL default now(),
            is_deleted boolean default false,
            CONSTRAINT shopify_unprocessed_files_un UNIQUE (file_name)
        );
        `)
};

exports.down = pgm => {
    pgm.sql(`
        DROP TABLE if exists shopify.shopify_unprocessed_files;
    `)
};
