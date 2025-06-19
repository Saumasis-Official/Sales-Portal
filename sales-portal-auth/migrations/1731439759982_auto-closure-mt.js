/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_type') THEN
            CREATE TYPE customer_type AS ENUM (
                'SINGLE_GRN',
                'MULTI_GRN'
            );
            END IF;
        END
        $$;

        CREATE TABLE IF NOT EXISTS public.auto_closure_mt_ecom (
            id bigserial NOT NULL,
            revision_id uuid DEFAULT gen_random_uuid() NOT NULL,
            payer_code varchar NOT NULL,
            customer_type public.customer_type NOT NULL,
            short_close numeric NULL,
            po_validity numeric NULL,
            remarks text NULL,
            deleted bool DEFAULT false NOT NULL,
            updated_by varchar DEFAULT 'PORTAL_MANAGED'::character varying NOT NULL,
            updated_on timestamptz DEFAULT now() NOT NULL,
            CONSTRAINT auto_closure_mt_ecom_pk PRIMARY KEY (id),
            CONSTRAINT auto_closure_mt_ecom_unique UNIQUE (payer_code, customer_type)
        );
        
        CREATE TABLE IF NOT EXISTS audit.auto_closure_mt_ecom_audit (
            audit_id bigserial NOT NULL PRIMARY KEY,
            audit_timestamp timestamptz DEFAULT now() NOT NULL,
            id int8 NOT NULL,
            revision_id uuid NOT NULL,
            payer_code varchar ,
            customer_type public.customer_type ,
            short_close numeric NULL,
            po_validity numeric NULL,
            remarks text NULL,
            deleted bool ,
            updated_by varchar ,
            updated_on timestamptz 
        );

        CREATE TABLE IF NOT EXISTS audit.auto_closure_mt_ecom_so_audit (
            audit_id bigserial NOT NULL,
            rule_id int8 NOT NULL,
            revision_id uuid NOT NULL,
            datalake_response jsonb NULL,
            so_numbers _text NULL,
            sap_payload jsonb NULL,
            sap_response jsonb NULL,
            created_on timestamptz DEFAULT now() NOT NULL,
            CONSTRAINT auto_closure_mt_ecom_so_audit_pkey PRIMARY KEY (audit_id),
            CONSTRAINT auto_closure_mt_ecom_so_audit_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.auto_closure_mt_ecom(id)
        );

        CREATE OR REPLACE FUNCTION public.auto_closure_mt_ecom_audit_trigger_func()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        AS $$
        BEGIN
            INSERT INTO audit.auto_closure_mt_ecom_audit (
                id,
                revision_id,
                payer_code,
                customer_type,
                short_close,
                po_validity,
                remarks,
                deleted,
                updated_by,
                updated_on
            )
            VALUES (
                OLD.id,
                OLD.revision_id,
                OLD.payer_code,
                OLD.customer_type,
                OLD.short_close,
                OLD.po_validity,
                OLD.remarks,
                OLD.deleted,
                OLD.updated_by,
                OLD.updated_on
            );
            RETURN NEW;
        END;
        $$;

        DROP TRIGGER IF EXISTS auto_closure_mt_ecom_trigger ON public.auto_closure_mt_ecom;
        CREATE TRIGGER auto_closure_mt_ecom_trigger
        BEFORE UPDATE OR DELETE ON public.auto_closure_mt_ecom
        FOR EACH ROW EXECUTE FUNCTION public.auto_closure_mt_ecom_audit_trigger_func();

        DROP TABLE IF EXISTS public.mt_ecom_payer_code_mapping;
        CREATE TABLE public.mt_ecom_payer_code_mapping (
            id serial4 NOT NULL,
            customer_code varchar(20) NULL,
            customer_name varchar(250) NULL,
            customer_group varchar(20) NULL,
            customer_group_desc varchar(250) NULL,
            "family" varchar(250) NULL,
            payer_code varchar(20) NULL,
            created_on timestamptz DEFAULT now() NOT NULL,
            payer_name varchar(50) NULL,
            CONSTRAINT mt_ecom_payer_code_mapping_customer_code_payer_code_key UNIQUE (customer_code, payer_code)
        );

        INSERT INTO auto_closure_mt_ecom (payer_code, customer_type)
        SELECT DISTINCT payer_code, 'SINGLE_GRN'::customer_type FROM mt_ecom_payer_code_mapping
        ON CONFLICT (payer_code, customer_type) DO NOTHING;

        INSERT INTO auto_closure_mt_ecom (payer_code, customer_type)
        SELECT DISTINCT payer_code, 'MULTI_GRN'::customer_type FROM mt_ecom_payer_code_mapping
        ON CONFLICT (payer_code, customer_type) DO NOTHING;
        `);
};

exports.down = pgm => {};
