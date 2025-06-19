/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(
        `
        CREATE TABLE IF NOT EXISTS public.reserve_credit
        (
            id bigserial NOT NULL,
            db_code character varying(20) COLLATE pg_catalog."default" NOT NULL,
            reserved_amount numeric NOT NULL,
            doc_number character varying(255) COLLATE pg_catalog."default",
            created_by character varying(255) COLLATE pg_catalog."default" NOT NULL,
            created_on timestamp with time zone NOT NULL DEFAULT 'now()',
            updated_by character varying(255) COLLATE pg_catalog."default",
            updated_on timestamp with time zone DEFAULT 'now()',
            CONSTRAINT reserve_credit_pkey PRIMARY KEY (id),
            CONSTRAINT reserve_credit_fk FOREIGN KEY (db_code)
                REFERENCES public.distributor_master (id) MATCH SIMPLE
                ON UPDATE CASCADE
                ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_reserve_credit_db_code ON public.reserve_credit (db_code);

        INSERT INTO app_level_settings(
            key, value, updated_by, field_type,allowed_values, description)
            VALUES 
            ('ENABLE_RESERVE_CREDIT', 'YES', 'PORTAL_MANAGED', 'SET', '{"YES", "NO"}', 'To enable/disable reserve credit')
            ON CONFLICT DO NOTHING;
`
    );
};

exports.down = pgm => {
    pgm.sql(`
    DROP TABLE IF EXISTS public.reserve_credit CASCADE;
    DELETE FROM app_level_settings WHERE key='ENABLE_RESERVE_CREDIT';
    `);
};
