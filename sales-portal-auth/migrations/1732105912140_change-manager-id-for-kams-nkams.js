/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        Update sales_hierarchy_details set manager_id = 'PORTAL_MANAGED' where roles = 'KAMS' or roles = 'NKAMS'; 
        `)
};

exports.down = pgm => {};
