/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`

        DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_config_field_type') THEN
                CREATE TYPE app_config_field_type AS ENUM (
                    'SET',
                    'TEXT'
                );
                END IF;
            END
        $$;
    
        CREATE TABLE IF NOT EXISTS app_level_settings (
            key VARCHAR(255) NOT NULL PRIMARY KEY,
            value TEXT NOT NULL,
            updated_by VARCHAR(255) NOT NULL,
            remarks TEXT DEFAULT NULL,
            allowed_values TEXT[] DEFAULT NULL,
            field_type app_config_field_type DEFAULT 'TEXT',
            description TEXT DEFAULT NULL,
            created_on timestamptz NOT NULL DEFAULT NOW(),
            updated_on timestamptz NULL DEFAULT NOW()
        );

        INSERT INTO app_level_settings (key, value, updated_by, allowed_values, field_type, description) VALUES
        ('DEFAULT_SEARCH_BEHAVIOUR', 'DIST_SPECIFIC', 'SET_BY_SYSTEM', '{"DIST_SPECIFIC", "UNIVERSAL"}', 'SET', 'To allow distributor to search either universal products or distributor-specific products by default');

        CREATE OR REPLACE FUNCTION trigger_set_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
        NEW.updated_on = NOW();
        RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER set_timestamp
        BEFORE UPDATE ON app_level_settings
        FOR EACH ROW
        EXECUTE PROCEDURE trigger_set_timestamp();
    
    `);

};

exports.down = pgm => {

    pgm.sql(`
    
        DROP TABLE IF EXISTS app_level_settings;

        DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_config_field_type') THEN
                DROP TYPE app_config_field_type;
                END IF;
            END
        $$;

    `);

};
