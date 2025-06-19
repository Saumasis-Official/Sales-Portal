/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    CREATE TABLE IF NOT EXISTS ars_recommendation (
        id SERIAL PRIMARY KEY,
        distributor_id varchar(20) NOT NULL,
        pdp_day varchar(20),
        created_on timestamp with time zone NOT NULL DEFAULT NOW(),
        updated_on timestamp with time zone NOT NULL DEFAULT NOW(),
        is_deleted boolean DEFAULT false,
        order_placed boolean DEFAULT false,
        recommended_materials jsonb,
        FOREIGN KEY (distributor_id) REFERENCES distributor_master (id)
    );
`)
};

exports.down = pgm => { };
