/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(
        `DO $$
                BEGIN
                    ALTER TABLE  IF EXISTS service_delivery_requests
                        ALTER COLUMN sd_req_comments TYPE text,
                        ALTER COLUMN sd_res_comments TYPE text;
                END;
            $$;
    

        DO $$
                BEGIN
                    ALTER TABLE service_delivery_requests
                        RENAME COLUMN so_number TO order_id;
                EXCEPTION
                    WHEN undefined_column THEN RAISE NOTICE 'column so_number does not exist';
                END;
            $$;`
    )
};

exports.down = pgm => {};
