/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`

        CREATE TABLE IF NOT EXISTS sih_ss_email_log (
            id bigserial NOT NULL,
            log_date timestamptz NULL DEFAULT now(),
            region character varying NOT NULL,
            area_code character varying(6) NOT NULL,
            asm_email character varying NOT NULL,
            tse_code character varying(10) NOT NULL,
            tse_email character varying NOT NULL,
            db_code character varying(8) NOT NULL,
            db_email character varying NOT NULL,
            pskus_checked jsonb NOT NULL,
            email_sent boolean NOT NULL DEFAULT 'false',
            CONSTRAINT sih_ss_email_log_pkey PRIMARY KEY (id)
        );
    `)
};

exports.down = pgm => {
    pgm.sql(` DROP table IF EXISTS sih_ss_email_log`);
};

