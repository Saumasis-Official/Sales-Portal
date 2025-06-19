/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    pgm.sql(
        `INSERT INTO app_level_settings(
	key, value, updated_by, field_type, description)
	VALUES 
    ('ENABLE_PLANTS_FOR_DELIVERY_CODE', '', 'PORTAL_MANAGED', 'SET', 'To enable/disable Plants for Delivery Pilot')
    ON  CONFLICT DO NOTHING;`,
    );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {};






