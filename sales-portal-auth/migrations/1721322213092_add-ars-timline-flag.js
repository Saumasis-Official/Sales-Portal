/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        INSERT INTO app_level_settings (KEY, value, updated_by, allowed_values, field_type, description)
        VALUES 
        ('AO_METRO_ADJUSTMENT_ENABLE', 'TRUE', 'PORTAL_MANAGED', '{TRUE,FALSE}', 'SET', 'Flag to enable ARS adjustment for Metro DB'),
        ('AO_NON_METRO_ADJUSTMENT_ENABLE', 'TRUE', 'PORTAL_MANAGED', '{TRUE,FALSE}', 'SET', 'Flag to enable ARS adjustment for Non-Metro DB'),
        ('AO_PRAGATI_ADJUSTMENT_ENABLE', 'TRUE', 'PORTAL_MANAGED', '{TRUE,FALSE}', 'SET', 'Flag to enable ARS adjustment for Pragati DB')
        on conflict do nothing;
        `)
};

exports.down = pgm => {
    pgm.sql(`
        DELETE FROM app_level_settings WHERE KEY IN ('AO_METRO_ADJUSTMENT_ENABLE', 'AO_NON_METRO_ADJUSTMENT_ENABLE', 'AO_PRAGATI_ADJUSTMENT_ENABLE');
    `)
};
