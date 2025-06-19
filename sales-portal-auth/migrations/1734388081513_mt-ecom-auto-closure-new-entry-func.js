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

        INSERT INTO auto_closure_mt_ecom (payer_code, customer_type, short_close, po_validity, remarks, updated_on, updated_by)
        SELECT DISTINCT 
            payer_code, 
            'MULTI_GRN'::customer_type, 
            existing.short_close, 
            existing.po_validity, 
            existing.remarks, 
            existing.updated_on, 
            existing.updated_by
        FROM mt_ecom_payer_code_mapping
        CROSS JOIN LATERAL (
            SELECT 
                short_close, 
                po_validity, 
                remarks, 
                updated_on, 
                updated_by
            FROM auto_closure_mt_ecom
            WHERE customer_type = 'MULTI_GRN'
            LIMIT 1
        ) AS existing
        ON CONFLICT (payer_code, customer_type) DO NOTHING;
        RETURN NEW;
        END;
        $$;
    `);
};

exports.down = pgm => {};
