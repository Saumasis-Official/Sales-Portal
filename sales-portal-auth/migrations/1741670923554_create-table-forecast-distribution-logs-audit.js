/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS audit.forecast_distribution_logs_audit (
            id SERIAL PRIMARY KEY,
            area_code varchar(6) NOT NULL,
            psku varchar(18) NOT NULL,
            applicable_month varchar(6) NOT NULL,
            payload JSONB ,
            created_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            error_log  TEXT,
            query TEXT NOT NULL
        );    
    `);
};

exports.down = (pgm) => {};
