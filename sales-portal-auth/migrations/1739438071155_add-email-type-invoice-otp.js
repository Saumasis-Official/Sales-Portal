/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DELIVERY_CODE' AND enumtypid = 'email_type'::regtype) THEN
                ALTER TYPE email_type ADD VALUE 'DELIVERY_CODE';
            END IF;
        END
        $$;
        `);
};

exports.down = pgm => {};
