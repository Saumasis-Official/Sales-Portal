/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    CREATE TABLE public.mt_ecom_logs (
        id bigserial NOT NULL PRIMARY KEY,
        status mt_ecom_status_type NULL,
        log_type varchar(50) NULL,
        po_number varchar(15) NULL,
        data jsonb NULL,
        created_on timestamptz NULL DEFAULT now(),
        updated_on timestamptz NULL,
        is_deleted bool NULL DEFAULT false
    );`)
};

exports.down = pgm => {
    pgm.sql(`DROP TABLE public.mt_ecom_logs;`)

};
