/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        CREATE TABLE IF NOT EXISTS alert_history  (
            id SERIAL PRIMARY KEY,
            alert_setting_changes jsonb DEFAULT NULL,
            remarks TEXT DEFAULT NULL,
            distributor_id VARCHAR(20),
            changed_by VARCHAR(50) DEFAULT NULL,
            created_on timestamptz NOT NULL DEFAULT NOW(),
            updated_on timestamptz NULL DEFAULT NOW()
        );
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        DROP TABLE IF EXISTS alert_history;
    
    `);

};
