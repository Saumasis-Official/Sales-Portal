/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        BEGIN;
            ALTER TYPE order_type ADD VALUE 'SAP_REG';
            ALTER TYPE order_type ADD VALUE 'SAP_LIQ';
        COMMIT;
        `)
    pgm.sql(`
       
        INSERT INTO public.auto_closure_gt (order_type, customer_group)
        SELECT 'SAP_REG'::order_type AS ORDER_TYPE, cgm.name AS customer_group
        FROM public.customer_group_master cgm
        WHERE cgm.name IN ('10', '11', '15', '17', '20', '31', '35', '44', '48', '50', '51', '52', '62')
        UNION ALL 
        SELECT 'SAP_LIQ'::order_type AS ORDER_TYPE, cgm.name AS customer_group
        FROM public.customer_group_master cgm
        WHERE cgm.name IN ('10', '11', '15', '17', '20', '31', '35', '44', '48', '50', '51', '52', '62')
        ON CONFLICT (order_type, customer_group) DO NOTHING;

        `);
};

exports.down = pgm => {};
