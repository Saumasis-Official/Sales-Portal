/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(
        `INSERT INTO app_level_settings(
	key, value, updated_by, field_type, description)
	VALUES 
    ('PDP_WE_ORDER_WINDOW_MO', '67:59', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window time (in hours) for weekly case. For eg. 36 hours = 1.5 days window'),
    ('PDP_WE_ORDER_PLACEMENT_END_TIME_MO', '-4:01', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window end time in 24-hour format. For eg. -4:01 is 07:59 PM before midnight of the PDP day and 11 is 11:00 AM on the PDP day'),
    ('PDP_WE_ORDER_WINDOW_TU', '67:59', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window time (in hours) for weekly case. For eg. 36 hours = 1.5 days window'),
    ('PDP_WE_ORDER_PLACEMENT_END_TIME_TU', '-4:01', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window end time in 24-hour format. For eg. -4:01 is 07:59 PM before midnight of the PDP day and 11 is 11:00 AM on the PDP day'),
    ('PDP_WE_ORDER_WINDOW_WE', '43:59', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window time (in hours) for weekly case. For eg. 36 hours = 1.5 days window'),
    ('PDP_WE_ORDER_PLACEMENT_END_TIME_WE', '-4:01', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window end time in 24-hour format. For eg. -4:01 is 07:59 PM before midnight of the PDP day and 11 is 11:00 AM on the PDP day'),
    ('PDP_WE_ORDER_WINDOW_TH', '43:59', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window time (in hours) for weekly case. For eg. 36 hours = 1.5 days window'),
    ('PDP_WE_ORDER_PLACEMENT_END_TIME_TH', '-4:01', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window end time in 24-hour format. For eg. -4:01 is 07:59 PM before midnight of the PDP day and 11 is 11:00 AM on the PDP day'),
    ('PDP_WE_ORDER_WINDOW_FR', '43:59', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window time (in hours) for weekly case. For eg. 36 hours = 1.5 days window'),
    ('PDP_WE_ORDER_PLACEMENT_END_TIME_FR', '-4:01', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window end time in 24-hour format. For eg. -4:01 is 07:59 PM before midnight of the PDP day and 11 is 11:00 AM on the PDP day'),
    ('PDP_WE_ORDER_WINDOW_SA', '43:59', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window time (in hours) for weekly case. For eg. 36 hours = 1.5 days window'),
    ('PDP_WE_ORDER_PLACEMENT_END_TIME_SA', '-4:01', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window end time in 24-hour format. For eg. -4:01 is 07:59 PM before midnight of the PDP day and 11 is 11:00 AM on the PDP day'),
    ('PDP_WE_ORDER_WINDOW_SU', '43:59', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window time (in hours) for weekly case. For eg. 36 hours = 1.5 days window'),
    ('PDP_WE_ORDER_PLACEMENT_END_TIME_SU', '-4:01', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window end time in 24-hour format. For eg. -4:01 is 07:59 PM before midnight of the PDP day and 11 is 11:00 AM on the PDP day'),
    ('PDP_FN_ORDER_WINDOW_MO', '67:59', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window time (in hours) for fortnight case. For eg. 48 hours = 2 days window'),
    ('PDP_FN_ORDER_PLACEMENT_END_TIME_MO', '-4:01', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window end time in 24-hour format. For eg. -4:01 is 07:59 PM before midnight of the PDP day and 11 is 11:00 AM on the PDP day'),
    ('PDP_FN_ORDER_WINDOW_TU', '67:59', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window time (in hours) for fortnight case. For eg. 48 hours = 2 days window'),
    ('PDP_FN_ORDER_PLACEMENT_END_TIME_TU', '-4:01', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window end time in 24-hour format. For eg. -4:01 is 07:59 PM before midnight of the PDP day and 11 is 11:00 AM on the PDP day'),
    ('PDP_FN_ORDER_WINDOW_WE', '43:59', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window time (in hours) for fortnight case. For eg. 48 hours = 2 days window'),
    ('PDP_FN_ORDER_PLACEMENT_END_TIME_WE', '-4:01', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window end time in 24-hour format. For eg. -4:01 is 07:59 PM before midnight of the PDP day and 11 is 11:00 AM on the PDP day'),
    ('PDP_FN_ORDER_WINDOW_TH', '43:59', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window time (in hours) for fortnight case. For eg. 48 hours = 2 days window'),
    ('PDP_FN_ORDER_PLACEMENT_END_TIME_TH', '-4:01', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window end time in 24-hour format. For eg. -4:01 is 07:59 PM before midnight of the PDP day and 11 is 11:00 AM on the PDP day'),
    ('PDP_FN_ORDER_WINDOW_FR', '43:59', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window time (in hours) for fortnight case. For eg. 48 hours = 2 days window'),
    ('PDP_FN_ORDER_PLACEMENT_END_TIME_FR', '-4:01', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window end time in 24-hour format. For eg. -4:01 is 07:59 PM before midnight of the PDP day and 11 is 11:00 AM on the PDP day'),
    ('PDP_FN_ORDER_WINDOW_SA', '43:59', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window time (in hours) for fortnight case. For eg. 48 hours = 2 days window'),
    ('PDP_FN_ORDER_PLACEMENT_END_TIME_SA', '-4:01', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window end time in 24-hour format. For eg. -4:01 is 07:59 PM before midnight of the PDP day and 11 is 11:00 AM on the PDP day'),
    ('PDP_FN_ORDER_WINDOW_SU', '43:59', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window time (in hours) for fortnight case. For eg. 48 hours = 2 days window'),
    ('PDP_FN_ORDER_PLACEMENT_END_TIME_SU', '-4:01', 'PORTAL_MANAGED', 'TEXT', 'To set the PDP order placement window end time in 24-hour format. For eg. -4:01 is 07:59 PM before midnight of the PDP day and 11 is 11:00 AM on the PDP day')
	ON  CONFLICT DO NOTHING;
`
    );
};

exports.down = pgm => {};
