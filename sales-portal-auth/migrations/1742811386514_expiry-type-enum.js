/* eslint-disable camelcase */
/* eslint-disable no-undef */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
      
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expiry_type_enum') THEN
            CREATE type credit.expiry_type_enum AS ENUM ('NA', 'REVERTED', 'MASTER_UPLOAD','PREVIOUSLY_APPROVED');
        END IF;
    END $$;
   
     ALTER TABLE credit.transactions DROP COLUMN IF EXISTS expiry_type;

     ALTER TABLE credit.transactions add column expiry_type credit.expiry_type_enum NOT NULL DEFAULT 'NA'::credit.expiry_type_enum;
 
    `);
};

exports.down = (pgm) => {
    pgm.sql(`
        DROP TYPE IF EXISTS credit.expiry_type_enum;
        ALTER TABLE credit.transactions DROP COLUMN IF EXISTS expiry_type;
    `);
};
