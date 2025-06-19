/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS session_log (
            id SERIAL PRIMARY KEY,
            login_id VARCHAR(20) NOT NULL,
            login_time timestamptz NULL,
            logout_time timestamptz NULL,
            failed_attempts_count INT NOT NULL DEFAULT 0,
            failed_attempt_time timestamptz NULL,
            correlation_id VARCHAR(255)
        );
    `);
};

exports.down = pgm => {
    pgm.sql(`
        DROP TABLE IF EXISTS session_log;
    `);   
};
