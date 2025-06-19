/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    drop table if exists ars_tolerance;
    create table if not exists ars_tolerance(
        id bigserial primary key,
        area_code varchar(6) not null,
        customer_group_id integer not null references customer_group_master(id),
        class_a_max numeric not null default 30,
        class_a_min numeric not null default -30,
        class_b_max numeric not null default 50,
        class_b_min numeric not null default -50,
        class_c_max numeric not null default 50,
        class_c_min numeric not null default -50,
        updated_by varchar(50) default 'PORTAL_MANAGED',
        updated_on timestamp with time zone default current_timestamp,
        remarks text,
        deleted boolean default false,
        constraint area_customer_uk unique ( area_code, customer_group_id)
        );

    delete from app_level_settings where "key" in (
        'AO_METRO_TOLERANCE_MAX_N1',
        'AO_METRO_TOLERANCE_MAX_N2',
        'AO_METRO_TOLERANCE_MAX_S1',
        'AO_METRO_TOLERANCE_MAX_S2',
        'AO_METRO_TOLERANCE_MAX_S3',
        'AO_METRO_TOLERANCE_MAX_E1',
        'AO_METRO_TOLERANCE_MAX_E2',
        'AO_METRO_TOLERANCE_MAX_W1',
        'AO_METRO_TOLERANCE_MAX_W2',
        'AO_METRO_TOLERANCE_MAX_C1',
        'AO_METRO_TOLERANCE_MAX_C2',
        'AO_METRO_TOLERANCE_MIN_N1',
        'AO_METRO_TOLERANCE_MIN_N2',
        'AO_METRO_TOLERANCE_MIN_S1',
        'AO_METRO_TOLERANCE_MIN_S2',
        'AO_METRO_TOLERANCE_MIN_S3',
        'AO_METRO_TOLERANCE_MIN_E1',
        'AO_METRO_TOLERANCE_MIN_E2',
        'AO_METRO_TOLERANCE_MIN_W1',
        'AO_METRO_TOLERANCE_MIN_W2',
        'AO_METRO_TOLERANCE_MIN_C1',
        'AO_METRO_TOLERANCE_MIN_C2',
        'AO_NON_METRO_TOLERANCE_MAX_N1',
        'AO_NON_METRO_TOLERANCE_MAX_N2',
        'AO_NON_METRO_TOLERANCE_MAX_S1',
        'AO_NON_METRO_TOLERANCE_MAX_S2',
        'AO_NON_METRO_TOLERANCE_MAX_S3',
        'AO_NON_METRO_TOLERANCE_MAX_E1',
        'AO_NON_METRO_TOLERANCE_MAX_E2',
        'AO_NON_METRO_TOLERANCE_MAX_W1',
        'AO_NON_METRO_TOLERANCE_MAX_W2',
        'AO_NON_METRO_TOLERANCE_MAX_C1',
        'AO_NON_METRO_TOLERANCE_MAX_C2',
        'AO_NON_METRO_TOLERANCE_MIN_N1',
        'AO_NON_METRO_TOLERANCE_MIN_N2',
        'AO_NON_METRO_TOLERANCE_MIN_S1',
        'AO_NON_METRO_TOLERANCE_MIN_S2',
        'AO_NON_METRO_TOLERANCE_MIN_S3',
        'AO_NON_METRO_TOLERANCE_MIN_E1',
        'AO_NON_METRO_TOLERANCE_MIN_E2',
        'AO_NON_METRO_TOLERANCE_MIN_W1',
        'AO_NON_METRO_TOLERANCE_MIN_W2',
        'AO_NON_METRO_TOLERANCE_MIN_C1',
        'AO_NON_METRO_TOLERANCE_MIN_C2'
    );
    `);
};

exports.down = pgm => {
    pgm.sql(`
    drop table if exists ars_tolerance;
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
    ON  CONFLICT DO NOTHING;`);
};
