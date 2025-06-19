/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`       
        create table if not exists shopify.shopify_audit_trail(
        id bigserial NOT NULL,
        type text NOT NULL,
        reference jsonb NOT NULL,
        lastReplication timestamp NULL DEFAULT (now() AT TIME ZONE 'utc'::text)
    );

    `)};

exports.down = pgm => {
    pgm.sql(`
    DROP TABLE IF EXISTS shopify.shopify_audit_trail;
    `)
};
