/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        CREATE TABLE IF NOT EXISTS sales_hierarchy_details  (
            user_id VARCHAR(20) PRIMARY KEY,
            first_name VARCHAR(50) DEFAULT NULL,
            last_name VARCHAR(50) DEFAULT NULL,
            email VARCHAR(255) DEFAULT NULL,
            mobile_number VARCHAR(20) DEFAULT NULL,
            manager_id VARCHAR(20) NULL,
            code VARCHAR(50) NULL,
            created_on timestamptz NOT NULL DEFAULT NOW(),
            updated_on timestamptz NULL DEFAULT NOW()
        );
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        DROP TABLE IF EXISTS sales_hierarchy_details;
    
    `);

};
