/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(
    `
        ALTER TYPE roles_type ADD VALUE IF NOT EXISTS 'MDM';
        ALTER TYPE roles_type ADD VALUE IF NOT EXISTS 'KAMS';
    `)
};

exports.down = pgm => {};
