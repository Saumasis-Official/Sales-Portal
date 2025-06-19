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
    pgm.sql(`
        INSERT INTO app_level_settings (key,value,updated_by,field_type,description)
        VALUES ('RO_LOCK_ARS_WINDOW','0','PORTAL_MANAGED','TEXT','To lock Rush Order requests for distributors if no ARS order is placed within X days window.')
        ON  CONFLICT DO NOTHING;
       `)
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {};
