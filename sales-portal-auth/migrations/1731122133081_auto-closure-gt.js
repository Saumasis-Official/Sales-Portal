/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(
        `
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        CREATE TABLE IF NOT EXISTS public.auto_closure_gt (
            id bigserial NOT NULL,
            order_type public.order_type NOT NULL,
            customer_group varchar NOT NULL,
            short_close numeric NULL,
            deleted bool DEFAULT false NOT NULL,
            updated_by varchar DEFAULT 'PORTAL_MANAGED'::character varying NOT NULL,
            updated_on timestamptz DEFAULT now() NOT NULL,
            remarks text NULL,
            revision_id uuid DEFAULT gen_random_uuid() NOT NULL,
            CONSTRAINT auto_closure_gt_pk PRIMARY KEY (id),
            CONSTRAINT auto_closure_gt_unique UNIQUE (order_type, customer_group),
            CONSTRAINT auto_closure_gt_customer_group_master_fk FOREIGN KEY (customer_group) REFERENCES public.customer_group_master("name")
        );

        CREATE TABLE IF NOT EXISTS audit.auto_closure_gt_audit (
            audit_id bigserial NOT NULL,
            audit_timestamp timestamptz DEFAULT now() NOT NULL,
            id int8 NOT NULL,
            order_type public.order_type NULL,
            customer_group varchar NULL,
            short_close numeric NULL,
            deleted bool NULL,
            updated_by varchar NULL,
            updated_on timestamptz NULL,
            remarks text NULL,
            revision_id uuid NULL,
            CONSTRAINT auto_closure_gt_pk PRIMARY KEY (audit_id)
        );

        CREATE TABLE IF NOT EXISTS audit.auto_closure_gt_so_audit (
            audit_id bigserial NOT NULL,
            rule_id int8 NOT NULL,
            revision_id uuid NOT NULL,
            datalake_response jsonb NULL,
            so_numbers _text NULL,
            sap_payload jsonb NULL,
            sap_response jsonb NULL,
            created_on timestamptz DEFAULT now() NOT NULL,
            CONSTRAINT auto_closure_gt_so_audit_pkey PRIMARY KEY (audit_id),
            CONSTRAINT auto_closure_gt_so_audit_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.auto_closure_gt(id)
        );

        CREATE OR REPLACE
        FUNCTION public.auto_closure_gt_audit_trigger_func()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        AS $$
        BEGIN
        INSERT
            INTO
            audit.auto_closure_gt_audit
        (
                id,
                order_type,
                customer_group,
                short_close,
                deleted,
                updated_by,
                updated_on,
                remarks,
                revision_id
            )
        VALUES(
            OLD.id,
            OLD.order_type,
            OLD.customer_group,
            OLD.short_close,
            OLD.deleted,
            OLD.updated_by,
            OLD.updated_on,
            OLD.remarks,
            OLD.revision_id
        );
        RETURN NEW;
        END;
        $$;

        DROP TRIGGER IF EXISTS auto_closure_gt_trigger ON public.auto_closure_gt;
        CREATE TRIGGER auto_closure_gt_trigger
        BEFORE UPDATE OR DELETE ON public.auto_closure_gt
        FOR EACH ROW EXECUTE FUNCTION auto_closure_gt_audit_trigger_func();
    `
    );
    // Separate the ENUM modification
    pgm.sql(`
        BEGIN;
        ALTER TYPE public.order_type ADD VALUE IF NOT EXISTS 'CALL_CENTER';
        COMMIT;
    `);
    // Insert statement after the ENUM modification
    pgm.sql(`
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM unnest(enum_range(NULL::public.order_type)) AS enum_value WHERE enum_value = 'CALL_CENTER') THEN
                INSERT INTO public.auto_closure_gt (order_type, customer_group)
                SELECT enum_value AS order_type, cgm.name AS customer_group
                FROM unnest(enum_range(NULL::public.order_type)) AS enum_value
                CROSS JOIN public.customer_group_master cgm
                WHERE cgm.name IN ('10', '11', '15', '17', '20', '31', '35', '44', '48', '50', '51', '52', '62')
                ON CONFLICT (order_type, customer_group) DO NOTHING;
            END IF;
        END $$;
    `);
    
};

exports.down = pgm => {
    pgm.sql(`
        DROP TRIGGER IF EXISTS auto_closure_gt_audit_trigger ON public.auto_closure_gt;
        DROP FUNCTION IF EXISTS public.auto_closure_gt_audit_trigger_func;
        DROP TABLE IF EXISTS audit.auto_closure_gt_so_audit;
        DROP TABLE IF EXISTS audit.auto_closure_gt_audit;
        DROP TABLE IF EXISTS public.auto_closure_gt;
    `);
};
