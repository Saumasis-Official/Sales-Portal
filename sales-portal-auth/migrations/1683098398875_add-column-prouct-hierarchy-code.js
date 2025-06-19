/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(
        `DO $$
                BEGIN
                    ALTER TABLE  IF EXISTS material_master
                        ADD product_hierarchy_code TEXT;
                END;
            $$;`
    );
};

exports.down = pgm => {};
