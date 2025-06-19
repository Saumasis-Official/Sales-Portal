/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
            CREATE TYPE request_status AS ENUM (
                'PENDING','APPROVED','REJECTED'
            );
            END IF;
        END
        $$;

        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_type') THEN
            CREATE TYPE request_type AS ENUM (
                'ADD','REMOVE'
            );
            END IF;
        END
        $$;
    
        CREATE TABLE IF NOT EXISTS mapping_requests  (
            id SERIAL PRIMARY KEY,
            status request_status NOT NULL,
            type request_type NOT NULL,
            distributor_code varchar NOT NULL,
            TSE_code varchar NOT NULL,
            ASMRSM_code varchar NOT NULL,
            submission_comments TEXT DEFAULT NULL,
            comments TEXT DEFAULT NULL,
            created_by VARCHAR(255) NOT NULL,
            updated_by VARCHAR(255) DEFAULT NULL,
            created_on timestamptz NOT NULL DEFAULT NOW(),
            updated_on timestamptz NULL DEFAULT NOW()
            );
    `);
};

exports.down = pgm => {
    pgm.sql(`
        DROP TABLE IF EXISTS mapping_requests;
        DROP TYPE IF EXISTS request_status;
        DROP TYPE IF EXISTS request_type;
    `);
};
