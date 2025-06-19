/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_type') THEN
            CREATE TYPE sync_type AS ENUM (
                'DISTRIBUTOR',
                'MATERIAL',
                'SALES_HIER'
            );
            END IF;
        END
        $$;
        
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_result') THEN
            CREATE TYPE sync_result AS ENUM (
                'SUCCESS',
                'FAIL'
            );
            END IF;
        END
        $$;
        
        CREATE TABLE IF NOT EXISTS sync_logs  (
            id SERIAL PRIMARY KEY,
            type sync_type NOT NULL,
            run_at timestamptz NOT NULL,
            result sync_result NOT NULL,
            upsert_count INT DEFAULT NULL,
            delete_count INT DEFAULT NULL,
            created_on timestamptz NOT NULL DEFAULT NOW(),
            updated_on timestamptz NULL DEFAULT NOW()
        );
    
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        DROP TABLE IF EXISTS sync_logs;
        DROP TYPE IF EXISTS sync_type;
        DROP TYPE IF EXISTS sync_result;
        
    `);

};
