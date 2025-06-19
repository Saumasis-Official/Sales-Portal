/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(
    `INSERT INTO app_level_settings(
	key, value, updated_by, field_type,allowed_values, description)
	VALUES 
    ('AO_METRO_ENABLE_N1', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_METRO_ENABLE_N2', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_METRO_ENABLE_S1', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_METRO_ENABLE_S2', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_METRO_ENABLE_S3', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_METRO_ENABLE_E1', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_METRO_ENABLE_E2', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_METRO_ENABLE_W1', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_METRO_ENABLE_W2', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_METRO_ENABLE_C1', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_METRO_ENABLE_C2', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_NON_METRO_ENABLE_N1', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_NON_METRO_ENABLE_N2', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_NON_METRO_ENABLE_S1', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_NON_METRO_ENABLE_S2', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_NON_METRO_ENABLE_S3', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_NON_METRO_ENABLE_E1', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_NON_METRO_ENABLE_E2', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_NON_METRO_ENABLE_W1', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_NON_METRO_ENABLE_W2', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_NON_METRO_ENABLE_C1', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_NON_METRO_ENABLE_C2', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_METRO_ORDER_SUBMIT_N1', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_METRO_ORDER_SUBMIT_N2', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_METRO_ORDER_SUBMIT_S1', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_METRO_ORDER_SUBMIT_S2', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_METRO_ORDER_SUBMIT_S3', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_METRO_ORDER_SUBMIT_E1', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_METRO_ORDER_SUBMIT_E2', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_METRO_ORDER_SUBMIT_W1', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_METRO_ORDER_SUBMIT_W2', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_METRO_ORDER_SUBMIT_C1', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_METRO_ORDER_SUBMIT_C2', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_NON_METRO_ORDER_SUBMIT_N1', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_NON_METRO_ORDER_SUBMIT_N2', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_NON_METRO_ORDER_SUBMIT_S1', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_NON_METRO_ORDER_SUBMIT_S2', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_NON_METRO_ORDER_SUBMIT_S3', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_NON_METRO_ORDER_SUBMIT_E1', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_NON_METRO_ORDER_SUBMIT_E2', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_NON_METRO_ORDER_SUBMIT_W1', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_NON_METRO_ORDER_SUBMIT_W2', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_NON_METRO_ORDER_SUBMIT_C1', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_NON_METRO_ORDER_SUBMIT_C2', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit')
    ON  CONFLICT DO NOTHING;

    INSERT INTO app_level_settings(
        key, value, updated_by, field_type, description)
        VALUES 
    ('AO_METRO_TOLERANCE_MAX_N1', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_METRO_TOLERANCE_MAX_N2', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_METRO_TOLERANCE_MAX_S1', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_METRO_TOLERANCE_MAX_S2', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_METRO_TOLERANCE_MAX_S3', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_METRO_TOLERANCE_MAX_E1', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_METRO_TOLERANCE_MAX_E2', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_METRO_TOLERANCE_MAX_W1', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_METRO_TOLERANCE_MAX_W2', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_METRO_TOLERANCE_MAX_C1', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_METRO_TOLERANCE_MAX_C2', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_METRO_TOLERANCE_MIN_N1', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_METRO_TOLERANCE_MIN_N2', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_METRO_TOLERANCE_MIN_S1', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_METRO_TOLERANCE_MIN_S2', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_METRO_TOLERANCE_MIN_S3', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_METRO_TOLERANCE_MIN_E1', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_METRO_TOLERANCE_MIN_E2', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_METRO_TOLERANCE_MIN_W1', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_METRO_TOLERANCE_MIN_W2', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_METRO_TOLERANCE_MIN_C1', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_METRO_TOLERANCE_MIN_C2', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level')
    ON  CONFLICT DO NOTHING;

    INSERT INTO app_level_settings(
        key, value, updated_by, field_type, description)
        VALUES 
    ('AO_NON_METRO_TOLERANCE_MAX_N1', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_NON_METRO_TOLERANCE_MAX_N2', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_NON_METRO_TOLERANCE_MAX_S1', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_NON_METRO_TOLERANCE_MAX_S2', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_NON_METRO_TOLERANCE_MAX_S3', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_NON_METRO_TOLERANCE_MAX_E1', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_NON_METRO_TOLERANCE_MAX_E2', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_NON_METRO_TOLERANCE_MAX_W1', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_NON_METRO_TOLERANCE_MAX_W2', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_NON_METRO_TOLERANCE_MAX_C1', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_NON_METRO_TOLERANCE_MAX_C2', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_NON_METRO_TOLERANCE_MIN_N1', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_NON_METRO_TOLERANCE_MIN_N2', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_NON_METRO_TOLERANCE_MIN_S1', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_NON_METRO_TOLERANCE_MIN_S2', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_NON_METRO_TOLERANCE_MIN_S3', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_NON_METRO_TOLERANCE_MIN_E1', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_NON_METRO_TOLERANCE_MIN_E2', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_NON_METRO_TOLERANCE_MIN_W1', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_NON_METRO_TOLERANCE_MIN_W2', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_NON_METRO_TOLERANCE_MIN_C1', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level'),
    ('AO_NON_METRO_TOLERANCE_MIN_C2', '0.0', 'PORTAL_MANAGED', 'TEXT', 'To set the tolerance level')
    ON  CONFLICT DO NOTHING;
    `
    );
};

exports.down = pgm => {};
