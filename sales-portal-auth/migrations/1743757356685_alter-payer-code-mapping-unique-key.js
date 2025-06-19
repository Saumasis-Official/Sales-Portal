/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
            Delete from public.mt_ecom_payer_code_mapping;
            DO $$
            BEGIN
            ALTER TABLE public.mt_ecom_payer_code_mapping DROP CONSTRAINT unique_customer_code_payer_code;
            END $$;
       

        ALTER TABLE public.mt_ecom_payer_code_mapping ADD CONSTRAINT unique_customer_code_payer_code UNIQUE (customer_code);
        `)
};

exports.down = pgm => {
    pgm.sql(`
        
        ALTER TABLE public.mt_ecom_payer_code_mapping DROP CONSTRAINT unique_customer_code_payer_code;

        `)
};
