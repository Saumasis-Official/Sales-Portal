/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        INSERT INTO sales_hierarchy_details (user_id, first_name, manager_id) VALUES ('PORTAL_MANAGED', 'PORTAL', 'PORTAL_MANAGED') ON CONFLICT DO NOTHING;
        `);
};

exports.down = pgm => {
    pgm.sql(`
        DELETE FROM sales_hierarchy_details WHERE user_id = 'PORTAL_MANAGED';
        `);
};
