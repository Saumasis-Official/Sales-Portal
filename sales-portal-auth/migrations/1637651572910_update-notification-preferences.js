/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
  
        CREATE TABLE IF NOT EXISTS notification_preferences (
            id serial PRIMARY KEY,
            user_profile_id VARCHAR NOT NULL,
            po_so_sms boolean DEFAULT TRUE,
            po_so_email boolean DEFAULT TRUE,
            po_so_whatsapp boolean DEFAULT TRUE,
            invoice_details_sync_sms boolean DEFAULT TRUE,
            invoice_details_sync_email boolean DEFAULT TRUE,
            invoice_details_sync_whatsapp boolean DEFAULT TRUE,
            created_at timestamptz NOT NULL DEFAULT NOW(),
            updated_at timestamptz NULL DEFAULT NOW(),
            FOREIGN KEY (user_profile_id) REFERENCES user_profile (id) ON DELETE CASCADE
        );

        ALTER TABLE IF EXISTS otp ADD COLUMN IF NOT EXISTS email VARCHAR NULL;

        ALTER TABLE IF EXISTS otp ALTER COLUMN mobile_number DROP NOT NULL;

        ALTER TABLE IF EXISTS notification_preferences DROP CONSTRAINT IF EXISTS UC_Person;

        ALTER TABLE IF EXISTS notification_preferences ADD CONSTRAINT UC_Person UNIQUE (id,user_profile_id);

    `);

};

exports.down = pgm => {

    pgm.sql(`

        ALTER TABLE IF EXISTS notification_preferences DROP CONSTRAINT IF EXISTS UC_Person;
        
        ALTER TABLE IF EXISTS otp DROP COLUMN IF EXISTS email;
        
        ALTER TABLE IF EXISTS otp ALTER COLUMN mobile_number SET NOT NULL;

        DROP TABLE IF EXISTS notification_preferences;

    `);

};
