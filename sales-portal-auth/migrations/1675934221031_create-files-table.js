/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`

    CREATE TYPE help_category AS ENUM ('FAQ', 'SOP');

    CREATE TABLE IF NOT EXISTS files  (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description text DEFAULT NULL,
        category help_category DEFAULT NULL,
        file_path TEXT[] DEFAULT NULL,
        file_name TEXT[] DEFAULT NULL,
        status entity_status DEFAULT 'ACTIVE',
        contact_name VARCHAR(50) DEFAULT NULL,
        contact_number VARCHAR(50) DEFAULT NULL,
        email VARCHAR(255) DEFAULT NULL,
        uploaded_by VARCHAR(50) NULL,
        uploaded_on timestamptz NOT NULL DEFAULT NOW(),
        updated_on timestamptz NULL DEFAULT NOW()
    );
        `);
};

exports.down = pgm => {
    pgm.sql(`
             DROP TABLE IF EXISTS files;

             DROP TYPE help_category;
        `);
};
