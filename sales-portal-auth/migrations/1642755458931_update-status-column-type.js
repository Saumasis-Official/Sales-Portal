/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS orders ALTER COLUMN status TYPE varchar(50);
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        ALTER TABLE IF EXISTS orders ALTER COLUMN status TYPE order_status USING status::order_status;
    
    `);

};
