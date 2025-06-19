/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(
        `
        Create table if not exists mt_ecom_audit_trail 
        (
            id bigserial PRIMARY KEY,
            type varchar(100),
            reference_column varchar(50),
            column_values  jsonb,
            created_on timestamp with time zone DEFAULT NOW()
        )
        `
    )
};

exports.down = pgm => {};
