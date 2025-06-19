/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    CREATE TYPE plant_request_type AS ENUM ('Add_Plant','Update_Plant','Delete_Plant');
`);
};

exports.down = pgm => {

    pgm.sql(`
    DROP TYPE plant_request_type
    `);
};