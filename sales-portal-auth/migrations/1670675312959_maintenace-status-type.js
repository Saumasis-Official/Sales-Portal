/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
             CREATE TYPE maintenance_status AS ENUM ('OPEN','CLOSE');
        `);
};

exports.down = pgm => {
    `
    DROP TYPE maintenance_status
    `
};
