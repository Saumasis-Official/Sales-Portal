/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
  
        CREATE TABLE IF NOT EXISTS order_history_recommendation (
            id serial PRIMARY KEY,
            material_code bigint NOT NULL,
            status entity_status NOT NULL DEFAULT 'ACTIVE',
            distributor_code varchar NOT NULL,
            created_on timestamptz NOT NULL DEFAULT NOW(),
            updated_on timestamptz NULL DEFAULT NOW(),
            FOREIGN KEY (distributor_code) REFERENCES distributor_master (id),
            FOREIGN KEY (material_code) REFERENCES material_master (code)
        );

    `);

};

exports.down = pgm => {

    pgm.sql(`

        DROP TABLE IF EXISTS order_history_recommendation;

    `);
};
