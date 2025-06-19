/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
        INSERT INTO app_level_settings (key, value, updated_by, allowed_values, field_type, description) VALUES
            ('ENABLE_PSKU', 'NO', 'PORTAL_MANAGED', '{"YES", "NO"}', 'SET', 'To enable the processing of PSKU Forcast file');

        ALTER TYPE sync_type ADD VALUE IF NOT EXISTS 'PSKU_DIST_INVENTORY';
        `);

};

exports.down = pgm => {
    pgm.sql(`
        DELETE FROM app_level_settings where key IN ('ENABLE_PSKU');
        ALTER TYPE sync_type DROP VALUE IF EXISTS 'PSKU_DIST_INVENTORY';
    `);
};
