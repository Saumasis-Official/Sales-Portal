/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`

        DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_type') THEN
                CREATE TYPE product_type AS ENUM (
                    'UNIVERSAL',
                    'DIST_SPECIFIC'
                );
                END IF;
            END
        $$;
    
        ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS product_type product_type NOT NULL DEFAULT 'UNIVERSAL'; 

        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_type') THEN
                ALTER TYPE sync_type ADD VALUE IF NOT EXISTS 'DIST_INVENTORY';
            END IF;
        END
        $$;

    `);

};

exports.down = pgm => {

    pgm.sql(`

        ALTER TABLE IF EXISTS orders DROP COLUMN IF EXISTS product_type; 

        DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_type') THEN
                DROP TYPE product_type;
                END IF;
            END
        $$;

    `);

};
