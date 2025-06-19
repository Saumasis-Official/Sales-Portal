/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`   
            ALTER TABLE IF EXISTS forecast_configurations DROP CONSTRAINT IF EXISTS forecast_configurations_pkey;
            ALTER TABLE IF EXISTS forecast_configurations ADD PRIMARY KEY(area_code, applicable_month, customer_group);
    `);
};

exports.down = pgm => {
    pgm.sql(`
        
    `);
};
