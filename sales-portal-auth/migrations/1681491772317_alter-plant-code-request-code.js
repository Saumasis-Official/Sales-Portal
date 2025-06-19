/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(
        `DO $$
                BEGIN
                    ALTER TABLE  IF EXISTS plant_code_update_request
                        ALTER COLUMN code TYPE text;
                END;
            $$;`
    );
};

exports.down = pgm => {};
