/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    INSERT INTO app_level_settings(
	key, value, updated_by, field_type,allowed_values, description)
	VALUES 
    ('AO_PRAGATI_ENABLE_N1', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_PRAGATI_ENABLE_N2', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_PRAGATI_ENABLE_S1', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_PRAGATI_ENABLE_S2', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_PRAGATI_ENABLE_S3', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_PRAGATI_ENABLE_E1', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_PRAGATI_ENABLE_E2', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_PRAGATI_ENABLE_W1', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_PRAGATI_ENABLE_W2', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_PRAGATI_ENABLE_C1', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_PRAGATI_ENABLE_C2', 'TRUE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering'),
    ('AO_PRAGATI_ORDER_SUBMIT_N1', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_PRAGATI_ORDER_SUBMIT_N2', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_PRAGATI_ORDER_SUBMIT_S1', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_PRAGATI_ORDER_SUBMIT_S2', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_PRAGATI_ORDER_SUBMIT_S3', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_PRAGATI_ORDER_SUBMIT_E1', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_PRAGATI_ORDER_SUBMIT_E2', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_PRAGATI_ORDER_SUBMIT_W1', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_PRAGATI_ORDER_SUBMIT_W2', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_PRAGATI_ORDER_SUBMIT_C1', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_PRAGATI_ORDER_SUBMIT_C2', 'FALSE', 'PORTAL_MANAGED', 'SET', '{"TRUE", "FALSE"}', 'To enable/disable Auto-ordering auto submit'),
    ('AO_PRAGATI_ADJUSTMENT_START_DATE', '19', 'PORTAL_MANAGED', 'SET', '{"1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31"}', 'To set the date form which the user will be able to edit the forecast. Applicable for all 12 months'),
    ('AO_PRAGATI_ADJUSTMENT_END_DATE', '31', 'PORTAL_MANAGED', 'SET', '{"1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31"}', 'To set the date till which the user will be able to edit the forecast. Applicable for all 12 months')
    ON CONFLICT DO NOTHING;

   INSERT INTO stock_norm_default (customer_group_id, class_a_sn, class_a_ss_percent, class_b_sn, class_b_ss_percent, class_c_sn, class_c_ss_percent)
        select 
            cgm.id,
            10 as class_a_sn,
            50 as class_a_ss_percent,
            12 as class_b_sn, 
            50 as class_b_ss_percent,
            15 as class_c_sn,
            50 as class_c_ss_percent
            from customer_group_master cgm
        where cgm.name = '48'
        ON CONFLICT DO NOTHING;


    `);
};

exports.down = pgm => {
    pgm.sql(`
    DELETE FROM app_level_settings
    WHERE key IN (
        'AO_PRAGATI_ENABLE_N1',
        'AO_PRAGATI_ENABLE_N2',
        'AO_PRAGATI_ENABLE_S1',
        'AO_PRAGATI_ENABLE_S2',
        'AO_PRAGATI_ENABLE_S3',
        'AO_PRAGATI_ENABLE_E1',
        'AO_PRAGATI_ENABLE_E2',
        'AO_PRAGATI_ENABLE_W1',
        'AO_PRAGATI_ENABLE_W2',
        'AO_PRAGATI_ENABLE_C1',
        'AO_PRAGATI_ENABLE_C2',
        'AO_PRAGATI_ORDER_SUBMIT_N1',
        'AO_PRAGATI_ORDER_SUBMIT_N2',
        'AO_PRAGATI_ORDER_SUBMIT_S1',
        'AO_PRAGATI_ORDER_SUBMIT_S2',
        'AO_PRAGATI_ORDER_SUBMIT_S3',
        'AO_PRAGATI_ORDER_SUBMIT_E1',
        'AO_PRAGATI_ORDER_SUBMIT_E2',
        'AO_PRAGATI_ORDER_SUBMIT_W1',
        'AO_PRAGATI_ORDER_SUBMIT_W2',
        'AO_PRAGATI_ORDER_SUBMIT_C1',
        'AO_PRAGATI_ORDER_SUBMIT_C2',
        'AO_PRAGATI_ADJUSTMENT_START_DATE',
        'AO_PRAGATI_ADJUSTMENT_END_DATE'
    );
    `);
};
