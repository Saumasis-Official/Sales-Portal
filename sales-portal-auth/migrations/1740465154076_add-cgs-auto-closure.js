/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM unnest(enum_range(NULL::public.order_type)) AS enum_value WHERE enum_value = 'CALL_CENTER') THEN
                INSERT INTO public.auto_closure_gt (order_type, customer_group)
                SELECT enum_value AS order_type, cgm.name AS customer_group
                FROM unnest(enum_range(NULL::public.order_type)) AS enum_value
                CROSS JOIN public.customer_group_master cgm
                WHERE cgm.name IN ('10', '11', '15', '17', '20', '31', '35', '44', '48', '50', '51', '52', '62', '69', '70')
                ON CONFLICT (order_type, customer_group) DO NOTHING;
            END IF;
        END $$;
    `);
};

exports.down = pgm => {};
