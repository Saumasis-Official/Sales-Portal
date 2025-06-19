/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
     DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sms_type') THEN
            CREATE TYPE sms_type AS ENUM (
                'DELIVERY_CODE'
            );
            END IF;
        END
        $$;
        CREATE TABLE IF NOT EXISTS audit.sms_logs (
            id bigserial NOT NULL,
            "type" public.sms_type NOT NULL,
            status public.sync_result NOT NULL,
            recipients jsonb NOT NULL,
            reference text DEFAULT 'NA'::text NOT NULL,
            sms_data jsonb NULL,
            error_logs text NULL,
            created_on timestamptz DEFAULT now() NOT NULL,
            created_by varchar(30) DEFAULT 'SYSTEM_GENERATED'::character varying NULL,
            CONSTRAINT sms_logs_pk PRIMARY KEY (id)
        );
        CREATE INDEX IF NOT EXISTS sms_logs_type_idx ON audit.sms_logs USING btree (type, status, reference);
        CREATE INDEX IF NOT EXISTS email_logs_type_idx ON public.email_logs USING btree (type, status, reference);

    `);
};

exports.down = pgm => { };
