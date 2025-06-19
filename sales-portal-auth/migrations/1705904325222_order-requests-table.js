/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type') THEN
                    ALTER TYPE order_type ADD VALUE IF NOT EXISTS 'RUSH';
                END IF;
                IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
                    ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'RUSH_DRAFT';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_approval_status') THEN
                CREATE TYPE order_approval_status AS ENUM (
                    'PENDING',
                    'APPROVED',
                    'REJECTED',
                    'EXPIRED'
                );
                END IF;
                CREATE TABLE IF NOT EXISTS  order_approval_requests (
                    id bigserial NOT NULL,
                    request_number varchar(20) NOT NULL UNIQUE,
                    distributor_id varchar(20) NOT NULL,
                    po_number varchar NOT NULL,
                    so_number varchar,
                    amount varchar,
                    status order_approval_status NOT NULL DEFAULT 'PENDING'::order_approval_status,
                    type order_type NOT NULL,
                    requested_on timestamptz DEFAULT now(),
                    requested_by varchar NOT NULL DEFAULT 'DISTRIBUTOR',
                    responded_on timestamptz,
                    responded_by varchar,
                    CONSTRAINT order_requests_pkey PRIMARY KEY (id),
                    CONSTRAINT po_number_ukey UNIQUE (po_number),
                    CONSTRAINT distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributor_master(id) ON DELETE CASCADE ON UPDATE CASCADE,
                    CONSTRAINT po_number_fkey FOREIGN KEY (po_number) REFERENCES orders (po_number) ON DELETE CASCADE ON UPDATE CASCADE
                );
                
                INSERT INTO app_level_settings(
                    key, value, updated_by, field_type,allowed_values, description)
                    VALUES 
                    ('ENABLE_ORDER_APPROVAL_RUSH_ORDER', 'YES', 'PORTAL_MANAGED', 'SET', '{"YES", "NO"}', 'To enable/disable order approval mechanism for rush orders.')
                ON CONFLICT DO NOTHING;
            END
            $$;
        `);
};

exports.down = (pgm) => {
    pgm.sql(`
            DROP TABLE IF EXISTS order_approval_requests;
            DROP TYPE IF EXISTS order_approval_status;
            DELETE FROM app_level_settings WHERE key='ENABLE_ORDER_APPROVAL_RUSH_ORDER';
        `);
};