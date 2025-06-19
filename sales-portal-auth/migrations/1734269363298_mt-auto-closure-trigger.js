/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        CREATE OR REPLACE FUNCTION public.auto_closure_mt_new_entry_trigger_func()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        AS $$
        BEGIN
        INSERT INTO auto_closure_mt_ecom (payer_code, customer_type)
        SELECT DISTINCT payer_code, 'SINGLE_GRN'::customer_type FROM mt_ecom_payer_code_mapping
        ON CONFLICT (payer_code, customer_type) DO NOTHING;

        INSERT INTO auto_closure_mt_ecom (payer_code, customer_type)
        SELECT DISTINCT payer_code, 'MULTI_GRN'::customer_type FROM mt_ecom_payer_code_mapping
        ON CONFLICT (payer_code, customer_type) DO NOTHING;
        RETURN NEW;
        END;
        $$;

        DROP TRIGGER IF EXISTS auto_closure_mt_new_entry_trigger ON public.mt_ecom_payer_code_mapping;
        CREATE TRIGGER auto_closure_mt_new_entry_trigger
        AFTER INSERT ON public.mt_ecom_payer_code_mapping
        FOR EACH STATEMENT EXECUTE FUNCTION public.auto_closure_mt_new_entry_trigger_func();

        ALTER TABLE audit.auto_closure_gt_so_audit drop column if exists so_numbers;
        alter table audit.auto_closure_gt_so_audit add column if not exists rdd_details jsonb;
        `);
};

exports.down = pgm => {
    pgm.sql(`
        DROP TRIGGER IF EXISTS auto_closure_mt_new_entry_trigger ON public.mt_ecom_payer_code_mapping;
        DROP FUNCTION IF EXISTS public.auto_closure_mt_new_entry_trigger_func();
        `);
};
