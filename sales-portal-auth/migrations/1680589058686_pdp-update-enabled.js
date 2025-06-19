/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    DO $$
        BEGIN
                ALTER TABLE customer_group_master
                ADD COLUMN pdp_update_enabled boolean DEFAULT false;
        END
	$$;
    `)
};

exports.down = pgm => {
    pgm.sql(`
    DO $$
        BEGIN
                ALTER TABLE customer_group_master
                DROP COLUMN pdp_update_enabled ;
        END
	$$;
    `)
};
