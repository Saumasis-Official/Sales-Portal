/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    CREATE TABLE IF NOT EXISTS area_codes AS
    SELECT DISTINCT area_code as code FROM distributor_master WHERE area_code IS NOT NULL;
    ALTER TABLE area_codes ADD PRIMARY KEY (code);`);
};

exports.down = pgm => {
    pgm.sql(` DROP TABLE IF EXISTS area_codes;`);
};
