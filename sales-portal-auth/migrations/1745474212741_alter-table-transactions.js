/* eslint-disable camelcase */
/* eslint-disable no-undef */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        
        ALTER TABLE IF EXISTS credit.transactions 
        ADD COLUMN IF NOT EXISTS approver2_remarks varchar(255), 
        ADD COLUMN IF NOT EXISTS approver3_remarks varchar(255)                       
    `);
};

exports.down = (pgm) => {
    pgm.sql(`
    `);
};
