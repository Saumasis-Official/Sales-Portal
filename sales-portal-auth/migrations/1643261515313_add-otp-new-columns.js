/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`

        TRUNCATE TABLE otp;
    
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'otp_type') THEN
                CREATE TYPE otp_type AS ENUM (
                    'RESET_PASS',
                    'UPDATE_MOBILE',
                    'UPDATE_EMAIL'
                );
            END IF;
        END
        $$;

        ALTER TABLE IF EXISTS otp ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0, 
        ADD COLUMN IF NOT EXISTS retry_time TIMESTAMP DEFAULT NULL, 
        ADD COLUMN IF NOT EXISTS type otp_type;

        ALTER TABLE IF EXISTS OTP ADD CONSTRAINT unique_otp UNIQUE (distributor_id, type);
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS OTP DROP CONSTRAINT IF EXISTS unique_otp;

        ALTER TABLE IF EXISTS otp DROP COLUMN IF EXISTS retry_count, 
        DROP COLUMN IF EXISTS retry_time, 
        DROP COLUMN IF EXISTS type;

        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'otp_type') THEN
                DROP TYPE otp_type;
            END IF;
        END
        $$;
    
    `);

};
