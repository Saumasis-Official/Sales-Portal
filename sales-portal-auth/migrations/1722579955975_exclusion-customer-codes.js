/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.mt_ecom_exclusion_customer_codes (
        id SERIAL4 NOT NULL,
        customer_code VARCHAR(20) NOT NULL UNIQUE
    );
    INSERT INTO mt_ecom_exclusion_customer_codes (customer_code)
    SELECT dm.profile_id AS customer_code
    FROM distributor_master dm
    LEFT JOIN user_profile up ON up.id = dm.profile_id
    WHERE dm.group_id IN (48, 51) AND up.name ILIKE '%rel%' AND dm.deleted IS FALSE
    ON CONFLICT (customer_code) DO NOTHING;
    `)
};

exports.down = pgm => {};
