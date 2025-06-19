/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TYPE sync_type ADD VALUE IF NOT EXISTS 'AUTO_CLOSURE_GT';
        ALTER TYPE sync_type ADD VALUE IF NOT EXISTS 'AUTO_CLOSURE_MT_ECOM';
        `)
};

exports.down = pgm => {};
