/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        CREATE TABLE if not exists shopify.shopify_audit_trail (
        id bigserial NOT NULL,
        "type" text NOT NULL,
        reference jsonb NOT NULL,
        lastreplication timestamp NULL DEFAULT (now() AT TIME ZONE 'utc'::text)
    );
        `)
};

exports.down = pgm => {
    pgm.sql(`
        Drop table if exists shopify.shopify_audit_trail
        `)
};
