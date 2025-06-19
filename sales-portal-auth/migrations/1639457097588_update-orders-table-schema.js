/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        UPDATE orders SET delivery_no = NULL, invoice_no = NULL;
        ALTER TABLE IF EXISTS orders ALTER COLUMN delivery_no DROP DEFAULT, ALTER COLUMN invoice_no DROP DEFAULT;
        ALTER TABLE IF EXISTS orders ALTER COLUMN delivery_no TYPE TEXT[] USING delivery_no::TEXT[], ALTER COLUMN invoice_no TYPE TEXT[] USING invoice_no::TEXT[];
        ALTER TABLE IF EXISTS orders ALTER COLUMN delivery_no SET DEFAULT NULL, ALTER COLUMN invoice_no SET DEFAULT NULL;

        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
            CREATE TYPE order_status AS ENUM (
                'NOT DELIVERED',
                'COMPLETED',
                'PARTIALLY DELIVERED'
            );
            END IF;
        END
        $$;

        ALTER TABLE IF EXISTS orders DROP COLUMN IF EXISTS status;
        ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS status order_status NOT NULL DEFAULT 'NOT DELIVERED';
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS orders ALTER COLUMN delivery_no DROP DEFAULT, ALTER COLUMN invoice_no DROP DEFAULT;
        ALTER TABLE IF EXISTS orders ALTER COLUMN delivery_no TYPE TEXT USING delivery_no::TEXT, ALTER COLUMN invoice_no TYPE TEXT USING invoice_no::TEXT;
        ALTER TABLE IF EXISTS orders ALTER COLUMN delivery_no SET DEFAULT NULL, ALTER COLUMN invoice_no SET DEFAULT NULL;

        ALTER TABLE IF EXISTS orders DROP COLUMN IF EXISTS status;
        ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS status entity_status NOT NULL DEFAULT 'ACTIVE';

        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
            DROP TYPE order_status;
            END IF;
        END
        $$;
    
    `);

};
