/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        Create table if not exists iso_state (
            id serial primary key,
            state_name varchar not null,
            type varchar not null,
            iso_code varchar not null,
            created_at timestamp default current_timestamp,
            updated_at timestamp default current_timestamp,
            CONSTRAINT iso_state_unique UNIQUE (iso_code)

        );
        `)
};

exports.down = pgm => {
    pgm.sql(`
        Drop table if exists iso_state;
        `)
};
