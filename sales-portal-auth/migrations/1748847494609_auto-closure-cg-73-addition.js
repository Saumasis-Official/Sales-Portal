/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    pgm.sql(`
        INSERT INTO public.auto_closure_gt (order_type, customer_group)
        SELECT order_type, cgm.name AS customer_group
        FROM public.customer_group_master cgm,
            (VALUES ('SAP_REG'::order_type), 
                    ('SAP_LIQ'::order_type), 
                    ('CALL_CENTER'::order_type)) AS ot(order_type)
        WHERE cgm.name = '73'
        ON CONFLICT (order_type, customer_group) DO NOTHING;
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {};
