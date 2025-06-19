/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    BEGIN;
        ALTER TYPE service_request_type ADD VALUE IF NOT EXISTS 'RO_REASONS';
    COMMIT;

    BEGIN;
        INSERT INTO service_request_categories(label, description, type) VALUES
            ('Wholesale order', '', 'RO_REASONS'),
            ('FTL request', '', 'RO_REASONS'),
            ('Out of Stock at DB', '', 'RO_REASONS'),
            ('Others', '', 'RO_REASONS')
        ON CONFLICT DO NOTHING;

        ALTER TABLE public.order_approval_requests ADD IF NOT EXISTS reason varchar(255) NULL;
        ALTER TABLE public.order_approval_requests ADD IF NOT EXISTS comments varchar(255) NULL;
    COMMIT;
   `);
};

exports.down = pgm => {
    pgm.sql(`
    BEGIN;
        ALTER TABLE public.order_approval_requests DROP COLUMN IF EXISTS reason;
        ALTER TABLE public.order_approval_requests DROP COLUMN IF EXISTS comments;

        DELETE FROM service_request_categories WHERE label IN ('Wholesale order','FTL request','Out of Stock at DB','Others');
    COMMIT;
   `);
};