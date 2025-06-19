/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        ALTER TYPE sync_type ADD VALUE IF NOT EXISTS 'MATERIAL_TAGS';

    `);

};

exports.down = pgm => {};
