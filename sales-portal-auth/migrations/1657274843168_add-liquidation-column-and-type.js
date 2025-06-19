/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
                ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'LIQUID_DRAFT';
            END IF;
        END
        $$;

        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type') THEN
            CREATE TYPE order_type AS ENUM (
                'NORMAL',
                'LIQUIDATION'
            );
            END IF;
        END
        $$;

        ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS order_type order_type NOT NULL DEFAULT 'NORMAL';        

    `);

};

exports.down = pgm => {

    pgm.sql(`

        ALTER TABLE IF EXISTS orders DROP COLUMN IF EXISTS order_type;        
    
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type') THEN
            DROP TYPE order_type;
            END IF;
        END
        $$;
    
    `);

};
